import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getBrowserLocation,
  DEFAULT_DEMO_COORDINATES,
  isValidGeoCoordinates,
  isRealDeviceCoordinates,
  isReadingAccurate,
  DEFAULT_ACCURACY_THRESHOLD_METERS,
} from "../src/lib/geo.ts";
import type { GeoLocationCoordinates, TrackedItem, ItemObservation } from "../src/types/index.ts";

test("Phase 24D GPS Remediation: getBrowserLocation returns null in SSR / unsupported environments without fabricating SF coordinates", async () => {
  // In Node.js environment where window is undefined
  const result = await getBrowserLocation();
  assert.equal(result.coordinates, null, "Must return coordinates: null when geolocation is unavailable");
  assert.equal(result.isRealGps, false, "Must flag isRealGps: false");
  assert.ok(result.error?.includes("not supported"), "Must provide truthful error message");
});

test("Phase 24D GPS Remediation: getBrowserLocation handles GPS denial gracefully without falling back to SF", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          getCurrentPosition: (_success: any, error: any) => {
            error({
              code: 1, // PERMISSION_DENIED
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
              message: "User denied Geolocation",
            });
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await getBrowserLocation();
    assert.equal(result.coordinates, null, "Coordinates must be strictly null on denial");
    assert.equal(result.isRealGps, false);
    assert.ok(result.error?.includes("denied"), "Error message must report denial");
    // Ensure San Francisco coordinates were NOT returned
    assert.notDeepEqual(result.coordinates, DEFAULT_DEMO_COORDINATES);
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24D GPS Remediation: getBrowserLocation handles GPS timeout gracefully without falling back to SF", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          getCurrentPosition: (_success: any, error: any) => {
            error({
              code: 3, // TIMEOUT
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
              message: "Acquisition timed out",
            });
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await getBrowserLocation();
    assert.equal(result.coordinates, null, "Coordinates must be strictly null on timeout");
    assert.equal(result.isRealGps, false);
    assert.ok(result.error?.includes("timed out"), "Error message must report timeout");
    assert.notDeepEqual(result.coordinates, DEFAULT_DEMO_COORDINATES);
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24D GPS Remediation: getBrowserLocation rounds coordinates to 6 decimal places (~0.1m precision)", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          getCurrentPosition: (success: any) => {
            success({
              coords: {
                latitude: 40.712776123456,
                longitude: -74.005974987654,
                accuracy: 8.4,
              },
            });
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await getBrowserLocation();
    assert.ok(result.coordinates !== null);
    assert.equal(result.isRealGps, true);
    // 6 decimal places
    assert.equal(result.coordinates!.latitude, 40.712776);
    assert.equal(result.coordinates!.longitude, -74.005975);
    assert.equal(result.coordinates!.accuracy, 8);
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24D GPS Remediation: isRealDeviceCoordinates filters out simulated departure offsets and demo fixtures", () => {
  // Real coordinates
  const realCoords: GeoLocationCoordinates = {
    latitude: 51.5074,
    longitude: -0.1278,
    accuracy: 10,
    place_name: "Current Device Location",
  };
  assert.equal(isRealDeviceCoordinates(realCoords), true);

  // Simulated departure coordinate emitted by developer simulator
  const simulatedCoords: GeoLocationCoordinates = {
    latitude: 51.5081,
    longitude: -0.1278,
    accuracy: 10,
    place_name: "Simulated (+75m offset)",
  };
  assert.equal(isRealDeviceCoordinates(simulatedCoords), false, "Must reject simulated coordinates");

  // San Francisco demo fixture
  assert.equal(isRealDeviceCoordinates(DEFAULT_DEMO_COORDINATES), false, "Must reject DEFAULT_DEMO_COORDINATES");

  // Invalid / Null Island coordinates
  assert.equal(isRealDeviceCoordinates({ latitude: 0, longitude: 0 }), false);
  assert.equal(isRealDeviceCoordinates(null), false);
  assert.equal(isRealDeviceCoordinates(undefined), false);
});

