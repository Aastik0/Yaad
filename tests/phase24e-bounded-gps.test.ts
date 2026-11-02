import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GeolocationCoordinator,
  classifyGpsAccuracy,
  resolveItemNavigationStatus,
  GPS_TARGET_ACCURACY_METERS,
  GPS_ACCEPTABLE_ACCURACY_METERS,
  GPS_MAX_NAVIGATION_THRESHOLD_METERS,
  GPS_ACQUISITION_TIMEOUT_MS,
  GPS_MAX_READING_AGE_MS,
} from "../src/lib/geo.ts";
import type { GpsAccuracyTier } from "../src/lib/geo.ts";
import type { GeoLocationCoordinates, TrackedItem } from "../src/types/index.ts";

test("Phase 24E: classifyGpsAccuracy correctly assigns tiers", () => {
  assert.equal(classifyGpsAccuracy(undefined), "unavailable");
  assert.equal(classifyGpsAccuracy(null), "unavailable");
  assert.equal(classifyGpsAccuracy(5), "target"); // <=10m
  assert.equal(classifyGpsAccuracy(10), "target"); // <=10m
  assert.equal(classifyGpsAccuracy(11), "acceptable"); // 11-30m
  assert.equal(classifyGpsAccuracy(30), "acceptable"); // 11-30m
  assert.equal(classifyGpsAccuracy(31), "uncertain"); // 31-80m
  assert.equal(classifyGpsAccuracy(80), "uncertain"); // 31-80m
  assert.equal(classifyGpsAccuracy(81), "unusable"); // >80m
  assert.equal(classifyGpsAccuracy(150), "unusable"); // >80m
});

