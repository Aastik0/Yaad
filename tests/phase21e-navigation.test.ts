import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateGoogleMapsUrl,
  generateAppleMapsUrl,
  generateCrossPlatformMapUrl,
  isValidGeoCoordinates,
  resolveItemNavigationStatus,
} from "../src/lib/geo.ts";
import { parseVoiceIntent } from "../src/lib/voiceIntent.ts";
import type { TrackedItem } from "../src/types/index.ts";

test("Phase 21E Navigation: generateGoogleMapsUrl builds compliant external directions URLs", () => {
  const url = generateGoogleMapsUrl(37.7749, -122.4194, "Apartment Keys");
  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"), "Must use Google Maps universal directions URL");
  assert.ok(url.includes("destination=37.7749%2C-122.4194"), "Must encode destination coordinates properly");
  assert.ok(url.includes("travelmode=walking"), "Must default to walking directions for local belongings");
  assert.ok(url.includes("destination_name=Apartment+Keys"), "Must include item label for display");
});

test("Phase 21E Navigation: generateAppleMapsUrl builds compliant Apple Maps deep links", () => {
  const url = generateAppleMapsUrl(37.7749, -122.4194, "Leather Wallet");
  assert.ok(url.startsWith("https://maps.apple.com/"), "Must use standard Apple Maps URL");
  assert.ok(url.includes("daddr=37.7749%2C-122.4194"), "Must encode destination address coordinates");
  assert.ok(url.includes("dirflg=w"), "Must specify walking mode");
  assert.ok(url.includes("q=Leather+Wallet"), "Must specify search label");
});

test("Phase 21E Navigation: resolveItemNavigationStatus resolves HAS_COORDINATES when valid GPS is present", () => {
  const mockItem: TrackedItem = {
    id: "item-nav-1",
    user_id: "demo-user",
    item_name: "Apartment Keys",
    status: "tracked_unconfirmed",
    last_location_description: "On coffee table beside ceramic mug",
    last_landmarks: ["coffee table", "ceramic mug"],
    last_observed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    coordinates: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 8,
      place_name: "Community Cafe",
    },
    updated_at: new Date().toISOString(),
  };

  const res = resolveItemNavigationStatus(mockItem, "keys");
  assert.equal(res.type, "HAS_COORDINATES");
  assert.ok(res.googleMapsUrl !== null);
  assert.ok(res.appleMapsUrl !== null);
  assert.ok(res.googleMapsUrl.includes("37.7749%2C-122.4194"));
  assert.ok(res.appleMapsUrl.includes("37.7749%2C-122.4194"));
  assert.equal(res.coordinates?.latitude, 37.7749);
  assert.equal(res.coordinates?.longitude, -122.4194);
  assert.ok(res.disclaimer.includes("last observed"), "Disclaimer must emphasize historical sighting");
});

test("Phase 21E Navigation: resolveItemNavigationStatus resolves LANDMARK_ONLY when coordinates are missing", () => {
  const mockItem: TrackedItem = {
    id: "item-nav-2",
    user_id: "demo-user",
    item_name: "Reading Glasses",
    status: "possibly_left_behind",
    last_location_description: "Study desk beside laptop charger",
    last_landmarks: ["study desk", "laptop charger"],
    last_observed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    // No coordinates attached
    updated_at: new Date().toISOString(),
  };

  const res = resolveItemNavigationStatus(mockItem, "glasses");
  assert.equal(res.type, "LANDMARK_ONLY");
  assert.equal(res.googleMapsUrl, null);
  assert.equal(res.appleMapsUrl, null);
  assert.equal(res.coordinates, null);
  assert.ok(res.landmarks.includes("study desk"));
  assert.ok(res.locationDescription.includes("Study desk"));
  assert.ok(res.disclaimer.includes("GPS coordinates were not recorded"), "Must clarify that outdoor GPS was not captured");
});