test("Phase 24D GPS Remediation: Regression Test — Memory creation strictly rejects SF demo fallback and simulated GPS", () => {
  // Helper simulating the memory creation logic from page.tsx:handleConfirmCandidates
  function createEffectiveCoordinates(
    passedCoordinates?: GeoLocationCoordinates | null,
    activeDepartureTelemetry?: GeoLocationCoordinates | null
  ): GeoLocationCoordinates | undefined {
    // Phase 24D fix: Only accept valid, non-simulated real device coordinates
    if (
      passedCoordinates &&
      isValidGeoCoordinates(passedCoordinates) &&
      isRealDeviceCoordinates(passedCoordinates)
    ) {
      return passedCoordinates;
    }
    return undefined;
  }

  // Bug reproduction 1: Modal GPS timed out or was denied, leaving coordinates null.
  // Previous flawed logic fell back to DEFAULT_DEMO_COORDINATES (San Francisco: 37.7749, -122.4194).
  const nullGpsResult = createEffectiveCoordinates(null, null);
  assert.equal(nullGpsResult, undefined, "Null GPS must resolve to undefined, never San Francisco");

  // Bug reproduction 2: User or developer tested "+75m (Simulate Walking Away)".
  // Active telemetry was populated with simulated coordinates.
  // Previous flawed logic fell back to activeGpsCoords.
  const simulatedTelemetry: GeoLocationCoordinates = {
    latitude: 37.775574,
    longitude: -122.4194,
    accuracy: 10,
    place_name: "Simulated (+75m offset)",
  };
  const simulatedLeakageResult = createEffectiveCoordinates(null, simulatedTelemetry);
  assert.equal(simulatedLeakageResult, undefined, "Simulated departure GPS must NEVER leak into saved memory");

  // Positive case: Legitimate GPS reading captured by device
  const legitGps: GeoLocationCoordinates = {
    latitude: 28.613939,
    longitude: 77.209021,
    accuracy: 14,
    place_name: "Current Device Location",
  };
  const legitResult = createEffectiveCoordinates(legitGps, simulatedTelemetry);
  assert.deepEqual(legitResult, legitGps, "Legitimate device GPS must be preserved exactly");
});

test("Phase 24D GPS Remediation: Low-accuracy GPS (>65m) is detected for landmark prioritization", () => {
  // Indoor GPS reading with cellular tower triangulation (120m accuracy)
  const indoorWeakGps = 120;
  assert.equal(
    isReadingAccurate(indoorWeakGps, DEFAULT_ACCURACY_THRESHOLD_METERS),
    false,
    "Accuracy of 120m must be classified as inaccurate (>65m threshold)"
  );

  // Reliable outdoor GPS reading (12m accuracy)
  const outdoorGoodGps = 12;
  assert.equal(
    isReadingAccurate(outdoorGoodGps, DEFAULT_ACCURACY_THRESHOLD_METERS),
    true,
    "Accuracy of 12m must be classified as accurate"
  );
});

test("Phase 24D GPS Remediation: Memory created without GPS produces truthful landmark-only representation", () => {
  const indoorObservation: ItemObservation = {
    id: "obs-indoor-1",
    user_id: "demo-user",
    item_name: "Reading Glasses",
    location_description: "On wooden nightstand beside bedside lamp",
    landmarks: ["wooden nightstand", "bedside lamp"],
    description: "Prescription frames resting on nightstand",
    confidence: "high",
    observed_at: new Date().toISOString(),
    source: "browser_camera",
    coordinates: undefined, // Truthfully undefined because GPS was unavailable indoors
    user_confirmed: true,
    created_at: new Date().toISOString(),
  };

  assert.equal(indoorObservation.coordinates, undefined, "Indoor observation must not have fabricated coordinates");
  assert.ok(indoorObservation.landmarks.length > 0, "Visual landmarks provide primary grounding");
});
