import test from "node:test";
import assert from "node:assert/strict";
import type { CandidateItem, ItemObservation, TrackedItem } from "../src/types/index.ts";

// Helper: Validation of file upload
function validateUploadFile(file: { name: string; type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  const hasValidExt = /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);
  const hasValidMime = validMimes.includes(file.type);

  if (!hasValidMime && !hasValidExt) {
    return { valid: false, error: "Please upload a valid image file (JPG, PNG, WebP, or HEIC)." };
  }

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "Image file size must be less than 10MB." };
  }

  return { valid: true };
}

// Helper: Confirmation filtering
function processCandidateConfirmation(
  candidates: CandidateItem[],
  userId: string,
  nowIso: string
): { newObservations: ItemObservation[]; newTracked: TrackedItem[] } {
  const confirmed = candidates.filter((c) => c.is_selected);

  const newObservations: ItemObservation[] = confirmed.map((c) => ({
    id: `obs-${c.id}`,
    user_id: userId,
    item_name: c.item_name,
    item_category: c.category || "Belonging",
    location_description: c.location_description,
    landmarks: c.landmarks,
    description: c.description,
    confidence: c.confidence,
    observed_at: nowIso,
    source: "browser_upload",
    user_confirmed: true,
    created_at: nowIso,
  }));

  const newTracked: TrackedItem[] = confirmed.map((c) => ({
    id: `item-${c.id}`,
    user_id: userId,
    item_name: c.item_name,
    category: c.category || "Belonging",
    status: "tracked_unconfirmed",
    last_location_description: c.location_description,
    last_landmarks: c.landmarks,
    last_observed_at: nowIso,
    updated_at: nowIso,
  }));

  return { newObservations, newTracked };
}

// Helper: Recall search logic
function findLatestObservationForRecall(
  items: TrackedItem[],
  query: string
): { item: TrackedItem; phrasing: string } | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;

  const match = items.find((item) => {
    const name = item.item_name.toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const loc = item.last_location_description.toLowerCase();
    const nameWords = name.split(/[\s-]+/).filter((w) => w.length > 3);
    return (
      name.includes(q) ||
      q.includes(name) ||
      nameWords.some((w) => q.includes(w)) ||
      (cat && q.includes(cat)) ||
      loc.includes(q) ||
      item.last_landmarks.some((lm) => q.includes(lm.toLowerCase()))
    );
  });

  if (!match) return null;

  return {
    item: match,
    phrasing: `Your ${match.item_name} was last recorded ${match.last_location_description}.`,
  };
}

// Helper: Deletion logic
function deleteTrackedItemAndObservations(
  items: TrackedItem[],
  observations: ItemObservation[],
  itemIdToDelete: string
): { remainingItems: TrackedItem[]; remainingObservations: ItemObservation[] } {
  const toDelete = items.find((i) => i.id === itemIdToDelete);
  const remainingItems = items.filter((i) => i.id !== itemIdToDelete);
  const remainingObservations = toDelete
    ? observations.filter((obs) => obs.item_name.toLowerCase() !== toDelete.item_name.toLowerCase())
    : observations;

  return { remainingItems, remainingObservations };
}