test("Phase 21E Navigation: resolveItemNavigationStatus safely handles corrupted or out-of-range coordinates", () => {
  const mockItem: TrackedItem = {
    id: "item-nav-3",
    user_id: "demo-user",
    item_name: "Backpack",
    status: "tracked_unconfirmed",
    last_location_description: "Living room sofa",
    last_landmarks: ["sofa"],
    last_observed_at: new Date().toISOString(),
    coordinates: {
      latitude: 999, // Impossible latitude
      longitude: -122.4194,
    },
    updated_at: new Date().toISOString(),
  };

  const res = resolveItemNavigationStatus(mockItem, "backpack");
  // Out of range coordinates must fall back to landmark only without throwing or creating broken map links
  assert.equal(res.type, "LANDMARK_ONLY");
  assert.equal(res.googleMapsUrl, null);
});

test("Phase 21E Navigation: resolveItemNavigationStatus handles NOT_FOUND query without hallucination", () => {
  const res = resolveItemNavigationStatus(null, "unknown gizmo");
  assert.equal(res.type, "NOT_FOUND");
  assert.equal(res.item, null);
  assert.equal(res.googleMapsUrl, null);
  assert.equal(res.appleMapsUrl, null);
  assert.ok(res.headline.includes('No historical sighting recorded for "unknown gizmo"'));
  assert.ok(res.disclaimer.includes("never fabricates"));
});

test("Phase 21E Navigation: Voice NAVIGATE intent extracts target item and maps cleanly", () => {
  const queries = [
    { speech: "Take me to my wallet", expected: "wallet" },
    { speech: "Navigate to my keys", expected: "keys" },
    { speech: "Directions to my backpack", expected: "backpack" },
    { speech: "Guide me to my bag", expected: "bag" },
    { speech: "How do I get to my glasses?", expected: "glasses" },
  ];

  for (const { speech, expected } of queries) {
    const parsed = parseVoiceIntent(speech);
    assert.equal(parsed.type, "NAVIGATE", `Expected NAVIGATE for speech: "${speech}"`);
    assert.equal(parsed.targetItem, expected, `Expected target item "${expected}" for speech: "${speech}"`);
  }
});

test("Phase 24D: isValidGeoCoordinates validates legitimate coordinates and rejects invalid / Null Island", () => {
  // Valid coordinates
  assert.equal(isValidGeoCoordinates({ latitude: 37.7749, longitude: -122.4194 }), true);
  assert.equal(isValidGeoCoordinates({ latitude: -33.8688, longitude: 151.2093 }), true);
  assert.equal(isValidGeoCoordinates({ latitude: 90, longitude: 180 }), true);
  assert.equal(isValidGeoCoordinates({ latitude: -90, longitude: -180 }), true);

  // Missing / undefined / null
  assert.equal(isValidGeoCoordinates(undefined), false);
  assert.equal(isValidGeoCoordinates(null), false);
  assert.equal(isValidGeoCoordinates({}), false);
  assert.equal(isValidGeoCoordinates({ latitude: 37.7749 }), false);
  assert.equal(isValidGeoCoordinates({ longitude: -122.4194 }), false);

  // NaN or non-number
  assert.equal(isValidGeoCoordinates({ latitude: NaN, longitude: -122.4194 }), false);
  assert.equal(isValidGeoCoordinates({ latitude: 37.7749, longitude: NaN }), false);

  // Out of range coordinates
  assert.equal(isValidGeoCoordinates({ latitude: 91, longitude: -122.4194 }), false);
  assert.equal(isValidGeoCoordinates({ latitude: -91, longitude: -122.4194 }), false);
  assert.equal(isValidGeoCoordinates({ latitude: 37.7749, longitude: 181 }), false);
  assert.equal(isValidGeoCoordinates({ latitude: 37.7749, longitude: -181 }), false);

  // Null Island (0, 0) rejection
  assert.equal(isValidGeoCoordinates({ latitude: 0, longitude: 0 }), false);
});

