import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDistanceMeters,
  simulateCoordinateOffset,
  isReadingAccurate,
  evaluateGeofence,
  formatTruthfulDepartureAlert,
  requestNotificationPermission,
  sendDepartureNotification,
  DEFAULT_ACCURACY_THRESHOLD_METERS,
  DEFAULT_GEOFENCE_RADIUS_METERS,
  DEFAULT_JITTER_BUFFER_COUNT,
} from "../src/lib/geo.ts";
import type { TrackedItem, GeoLocationCoordinates } from "../src/types/index.ts";

test("Phase 21D Geo: Haversine distance calculation is accurate across known coordinates", () => {
  // Distance between San Francisco City Hall (37.7793, -122.4193) and Ferry Building (37.7955, -122.3937) ~ 2850m
  const dist = calculateDistanceMeters(37.7793, -122.4193, 37.7955, -122.3937);
  assert.ok(dist >= 2800 && dist <= 2950, `Expected distance ~2850m, got ${dist}`);

  // Same coordinates = 0 meters
  assert.equal(calculateDistanceMeters(37.7749, -122.4194, 37.7749, -122.4194), 0);
});

test("Phase 21D Geo: simulateCoordinateOffset produces expected meter displacements", () => {
  const baseLat = 37.7749;
  const baseLon = -122.4194;

  const offset50 = simulateCoordinateOffset(baseLat, baseLon, 50);
  const measuredDist50 = calculateDistanceMeters(baseLat, baseLon, offset50.latitude, offset50.longitude);
  assert.ok(measuredDist50 >= 45 && measuredDist50 <= 55, `Expected ~50m, got ${measuredDist50}`);

  const offset100 = simulateCoordinateOffset(baseLat, baseLon, 100);
  const measuredDist100 = calculateDistanceMeters(baseLat, baseLon, offset100.latitude, offset100.longitude);
  assert.ok(measuredDist100 >= 95 && measuredDist100 <= 105, `Expected ~100m, got ${measuredDist100}`);
});

test("Phase 21D Geo: isReadingAccurate accepts reliable readings and rejects low accuracy / invalid readings", () => {
  // Good GPS readings
  assert.equal(isReadingAccurate(5, DEFAULT_ACCURACY_THRESHOLD_METERS), true);
  assert.equal(isReadingAccurate(15, DEFAULT_ACCURACY_THRESHOLD_METERS), true);
  assert.equal(isReadingAccurate(65, DEFAULT_ACCURACY_THRESHOLD_METERS), true);

  // Inaccurate GPS readings exceeding threshold (e.g. cellular tower estimate)
  assert.equal(isReadingAccurate(70, DEFAULT_ACCURACY_THRESHOLD_METERS), false);
  assert.equal(isReadingAccurate(150, DEFAULT_ACCURACY_THRESHOLD_METERS), false);
  assert.equal(isReadingAccurate(800, DEFAULT_ACCURACY_THRESHOLD_METERS), false);

  // Invalid or missing accuracy
  assert.equal(isReadingAccurate(0), false);
  assert.equal(isReadingAccurate(-5), false);
  assert.equal(isReadingAccurate(undefined), false);
  assert.equal(isReadingAccurate(NaN), false);
});