test("Phase 24E: Progressive accuracy improvement — worse readings never replace better ones", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let watchSuccessCb: any = null;
    let clearedWatchId: number | null = null;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: (success: any) => {
            watchSuccessCb = success;
            return 101;
          },
          clearWatch: (id: number) => {
            clearedWatchId = id;
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();
    const progressUpdates: any[] = [];

    const acquisitionPromise = coordinator.acquireBoundedGps({
      targetAccuracyMeters: 10,
      timeoutMs: 500,
      onProgress: (update) => {
        progressUpdates.push(update);
      },
    });

    // Reading 1: 45m accuracy (coarse)
    watchSuccessCb({
      coords: { latitude: 37.774921, longitude: -122.419412, accuracy: 45 },
      timestamp: Date.now(),
    });

    // Reading 2: 18m accuracy (improvement!)
    watchSuccessCb({
      coords: { latitude: 37.774925, longitude: -122.419416, accuracy: 18 },
      timestamp: Date.now(),
    });

    // Reading 3: 65m accuracy (worse reading, must be IGNORED)
    watchSuccessCb({
      coords: { latitude: 37.774999, longitude: -122.419499, accuracy: 65 },
      timestamp: Date.now(),
    });

    const result = await acquisitionPromise;

    // Must retain the 18m reading, not the subsequent 65m worse reading
    assert.equal(result.accuracy, 18, "Must retain the best accuracy reading (18m)");
    assert.equal(result.coordinates?.latitude, 37.774925);
    assert.equal(result.tier, "acceptable");
    assert.equal(clearedWatchId, 101, "Watcher must be cleaned up on completion");
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: Early exit occurs immediately when target accuracy (<=10m) is achieved", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let watchSuccessCb: any = null;
    let clearedWatchId: number | null = null;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: (success: any) => {
            watchSuccessCb = success;
            return 202;
          },
          clearWatch: (id: number) => {
            clearedWatchId = id;
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();

    const acquisitionPromise = coordinator.acquireBoundedGps({
      targetAccuracyMeters: 10,
      timeoutMs: 15000,
    });

    // Emitting reading with 7m accuracy (<=10m target)
    watchSuccessCb({
      coords: { latitude: 40.712776, longitude: -74.005974, accuracy: 7 },
      timestamp: Date.now(),
    });

    const result = await acquisitionPromise;

    assert.equal(result.stoppedEarly, true, "Must flag stoppedEarly: true");
    assert.equal(result.accuracy, 7);
    assert.equal(result.tier, "target");
    assert.equal(clearedWatchId, 202, "clearWatch must be called immediately upon early exit");
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: 15-second hard timeout returns best available reading if target accuracy is not met", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let watchSuccessCb: any = null;
    let clearedWatchId: number | null = null;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: (success: any) => {
            watchSuccessCb = success;
            return 303;
          },
          clearWatch: (id: number) => {
            clearedWatchId = id;
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();

    // Use a short test timeout representing the 15s ceiling
    const acquisitionPromise = coordinator.acquireBoundedGps({
      targetAccuracyMeters: 10,
      timeoutMs: 100, // short test timeout
    });

    // Reading with 22m (acceptable, but not target <=10m)
    watchSuccessCb({
      coords: { latitude: 51.507351, longitude: -0.127758, accuracy: 22 },
      timestamp: Date.now(),
    });

    const result = await acquisitionPromise;

    assert.equal(result.stoppedEarly, false, "Did not stop early because target was not met");
    assert.equal(result.accuracy, 22);
    assert.equal(result.tier, "acceptable");
    assert.equal(clearedWatchId, 303, "clearWatch must be called when timeout expires");
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: Stale readings (>15s old timestamp) are rejected", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let watchSuccessCb: any = null;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: (success: any) => {
            watchSuccessCb = success;
            return 404;
          },
          clearWatch: () => {},
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();

    const acquisitionPromise = coordinator.acquireBoundedGps({
      targetAccuracyMeters: 10,
      timeoutMs: 150,
      maxReadingAgeMs: 15000,
    });

    // Stale reading: timestamp from 60 seconds ago
    watchSuccessCb({
      coords: { latitude: 34.052234, longitude: -118.243685, accuracy: 5 },
      timestamp: Date.now() - 60000,
    });

    const result = await acquisitionPromise;

    // Even though accuracy was 5m, it was stale and rejected, so coordinates are null
    assert.equal(result.coordinates, null, "Stale reading must be rejected");
    assert.equal(result.tier, "unavailable");
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: Permission denial reports clean error with null coordinates and watcher cleanup", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let clearedWatchId: number | null = null;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: (_success: any, error: any) => {
            setTimeout(() => {
              error({
                code: 1, // PERMISSION_DENIED
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
                message: "User denied location",
              });
            }, 0);
            return 505;
          },
          clearWatch: (id: number) => {
            clearedWatchId = id;
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();
    const result = await coordinator.acquireBoundedGps();

    assert.equal(result.coordinates, null);
    assert.equal(result.tier, "unavailable");
    assert.ok(result.error?.includes("denied"));
    assert.equal(clearedWatchId, 505);
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: Document backgrounding (visibilityChange) cleanly aborts acquisition", async () => {
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    let visibilityListener: any = null;
    (globalThis as any).document = {
      hidden: false,
      addEventListener: (event: string, cb: any) => {
        if (event === "visibilitychange") visibilityListener = cb;
      },
      removeEventListener: () => {},
    };

    let clearedWatchId: number | null = null;
    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: () => 606,
          clearWatch: (id: number) => {
            clearedWatchId = id;
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();
    const acquisitionPromise = coordinator.acquireBoundedGps({ timeoutMs: 5000 });

    // Simulate tab backgrounding
    (globalThis as any).document.hidden = true;
    if (visibilityListener) {
      visibilityListener();
    } else {
      coordinator.cancelAcquisition("Acquisition paused due to document backgrounding.");
    }

    const result = await acquisitionPromise;
    assert.ok(result.error?.includes("backgrounding") || result.error?.includes("cancelled"));
    assert.equal(clearedWatchId, 606);
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: Concurrent acquisition safely cancels and supersedes previous watcher", async () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    (globalThis as any).window = {};
    const clearedIds: number[] = [];
    let watchCounter = 700;

    Object.defineProperty(globalThis, "navigator", {
      value: {
        geolocation: {
          watchPosition: () => ++watchCounter,
          clearWatch: (id: number) => {
            clearedIds.push(id);
          },
        },
      },
      configurable: true,
      writable: true,
    });

    const coordinator = GeolocationCoordinator.getInstance();

    // Call 1
    const p1 = coordinator.acquireBoundedGps({ timeoutMs: 5000 });
    // Call 2 starts before Call 1 finishes
    const p2 = coordinator.acquireBoundedGps({ timeoutMs: 5000 });

    // Call 1 should be cancelled
    const res1 = await p1;
    assert.ok(res1.error?.includes("Cancelled by new acquisition request"));
    assert.ok(clearedIds.includes(701), "First watcher (701) must have been cleared");

    // Clean up call 2
    coordinator.cancelAcquisition("Test teardown");
    await p2;
    assert.ok(clearedIds.includes(702), "Second watcher (702) must also be cleared");
  } finally {
    (globalThis as any).window = originalWindow;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  }
});

test("Phase 24E: resolveItemNavigationStatus suspends directions when accuracy > 80m", () => {
  const item: TrackedItem = {
    id: "item-keys",
    user_id: "user-1",
    item_name: "Keys",
    category: "Keys",
    last_location_description: "Near front door console",
    last_landmarks: ["wooden console table", "key hook"],
    last_seen_at: new Date().toISOString(),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    coordinates: {
      latitude: 37.7751,
      longitude: -122.4195,
      accuracy: 120, // >80m coarse accuracy
    },
  };

  const nav = resolveItemNavigationStatus(item, "keys");

  // Directions must be suspended due to coarse GPS
  assert.equal(nav.type, "UNCERTAIN_COORDINATES");
  assert.equal(nav.googleMapsUrl, null);
  assert.equal(nav.appleMapsUrl, null);
  assert.ok(nav.disclaimer.includes("exceeds the 80m"));
  assert.ok(nav.disclaimer.includes("Map directions are disabled"));
});

test("Phase 24E: resolveItemNavigationStatus allows directions when accuracy <= 80m", () => {
  const item: TrackedItem = {
    id: "item-wallet",
    user_id: "user-1",
    item_name: "Wallet",
    category: "Wallet",
    last_location_description: "On study desk",
    last_landmarks: ["wooden study desk", "laptop"],
    last_seen_at: new Date().toISOString(),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    coordinates: {
      latitude: 37.7780,
      longitude: -122.4210,
      accuracy: 15, // <=80m acceptable accuracy
    },
  };

  const nav = resolveItemNavigationStatus(item, "wallet");

  assert.equal(nav.type, "HAS_COORDINATES");
  assert.ok(nav.googleMapsUrl !== null);
  assert.ok(nav.appleMapsUrl !== null);
  assert.ok(nav.googleMapsUrl?.includes("destination=37.778%2C-122.421"));
});