test("Phase 24D: generateCrossPlatformMapUrl selects Apple Maps for Apple User-Agents and Google Maps for others", () => {
  const macOSUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const iPhoneUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const androidUserAgent = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
  const windowsUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const appleMacUrl = generateCrossPlatformMapUrl(37.7749, -122.4194, "Apartment Keys", macOSUserAgent);
  assert.ok(appleMacUrl.startsWith("https://maps.apple.com/"), "macOS must receive Apple Maps scheme");
  assert.ok(appleMacUrl.includes("daddr=37.7749%2C-122.4194"));
  assert.ok(appleMacUrl.includes("q=Apartment+Keys"));

  const appleIosUrl = generateCrossPlatformMapUrl(37.7749, -122.4194, "Leather Wallet", iPhoneUserAgent);
  assert.ok(appleIosUrl.startsWith("https://maps.apple.com/"), "iPhone must receive Apple Maps scheme");

  const androidUrl = generateCrossPlatformMapUrl(37.7749, -122.4194, "Prescription Glasses", androidUserAgent);
  assert.ok(androidUrl.startsWith("https://www.google.com/maps/dir/?api=1"), "Android must receive Google Maps scheme");
  assert.ok(androidUrl.includes("destination=37.7749%2C-122.4194"));
  assert.ok(androidUrl.includes("destination_name=Prescription+Glasses"));

  const windowsUrl = generateCrossPlatformMapUrl(37.7749, -122.4194, "Work Backpack", windowsUserAgent);
  assert.ok(windowsUrl.startsWith("https://www.google.com/maps/dir/?api=1"), "Windows must receive Google Maps scheme");
});

test("Phase 24D: Grounded Recall Map Action preserves item's actual stored coordinates and hides on missing coordinates", () => {
  // Test case 1: Recall with legitimate stored coordinates
  const itemWithCoordinates: TrackedItem = {
    id: "item-stored-gps-1",
    user_id: "user-123",
    item_name: "Car Keys",
    status: "tracked_unconfirmed",
    last_location_description: "On foyer console table near entryway coat rack",
    last_landmarks: ["foyer console", "coat rack"],
    last_observed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    coordinates: {
      latitude: 37.7833,
      longitude: -122.4167,
      accuracy: 6,
      place_name: "Home Foyer",
    },
    updated_at: new Date().toISOString(),
  };

  assert.equal(isValidGeoCoordinates(itemWithCoordinates.coordinates), true);
  const recallMapUrl = generateCrossPlatformMapUrl(
    itemWithCoordinates.coordinates!.latitude,
    itemWithCoordinates.coordinates!.longitude,
    itemWithCoordinates.item_name,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  );
  // Verify it uses the item's EXACT stored coordinates, NOT current device location or simulator
  assert.ok(recallMapUrl.includes("37.7833%2C-122.4167"));
  assert.ok(recallMapUrl.includes("destination_name=Car+Keys"));

  // Test case 2: Recall with missing / undefined coordinates
  const itemWithoutCoordinates: TrackedItem = {
    id: "item-no-gps-2",
    user_id: "user-123",
    item_name: "Reading Glasses",
    status: "tracked_unconfirmed",
    last_location_description: "On bedside nightstand next to reading lamp",
    last_landmarks: ["bedside nightstand", "reading lamp"],
    last_observed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    coordinates: undefined,
    updated_at: new Date().toISOString(),
  };

  assert.equal(isValidGeoCoordinates(itemWithoutCoordinates.coordinates), false);

  // Test case 3: Recall with corrupted or Null Island (0,0) coordinates
  const itemWithCorruptedCoordinates: TrackedItem = {
    ...itemWithoutCoordinates,
    coordinates: { latitude: 0, longitude: 0 },
  };
  assert.equal(isValidGeoCoordinates(itemWithCorruptedCoordinates.coordinates), false);
});

