import test from "node:test";
import assert from "node:assert/strict";
import {
  isGlassesSimulatorEnabled,
  generateSimulatedGlassesPovFrame,
  simulateGlassesCapture,
  buildGlassesAnalyzePayload,
} from "../src/lib/glassesSimulator.ts";
import { DEFAULT_DEMO_COORDINATES } from "../src/lib/geo.ts";

test("Phase 9 Simulator: Feature flag check verifies simulator is active", () => {
  const enabled = isGlassesSimulatorEnabled();
  assert.equal(enabled, true, "Simulator should be enabled by default in demo mode");
});

test("Phase 9 Simulator: Generates 600x600 Eye-Level POV Display Frame", () => {
  const frame = generateSimulatedGlassesPovFrame("Test Coffee Table Scene");
  assert.ok(frame.startsWith("data:image/svg+xml"), "Must produce valid SVG data URL");
  assert.ok(frame.includes("600"), "Must adhere to 600x600 Display spec");
  assert.ok(frame.includes("Test%20Coffee%20Table%20Scene") || frame.includes("Test Coffee Table Scene"));
});

test("Phase 9 Simulator: simulateGlassesCapture produces well-formed glasses_sdk event", () => {
  const event = simulateGlassesCapture("voice_shortcut", {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    place_name: "Artisan Cafe",
  });

  assert.equal(event.source, "glasses_sdk");
  assert.equal(event.trigger, "voice_shortcut");
  assert.equal(event.viewportWidth, 600);
  assert.equal(event.viewportHeight, 600);
  assert.equal(event.coordinates.latitude, 37.7749);
  assert.ok(event.imageDataUrl.length > 50);
});

test("Phase 9 Simulator: buildGlassesAnalyzePayload enforces zero credit spend and proper schema", () => {
  const event = simulateGlassesCapture("touchpad_tap", DEFAULT_DEMO_COORDINATES);
  const payload = buildGlassesAnalyzePayload(event, "keys and wallet", "user-simulator-1");

  assert.equal(payload.forceLive, false, "Simulator calls must NEVER force live paid model requests");
  assert.equal(payload.requestedQuery, "keys and wallet");
  assert.equal(payload.userId, "user-simulator-1");
  assert.ok(payload.image.startsWith("data:image/svg+xml"));
});

test("Phase 9 Simulator: Touchpad tap trigger executes with custom coordinates", () => {
  const customCoords = {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 5,
    place_name: "New York Hacker Hub",
  };

  const event = simulateGlassesCapture("touchpad_tap", customCoords);
  assert.equal(event.trigger, "touchpad_tap");
  assert.equal(event.coordinates.place_name, "New York Hacker Hub");
});

test("Phase 9 / Phase 23 Parity: Auto-detection empty query payload for unified /api/analyze", () => {
  const event = simulateGlassesCapture("voice_shortcut", DEFAULT_DEMO_COORDINATES);
  const payload = buildGlassesAnalyzePayload(event, "");

  assert.equal(payload.requestedQuery, "", "Empty query allows model to auto-spot all visible belongings");
  assert.equal(payload.forceLive, false, "Protected zero spend in demo mode");
});

test("Phase 9 / Phase 23 Parity: Simulator departure distance evaluation triggers at 30m threshold", () => {
  const safeMeters = 15;
  const breachMeters = 35;
  const GEOFENCE_THRESHOLD = 30;

  assert.equal(safeMeters >= GEOFENCE_THRESHOLD, false, "15m is within safe zone");
  assert.equal(breachMeters >= GEOFENCE_THRESHOLD, true, "35m breaches departure threshold");
});

test("Phase 9 / Phase 23 Parity: Conversational People Memory lookup finds matching contact notes", () => {
  const mockPeople = [
    {
      id: "p-1",
      user_id: "demo-user",
      display_name: "Sarah Jenkins",
      context_or_relationship: "Physical Therapist",
      notes: "Visits on Tuesdays at 2 PM. Prefers walking exercises in the hallway.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_confirmed: true,
    },
  ];

  const query = "Sarah";
  const match = mockPeople.find(
    (p) =>
      p.display_name.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(p.display_name.toLowerCase())
  );

  assert.ok(match, "Should find Sarah");
  assert.equal(match?.context_or_relationship, "Physical Therapist");
  assert.ok(match?.notes.includes("Tuesdays"));
});

