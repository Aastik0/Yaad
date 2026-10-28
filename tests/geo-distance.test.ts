import test from "node:test";
import assert from "node:assert/strict";
import { calculateDistanceMeters, simulateCoordinateOffset } from "../src/lib/geo.ts";

test("Geo: Haversine distance calculation is accurate", () => {
  // San Francisco: Union Square (37.7879, -122.4074) to Market St (37.7885, -122.4074)
  const dist = calculateDistanceMeters(37.7879, -122.4074, 37.7885, -122.4074);
  // ~67 meters
  assert.ok(dist >= 60 && dist <= 75, `Expected ~67m, got ${dist}m`);
});

test("Geo: Coordinate offset simulation produces expected radius breach", () => {
  const baseLat = 37.7749;
  const baseLon = -122.4194;

  // Offset by 75 meters
  const offset = simulateCoordinateOffset(baseLat, baseLon, 75);
  const calculatedDist = calculateDistanceMeters(baseLat, baseLon, offset.latitude, offset.longitude);

  assert.ok(calculatedDist >= 70 && calculatedDist <= 80, `Expected ~75m, got ${calculatedDist}m`);

  // Verify breach against 50m radius threshold
  const threshold = 50;
  assert.equal(calculatedDist > threshold, true, "Simulated offset should breach 50m threshold");
});

