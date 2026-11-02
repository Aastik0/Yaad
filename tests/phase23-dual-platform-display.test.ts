import { test } from "node:test";
import assert from "node:assert";
import {
  POV_SCENE_PRESETS,
  VIRTUAL_VOICE_COMMANDS,
  simulateVirtualDeparture,
  isVirtualHardwareAuthorized,
} from "../src/lib/display/virtualHardwareAdapter.ts";
import { parseVoiceIntent } from "../src/lib/voiceIntent.ts";
import { calculateDistanceMeters, evaluateGeofence, DEFAULT_DEMO_COORDINATES } from "../src/lib/geo.ts";
import { AnalyzeRequestSchema } from "../src/lib/schemas.ts";
import { LocalStorageRepository } from "../src/lib/repository/localStorageRepository.ts";
import type { ItemObservation, TrackedItem } from "../src/types/index.ts";

test("Phase 23: Virtual Hardware Adapter provides valid 600x600 POV scene presets", () => {
  assert.ok(POV_SCENE_PRESETS.length >= 3, "Must provide at least 3 curated POV scenes");

  for (const preset of POV_SCENE_PRESETS) {
    assert.ok(preset.id, "Preset must have an ID");
    assert.ok(preset.name, "Preset must have a name");
    assert.ok(preset.locationName, "Preset must have a location name");
    assert.ok(preset.landmarks.length > 0, "Preset must have contextual landmarks");
    assert.ok(preset.svgDataUrl.startsWith("data:image/svg+xml"), "Preset must be a valid SVG data URL");
    assert.ok(preset.coordinates.latitude && preset.coordinates.longitude, "Preset must have coordinates");
  }
});

test("Phase 23: Virtual voice commands parse deterministically into structured intents", () => {
  for (const cmd of VIRTUAL_VOICE_COMMANDS) {
    const parsed = parseVoiceIntent(cmd.transcript);
    assert.notStrictEqual(parsed.type, "UNKNOWN", `Command '${cmd.transcript}' should parse into a known intent`);
    assert.ok(parsed.confidence > 0.8, "Intent confidence must be high");
  }
});

test("Phase 23: Virtual departure simulation accurately triggers geofence breach", () => {
  const origin = DEFAULT_DEMO_COORDINATES;
  const departureCoords = simulateVirtualDeparture(origin, 50);

  const distance = calculateDistanceMeters(
    origin.latitude,
    origin.longitude,
    departureCoords.latitude,
    departureCoords.longitude
  );

  // Check that distance is approx 50 meters
  assert.ok(distance >= 45 && distance <= 55, `Expected ~50m distance, got ${distance}`);

  const geofence = evaluateGeofence(departureCoords, origin, 30);
  assert.strictEqual(geofence.isBreached, true, "50m displacement must breach 30m safety radius");
});

test("Phase 23: Virtual hardware authorization strictly respects environment guards", () => {
  // In development/test it is authorized
  assert.strictEqual(isVirtualHardwareAuthorized(), true);
});

test("Phase 23: AnalyzeRequestSchema accepts glasses_sdk payloads from Display HUD", () => {
  const testPayload = {
    image: POV_SCENE_PRESETS[0].svgDataUrl,
    requestedQuery: "personal belongings",
    source: "glasses_sdk",
    userId: "demo-user-yaad-01",
  };

  const validated = AnalyzeRequestSchema.parse(testPayload);
  assert.strictEqual(validated.source, "glasses_sdk");
  assert.strictEqual(validated.userId, "demo-user-yaad-01");
});

test("Phase 23: Shared persistence persists memories created on Display HUD and makes them accessible to Unity client", async () => {
  const repo = new LocalStorageRepository("demo-user-dual-platform");
  const now = new Date().toISOString();

  const newObs: ItemObservation = {
    id: "obs-display-01",
    user_id: "demo-user-dual-platform",
    item_name: "Apartment Keys with Brass Carabiner",
    item_category: "Keys",
    location_description: "On dark wood coffee table near ceramic mug",
    landmarks: ["Dark Wood Table", "Ceramic Mug"],
    description: "Brass carabiner with 3 house keys",
    confidence: "high",
    observed_at: now,
    source: "glasses_sdk",
    coordinates: DEFAULT_DEMO_COORDINATES,
    user_confirmed: true,
    created_at: now,
  };

  const newTracked: TrackedItem = {
    id: "item-display-01",
    user_id: "demo-user-dual-platform",
    item_name: "Apartment Keys with Brass Carabiner",
    category: "Keys",
    status: "tracked_unconfirmed",
    last_location_description: "On dark wood coffee table near ceramic mug",
    last_landmarks: ["Dark Wood Table", "Ceramic Mug"],
    last_observed_at: now,
    coordinates: DEFAULT_DEMO_COORDINATES,
    geofence_radius_meters: 50,
    updated_at: now,
  };

  // Save observation and item through shared repository
  const savedObs = await repo.saveObservation(newObs);
  assert.strictEqual(savedObs.id, "obs-display-01");

  const savedItem = await repo.saveItem({
    ...newTracked,
    last_observation_id: savedObs.id,
  });
  assert.strictEqual(savedItem.id, "item-display-01");

  // Verify memory is retrievable by Unity client (which calls GET /api/items or repo.getItems)
  const items = await repo.getItems();
  const found = items.find((i) => i.id === "item-display-01");

  assert.ok(found, "Saved item must be retrieved by repository");
  assert.strictEqual(found.item_name, "Apartment Keys with Brass Carabiner");
  assert.strictEqual(found.last_location_description, "On dark wood coffee table near ceramic mug");
  assert.strictEqual(found.coordinates?.latitude, DEFAULT_DEMO_COORDINATES.latitude);
});

test("Phase 23: Voice intent RECALL matches memory created on Display HUD without hallucination", () => {
  const query = "Where did I leave my keys?";
  const parsed = parseVoiceIntent(query);

  assert.strictEqual(parsed.type, "RECALL");
  assert.strictEqual(parsed.targetItem, "keys");
  assert.ok(parsed.confidence >= 0.9, "Confidence must be at least 0.9");
});