test("Phase 21D Geo: evaluateGeofence accurately classifies within-radius vs breached status", () => {
  const itemCoords: GeoLocationCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    place_name: "Community Cafe",
  };

  // User is 15 meters away -> within 50m radius
  const nearCoords: GeoLocationCoordinates = {
    ...simulateCoordinateOffset(itemCoords.latitude, itemCoords.longitude, 15),
    accuracy: 12,
  };
  const evalNear = evaluateGeofence(nearCoords, itemCoords, 50);
  assert.equal(evalNear.isBreached, false);
  assert.equal(evalNear.isAccurate, true);
  assert.ok(evalNear.distanceMeters <= 50);

  // User is 80 meters away -> breached
  const farCoords: GeoLocationCoordinates = {
    ...simulateCoordinateOffset(itemCoords.latitude, itemCoords.longitude, 80),
    accuracy: 15,
  };
  const evalFar = evaluateGeofence(farCoords, itemCoords, 50);
  assert.equal(evalFar.isBreached, true);
  assert.equal(evalFar.isAccurate, true);
  assert.ok(evalFar.distanceMeters > 50);

  // User is 80 meters away but GPS accuracy is terrible (±120m) -> flagged inaccurate
  const noisyCoords: GeoLocationCoordinates = {
    ...simulateCoordinateOffset(itemCoords.latitude, itemCoords.longitude, 80),
    accuracy: 120,
  };
  const evalNoisy = evaluateGeofence(noisyCoords, itemCoords, 50, DEFAULT_ACCURACY_THRESHOLD_METERS);
  assert.equal(evalNoisy.isAccurate, false);
});

test("Phase 21D Geo: Jitter filter simulation requires multiple consecutive breaches before alert", () => {
  const itemCoords: GeoLocationCoordinates = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
  };

  const jitterThreshold = DEFAULT_JITTER_BUFFER_COUNT; // 2 readings
  let consecutiveCount = 0;
  let alertFired = false;

  const simulateReading = (distanceMeters: number) => {
    const coords = {
      ...simulateCoordinateOffset(itemCoords.latitude, itemCoords.longitude, distanceMeters),
      accuracy: 15,
    };
    const evalResult = evaluateGeofence(coords, itemCoords, DEFAULT_GEOFENCE_RADIUS_METERS);
    if (evalResult.isAccurate && evalResult.isBreached) {
      consecutiveCount++;
      if (consecutiveCount >= jitterThreshold) {
        alertFired = true;
      }
    } else {
      consecutiveCount = 0;
      alertFired = false;
    }
  };

  // Reading 1: 75m (breach 1) -> alert should NOT fire yet (anti-jitter)
  simulateReading(75);
  assert.equal(consecutiveCount, 1);
  assert.equal(alertFired, false, "Alert should not fire after only 1 breach reading");

  // Reading 2: 80m (breach 2) -> alert should fire now!
  simulateReading(80);
  assert.equal(consecutiveCount, 2);
  assert.equal(alertFired, true, "Alert should fire on second consecutive breach reading");

  // Reading 3: user steps back inside to 20m -> buffer resets!
  simulateReading(20);
  assert.equal(consecutiveCount, 0);
  assert.equal(alertFired, false, "Breach count and alert must reset when user re-enters geofence");
});

test("Phase 21D Geo: formatTruthfulDepartureAlert adheres strictly to truthful phrasing", () => {
  const mockItem: TrackedItem = {
    id: "item-test-1",
    user_id: "demo-user",
    item_name: "car keys",
    status: "tracked_unconfirmed",
    last_location_description: "Desk in Study",
    last_landmarks: ["wooden desk", "desk lamp"],
    last_observed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const alert = formatTruthfulDepartureAlert(mockItem, 75);

  // Must use truthful non-hallucinatory phrasing
  assert.ok(alert.headline.includes("may still be at Desk in Study"));
  assert.ok(alert.message.includes("approximately 75m away"));
  assert.ok(alert.speechText.includes("approximately 75 meters away"));
  assert.ok(alert.speechText.includes("last recorded at Desk in Study"));
  // Must NOT claim absolute present knowledge
  assert.ok(!alert.headline.includes("definitely is"));
  assert.ok(!alert.headline.includes("is currently at"));
});

test("Phase 21D Geo: Notification helpers operate safely in headless/SSR environments", async () => {
  // In Node.js headless runtime without browser window, helpers should return safe fallbacks without throwing
  const perm = await requestNotificationPermission();
  assert.equal(perm, "denied");

  const sent = sendDepartureNotification("Test headline", "Test message");
  assert.equal(sent, false);
});