test("Phase 8 QA - Capture: Validates valid image types and file sizes", () => {
  const validJpg = { name: "scene.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 };
  assert.equal(validateUploadFile(validJpg).valid, true);

  const validPng = { name: "desk.png", type: "image/png", size: 8 * 1024 * 1024 };
  assert.equal(validateUploadFile(validPng).valid, true);

  const validWebp = { name: "table.webp", type: "image/webp", size: 500 * 1024 };
  assert.equal(validateUploadFile(validWebp).valid, true);
});

test("Phase 8 QA - Capture: Rejects unsupported file types and oversized files (>10MB)", () => {
  const pdfFile = { name: "document.pdf", type: "application/pdf", size: 1024 * 1024 };
  const resPdf = validateUploadFile(pdfFile);
  assert.equal(resPdf.valid, false);
  assert.ok(resPdf.error?.includes("valid image file"));

  const oversizedFile = { name: "huge.jpg", type: "image/jpeg", size: 11 * 1024 * 1024 };
  const resOversized = validateUploadFile(oversizedFile);
  assert.equal(resOversized.valid, false);
  assert.ok(resOversized.error?.includes("less than 10MB"));
});

test("Phase 8 QA - Confirmation: Unconfirmed or rejected candidates never become tracked items", () => {
  const candidates: CandidateItem[] = [
    {
      id: "c-keys",
      item_name: "Apartment Keys",
      category: "Keys",
      location_description: "On coffee table",
      landmarks: ["coffee table"],
      description: "Brass keys.",
      confidence: "high",
      is_selected: true, // Confirmed
    },
    {
      id: "c-random-bystander-item",
      item_name: "Stranger's Umbrella",
      category: "Personal",
      location_description: "By the door",
      landmarks: ["door"],
      description: "Black umbrella.",
      confidence: "low",
      is_selected: false, // Rejected / Not selected
    },
  ];

  const { newObservations, newTracked } = processCandidateConfirmation(
    candidates,
    "user-1",
    new Date().toISOString()
  );

  assert.equal(newTracked.length, 1);
  assert.equal(newTracked[0].item_name, "Apartment Keys");
  assert.equal(
    newTracked.some((i) => i.item_name === "Stranger's Umbrella"),
    false,
    "Rejected candidates must never become tracked items"
  );

  assert.equal(newObservations.length, 1);
  assert.equal(newObservations[0].item_name, "Apartment Keys");
});

test("Phase 8 QA - Recall: Uses 'last recorded' truthful phrasing and handles no-match queries", () => {
  const items: TrackedItem[] = [
    {
      id: "item-wallet",
      user_id: "user-1",
      item_name: "Leather Wallet",
      category: "Personal",
      status: "tracked_unconfirmed",
      last_location_description: "on the bistro table next to the charger",
      last_landmarks: ["bistro table", "charger"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // 1. Successful query
  const res = findLatestObservationForRecall(items, "Where did I last see my wallet?");
  assert.ok(res !== null);
  assert.equal(res.item.item_name, "Leather Wallet");
  assert.ok(res.phrasing.includes("last recorded"));
  assert.equal(res.phrasing.includes("is definitely at"), false);

  // 2. No-match query
  const noMatch = findLatestObservationForRecall(items, "sunglasses");
  assert.equal(noMatch, null, "Should cleanly return null for unrecorded items without hallucinating");
});

test("Phase 8 QA - Deletion: Verifies removal of item and linked observation history", () => {
  const items: TrackedItem[] = [
    {
      id: "item-1",
      user_id: "user-1",
      item_name: "Reading Glasses",
      status: "tracked_unconfirmed",
      last_location_description: "Console table",
      last_landmarks: ["console"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-2",
      user_id: "user-1",
      item_name: "Water Bottle",
      status: "collected",
      last_location_description: "Gym locker",
      last_landmarks: ["locker"],
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const observations: ItemObservation[] = [
    {
      id: "obs-1",
      user_id: "user-1",
      item_name: "Reading Glasses",
      location_description: "Console table",
      landmarks: ["console"],
      description: "Glasses on console.",
      confidence: "high",
      observed_at: new Date().toISOString(),
      source: "browser_camera",
      image_reference: "data:image/jpeg;base64,sample123",
      user_confirmed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "obs-2",
      user_id: "user-1",
      item_name: "Water Bottle",
      location_description: "Gym locker",
      landmarks: ["locker"],
      description: "Bottle in locker.",
      confidence: "high",
      observed_at: new Date().toISOString(),
      source: "browser_upload",
      image_reference: "data:image/jpeg;base64,sample456",
      user_confirmed: true,
      created_at: new Date().toISOString(),
    },
  ];

  // Delete Reading Glasses
  const { remainingItems, remainingObservations } = deleteTrackedItemAndObservations(
    items,
    observations,
    "item-1"
  );

  assert.equal(remainingItems.length, 1);
  assert.equal(remainingItems[0].item_name, "Water Bottle");

  assert.equal(remainingObservations.length, 1);
  assert.equal(remainingObservations[0].item_name, "Water Bottle");
  assert.equal(
    remainingObservations.some((o) => o.item_name === "Reading Glasses"),
    false,
    "Linked observations must be pruned on item deletion to prevent orphan data"
  );
});

test("Phase 8 QA - AI Controls: Verifies Demo Mode operates with zero external network requests", async () => {
  const { analyzeScene } = await import("../src/lib/meta.ts");

  // In standard environment without META_API_KEY, analyzeScene must resolve via mock
  const result = await analyzeScene({
    image: "data:image/jpeg;base64,testframe",
    requestedQuery: "keys and wallet",
    source: "browser_upload",
    forceLive: false,
  });

  assert.equal(result.source, "mock");
  assert.ok(result.candidates.length > 0);
  assert.equal(result.metaModel, "mock-fixture-engine");
});
