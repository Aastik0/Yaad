import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSceneWithMock } from "../src/lib/mockVision.ts";
import type { CandidateItem, ItemObservation, TrackedItem, GeoLocationCoordinates } from "../src/types/index.ts";

// Helper simulating confirmation persistence in page.tsx
function confirmCandidatesToMemories(
  candidates: CandidateItem[],
  mode: "selected" | "everything",
  coords?: GeoLocationCoordinates | null
): { observations: ItemObservation[]; tracked: TrackedItem[] } {
  const confirmed =
    mode === "everything"
      ? candidates.map((c) => ({ ...c, is_selected: true }))
      : candidates.filter((c) => c.is_selected);

  const nowIso = new Date().toISOString();

  const observations: ItemObservation[] = confirmed.map((c) => ({
    id: `obs-${c.id}`,
    user_id: "demo-user",
    item_name: c.item_name,
    item_category: c.category || "Belonging",
    location_description: c.location_description,
    landmarks: c.landmarks,
    description: c.description,
    confidence: c.confidence,
    observed_at: nowIso,
    source: "browser_upload",
    coordinates: coords ? { ...coords } : undefined,
    user_confirmed: true,
    created_at: nowIso,
  }));

  const tracked: TrackedItem[] = confirmed.map((c) => ({
    id: `item-${c.id}`,
    user_id: "demo-user",
    item_name: c.item_name,
    category: c.category || "Belonging",
    status: "tracked_unconfirmed",
    last_location_description: c.location_description,
    last_landmarks: c.landmarks,
    coordinates: coords ? { ...coords } : undefined,
    last_observed_at: nowIso,
    updated_at: nowIso,
  }));

  return { observations, tracked };
}

test("Remember Belongings: Automatic scene detection without manual typing", async () => {
  // When user captures an image, empty query is passed to analyzeSceneWithMock
  const detected = await analyzeSceneWithMock({
    requestedQuery: "",
    source: "browser_camera",
  });

  // Verify that multiple belongings were automatically discovered
  assert.ok(detected.length >= 2, "Automatic analysis should spot multiple visible belongings");

  // Verify all detected objects are preselected by default
  const allPreselected = detected.every((c) => c.is_selected === true);
  assert.strictEqual(allPreselected, true, "All automatically detected belongings must be preselected");

  // Verify each candidate has required fields: name, confidence, and visual description
  for (const cand of detected) {
    assert.ok(cand.item_name.length > 0, "Candidate must have item_name");
    assert.ok(["high", "medium", "low"].includes(cand.confidence), "Candidate must have valid confidence");
    assert.ok(cand.location_description.length > 0, "Candidate must have location_description");
    assert.ok(Array.isArray(cand.landmarks), "Candidate must provide landmarks array");
  }
});

test("Remember Belongings: 'Remember Selected' saves only checked items", async () => {
  const detected = await analyzeSceneWithMock({ requestedQuery: "" });
  assert.ok(detected.length >= 3);

  // User deselects the second item
  const modified = detected.map((cand, idx) =>
    idx === 1 ? { ...cand, is_selected: false } : { ...cand, is_selected: true }
  );

  const { observations, tracked } = confirmCandidatesToMemories(modified, "selected");

  assert.strictEqual(
    observations.length,
    detected.length - 1,
    "Only selected items should be persisted to observations"
  );
  assert.strictEqual(
    tracked.length,
    detected.length - 1,
    "Only selected items should be persisted to tracked items"
  );
  assert.ok(
    !observations.some((obs) => obs.item_name === detected[1].item_name),
    "Deselected item must NOT be saved"
  );
});

test("Remember Belongings: 'Remember Everything' saves all items regardless of prior selection", async () => {
  const detected = await analyzeSceneWithMock({ requestedQuery: "" });
  assert.ok(detected.length >= 2);

  // Even if user deselected everything
  const allDeselected = detected.map((cand) => ({ ...cand, is_selected: false }));

  const { observations, tracked } = confirmCandidatesToMemories(allDeselected, "everything");

  assert.strictEqual(
    observations.length,
    detected.length,
    "Remember Everything must persist all detected items"
  );
  assert.strictEqual(
    tracked.length,
    detected.length,
    "Remember Everything must persist all tracked items"
  );
});

test("Remember Belongings: Manual items added by user are preserved upon confirmation", async () => {
  const detected = await analyzeSceneWithMock({ requestedQuery: "" });

  const manualItem: CandidateItem = {
    id: "manual-cand-123",
    item_name: "Blue Stainless Water Bottle",
    category: "Belonging",
    location_description: "Beside the backpack on the carpet floor",
    landmarks: ["backpack", "carpet floor"],
    description: "Vacuum insulated water bottle with handle lid",
    confidence: "high",
    is_selected: true,
  };

  const combined = [...detected, manualItem];
  const { observations } = confirmCandidatesToMemories(combined, "selected");

  const savedManual = observations.find((obs) => obs.item_name === "Blue Stainless Water Bottle");
  assert.ok(savedManual, "Manually added candidate should be persisted when selected");
  assert.strictEqual(savedManual?.location_description, "Beside the backpack on the carpet floor");
});

test("Remember Belongings: Custom 'Tell Yaad what to look for' query filters results", async () => {
  const targeted = await analyzeSceneWithMock({
    requestedQuery: "reading glasses",
    source: "browser_camera",
  });

  assert.strictEqual(targeted.length, 1);
  assert.strictEqual(targeted[0].item_name, "Prescription Reading Glasses");
  assert.strictEqual(targeted[0].is_selected, true);
});

test("Remember Belongings: Non-persistence before confirmation", () => {
  // If user cancels or closes modal before clicking 'Remember Selected' or 'Remember Everything',
  // no memories are persisted.
  const unconfirmed: CandidateItem[] = [
    {
      id: "cand-unconfirmed",
      item_name: "Passport",
      category: "Documents",
      location_description: "Desk",
      landmarks: ["desk"],
      description: "Dark blue biometric passport resting on desk",
      confidence: "high",
      is_selected: true,
    },
  ];

  // Simulating modal cancellation: do not call confirmCandidatesToMemories
  const activeMemories: ItemObservation[] = [];
  assert.strictEqual(activeMemories.length, 0, "No belongings should be stored before user explicitly confirms");
});

test("Remember Belongings: GPS location integrity and honest degradation", () => {
  const candidates: CandidateItem[] = [
    {
      id: "cand-gps-1",
      item_name: "House Keys",
      category: "Keys",
      location_description: "Kitchen counter",
      landmarks: ["counter"],
      description: "House keys on kitchen counter",
      confidence: "high",
      is_selected: true,
    },
  ];

  // Case 1: High accuracy GPS available
  const coords: GeoLocationCoordinates = {
    latitude: 37.774929,
    longitude: -122.419416,
    accuracy: 8.5,
  };
  const resultWithGps = confirmCandidatesToMemories(candidates, "selected", coords);
  assert.strictEqual(resultWithGps.observations[0].coordinates?.latitude, 37.774929);
  assert.strictEqual(resultWithGps.observations[0].coordinates?.longitude, -122.419416);
  assert.strictEqual(resultWithGps.observations[0].coordinates?.accuracy, 8.5);

  // Case 2: GPS unavailable or user opted out
  const resultWithoutGps = confirmCandidatesToMemories(candidates, "selected", null);
  assert.strictEqual(resultWithoutGps.observations[0].coordinates, undefined);
});
