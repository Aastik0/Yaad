import type { GeoLocationCoordinates, TrackedItem } from "../types/index.ts";

/**
 * Geolocation & Radius Calculation Utilities for Yaad
 * Supports dementia care radius alerts & location-grounded belongings tracking.
 */

// Explicit fixtures for synthetic simulator testing only (NEVER used as live production fallback)
export const DEFAULT_DEMO_COORDINATES: GeoLocationCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 12,
  place_name: "Community Cafe & Hacker Lounge (Demo Fixture Only)",
};

export const DEFAULT_ACCURACY_THRESHOLD_METERS = 65;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 50;
export const DEFAULT_JITTER_BUFFER_COUNT = 2; // consecutive readings required outside radius

// Phase 24E Bounded GPS Configuration Constants
export const GPS_TARGET_ACCURACY_METERS = 10;
export const GPS_ACCEPTABLE_ACCURACY_METERS = 30;
export const GPS_MAX_NAVIGATION_THRESHOLD_METERS = 80;
export const GPS_ACQUISITION_TIMEOUT_MS = 15000;
export const GPS_MAX_READING_AGE_MS = 15000;

export type GpsAccuracyTier =
  | "target"      // <= 10m
  | "acceptable"  // <= 30m
  | "uncertain"   // 31m - 80m
  | "unusable"    // > 80m
  | "unavailable"; // null / 0 / NaN

export function classifyGpsAccuracy(accuracy?: number | null): GpsAccuracyTier {
  if (accuracy === undefined || accuracy === null || isNaN(accuracy) || accuracy <= 0) {
    return "unavailable";
  }
  if (accuracy <= GPS_TARGET_ACCURACY_METERS) return "target";
  if (accuracy <= GPS_ACCEPTABLE_ACCURACY_METERS) return "acceptable";
  if (accuracy <= GPS_MAX_NAVIGATION_THRESHOLD_METERS) return "uncertain";
  return "unusable";
}

export interface BoundedGpsOptions {
  targetAccuracyMeters?: number;
  acceptableAccuracyMeters?: number;
  maxNavigationThresholdMeters?: number;
  timeoutMs?: number;
  maxReadingAgeMs?: number;
  onProgress?: (progress: {
    currentBest: GeoLocationCoordinates | null;
    readingsCount: number;
    isConverging: boolean;
    tier: GpsAccuracyTier;
  }) => void;
}

export interface BoundedGpsResult {
  coordinates: GeoLocationCoordinates | null;
  accuracy: number | null;
  tier: GpsAccuracyTier;
  isRealGps: boolean;
  readingsCount: number;
  durationMs: number;
  stoppedEarly: boolean;
  error?: string;
}

/**
 * Validates whether a GPS accuracy reading is acceptable
 */
export function isReadingAccurate(
  accuracy?: number,
  thresholdMeters: number = DEFAULT_ACCURACY_THRESHOLD_METERS
): boolean {
  if (accuracy === undefined || accuracy === null || isNaN(accuracy)) {
    return false;
  }
  return accuracy > 0 && accuracy <= thresholdMeters;
}

/**
 * GeolocationCoordinator (Phase 24E)
 * Shared singleton managing browser GNSS hardware access.
 * Enforces:
 * - Single native watcher session across components
 * - Progressive accuracy accumulation (smaller accuracy radius always retained)
 * - Anti-stale reading filtering (maximumAge: 0, age <= 15s)
 * - Early exit when target accuracy (<=10m) is achieved
 * - Strict 15-second hard timeout ceiling
 * - Guaranteed watcher cleanup across all exit paths, unmounts, and tab backgrounding
 */
export class GeolocationCoordinator {
  private static instance: GeolocationCoordinator | null = null;
  private currentAcquisitionCancel: ((reason: string) => void) | null = null;
  private latestReading: GeoLocationCoordinates | null = null;
  private latestReadingTimestamp: number = 0;
  private subscribers: Set<(coords: GeoLocationCoordinates) => void> = new Set();
  private boundVisibilityHandler: (() => void) | null = null;

  private constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.boundVisibilityHandler);
    }
  }

  public static getInstance(): GeolocationCoordinator {
    if (!GeolocationCoordinator.instance) {
      GeolocationCoordinator.instance = new GeolocationCoordinator();
    }
    return GeolocationCoordinator.instance;
  }

  public static resetInstanceForTesting(): void {
    if (GeolocationCoordinator.instance) {
      GeolocationCoordinator.instance.cleanup();
      GeolocationCoordinator.instance = null;
    }
  }

  private handleVisibilityChange(): void {
    if (typeof document !== "undefined" && document.hidden) {
      this.cancelAcquisition("Acquisition paused due to document backgrounding.");
    }
  }

  public cancelAcquisition(reason: string = "Acquisition cancelled."): void {
    if (this.currentAcquisitionCancel) {
      const cancelFn = this.currentAcquisitionCancel;
      this.currentAcquisitionCancel = null;
      cancelFn(reason);
    }
  }

  public getLatestFreshReading(): GeoLocationCoordinates | null {
    if (
      this.latestReading &&
      this.latestReadingTimestamp > 0 &&
      Date.now() - this.latestReadingTimestamp <= GPS_MAX_READING_AGE_MS
    ) {
      return this.latestReading;
    }
    return null;
  }

  public subscribe(listener: (coords: GeoLocationCoordinates) => void): () => void {
    this.subscribers.add(listener);
    if (this.latestReading) {
      listener(this.latestReading);
    }
    return () => {
      this.subscribers.delete(listener);
    };
  }

  public notifySubscribers(coords: GeoLocationCoordinates): void {
    this.subscribers.forEach((sub) => {
      try {
        sub(coords);
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    });
  }

  /**
   * Acquires the best possible GPS reading using a bounded watchPosition session.
   * Runs for at most timeoutMs (default: 15s) and exits early if target accuracy (<=10m) is attained.
   */
  public async acquireBoundedGps(options?: BoundedGpsOptions): Promise<BoundedGpsResult> {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return {
        coordinates: null,
        accuracy: null,
        tier: "unavailable",
        isRealGps: false,
        readingsCount: 0,
        durationMs: 0,
        stoppedEarly: false,
        error: "Geolocation is not supported by your browser environment.",
      };
    }

    // Cancel any existing bounded acquisition to prevent concurrent watcher collisions
    this.cancelAcquisition("Cancelled by new acquisition request.");

    const targetAcc = options?.targetAccuracyMeters ?? GPS_TARGET_ACCURACY_METERS;
    const timeoutMs = options?.timeoutMs ?? GPS_ACQUISITION_TIMEOUT_MS;
    const maxAgeMs = options?.maxReadingAgeMs ?? GPS_MAX_READING_AGE_MS;
    const startTime = Date.now();

    return new Promise<BoundedGpsResult>((resolve) => {
      let bestCoords: GeoLocationCoordinates | null = null;
      let bestAccuracy = Infinity;
      let readingsCount = 0;
      let isDone = false;
      let timerId: ReturnType<typeof setTimeout> | null = null;
      let watchId: number | null = null;

      const finish = (stoppedEarly: boolean, errorMsg?: string) => {
        if (isDone) return;
        isDone = true;
        this.currentAcquisitionCancel = null;

        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }

        if (watchId !== null && typeof window !== "undefined" && "geolocation" in navigator) {
          try {
            navigator.geolocation.clearWatch(watchId);
          } catch {}
          watchId = null;
        }

        const finalTier = classifyGpsAccuracy(bestCoords?.accuracy);
        resolve({
          coordinates: bestCoords,
          accuracy: bestCoords ? bestCoords.accuracy ?? null : null,
          tier: finalTier,
          isRealGps: bestCoords !== null,
          readingsCount,
          durationMs: Date.now() - startTime,
          stoppedEarly,
          error: errorMsg,
        });
      };

      // 15-second hard timeout
      timerId = setTimeout(() => {
        finish(false, bestCoords ? undefined : "GPS acquisition timed out after 15 seconds.");
      }, timeoutMs);

      // Register cancellation callback
      this.currentAcquisitionCancel = (reason: string) => {
        finish(false, reason);
      };

      try {
        const handleSuccess = (pos: GeolocationPosition) => {
          // Check freshness: reject stale readings
          const now = Date.now();
          const readingAge = pos.timestamp ? now - pos.timestamp : 0;
          if (pos.timestamp && readingAge > maxAgeMs) {
            return; // Stale reading rejected
          }

          readingsCount++;
          const rawAccuracy = pos.coords.accuracy;
          const roundedAcc = Math.round(rawAccuracy);

          // Progressive convergence: only retain if accuracy is strictly better (smaller radius)
          if (rawAccuracy < bestAccuracy) {
            bestAccuracy = rawAccuracy;
            const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
            const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;

            bestCoords = {
              latitude: lat,
              longitude: lon,
              accuracy: roundedAcc,
              place_name: "Current Device Location",
            };

            this.latestReading = bestCoords;
            this.latestReadingTimestamp = Date.now();
            this.notifySubscribers(bestCoords);

            options?.onProgress?.({
              currentBest: bestCoords,
              readingsCount,
              isConverging: true,
              tier: classifyGpsAccuracy(roundedAcc),
            });

            // Early exit check: target accuracy (<=10m) achieved
            if (rawAccuracy <= targetAcc) {
              finish(true);
              return;
            }
          }
        };

        const handleError = (err: GeolocationPositionError) => {
          let errorMsg = "Could not retrieve GPS coordinates.";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMsg = "Location permission denied by user or system.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMsg = "GPS location signal unavailable.";
              break;
            case err.TIMEOUT:
              errorMsg = "GPS location acquisition timed out.";
              break;
            default:
              errorMsg = err.message || errorMsg;
          }
          if (bestCoords) {
            finish(false);
          } else {
            finish(false, errorMsg);
          }
        };

        const geoOpts: PositionOptions = {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: timeoutMs,
        };

        if (typeof navigator.geolocation.watchPosition === "function") {
          watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOpts);
        } else if (typeof navigator.geolocation.getCurrentPosition === "function") {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              handleSuccess(pos);
              finish(false);
            },
            handleError,
            geoOpts
          );
        } else {
          finish(false, "Geolocation is not supported by your browser environment.");
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to initialize GPS watcher.";
        finish(false, errorMsg);
      }
    });
  }

  public cleanup(): void {
    this.cancelAcquisition("Coordinator cleaned up.");
    this.subscribers.clear();
    this.latestReading = null;
    this.latestReadingTimestamp = 0;
    if (this.boundVisibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
  }
}

/**
 * Requests browser GPS coordinates with bounded acquisition and 6-decimal precision.
 * Returns coordinates: null when GPS is unavailable, denied, or timed out.
 * NEVER fabricates San Francisco or demo coordinates for real users.
 */
export async function getBrowserLocation(options?: BoundedGpsOptions): Promise<{
  coordinates: GeoLocationCoordinates | null;
  isRealGps: boolean;
  tier: GpsAccuracyTier;
  error?: string;
}> {
  const result = await GeolocationCoordinator.getInstance().acquireBoundedGps(options);
  return {
    coordinates: result.coordinates,
    isRealGps: result.isRealGps,
    tier: result.tier,
    error: result.error,
  };
}

/**
 * Ensures coordinates are legitimate real-device GPS coordinates.
 * Strictly filters out developer simulation offsets and demo fixtures.
 */
export function isRealDeviceCoordinates(
  coords?: Partial<GeoLocationCoordinates> | null
): boolean {
  if (!coords || !isValidGeoCoordinates(coords)) return false;
  const place = (coords.place_name || "").toLowerCase();
  if (place.includes("simulated")) return false;
  if (place.includes("demo fixture")) return false;
  if (place.includes("community cafe & hacker lounge")) return false;
  return true;
}

/**
 * Calculates distance in meters between two lat/lng points using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Simulates a new coordinate offset by a given distance in meters
 */
export function simulateCoordinateOffset(
  baseLat: number,
  baseLon: number,
  distanceMeters: number
): { latitude: number; longitude: number } {
  // 1 degree latitude is approx 111,320 meters
  const deltaLat = distanceMeters / 111320;
  return {
    latitude: Math.round((baseLat + deltaLat) * 1000000) / 1000000,
    longitude: baseLon,
  };
}

/**
 * Evaluates whether current coordinates breach the geofence of an item
 */
export interface GeofenceEvaluation {
  distanceMeters: number;
  radiusMeters: number;
  isBreached: boolean;
  accuracy: number;
  isAccurate: boolean;
}

export function evaluateGeofence(
  current: GeoLocationCoordinates,
  itemCoords: GeoLocationCoordinates,
  radiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS,
  accuracyThreshold: number = DEFAULT_ACCURACY_THRESHOLD_METERS
): GeofenceEvaluation {
  const distance = calculateDistanceMeters(
    current.latitude,
    current.longitude,
    itemCoords.latitude,
    itemCoords.longitude
  );

  const accuracy = current.accuracy ?? 999;
  const isAccurate = isReadingAccurate(accuracy, accuracyThreshold);

  return {
    distanceMeters: distance,
    radiusMeters,
    isBreached: distance > radiusMeters,
    accuracy,
    isAccurate,
  };
}

/**
 * Formats a truthful, calm departure reminder message
 * Always uses truthful phrasing ("may still be at", "last recorded at")
 */
export function formatTruthfulDepartureAlert(
  item: TrackedItem,
  distanceMeters: number
): { headline: string; message: string; speechText: string } {
  const headline = `Departure Alert: ${item.item_name} may still be at ${item.last_location_description}`;
  const message = `You are approximately ${distanceMeters}m away from where your ${item.item_name} was last recorded (${item.last_location_description}).`;
  const speechText = `Yaad notice: You have stepped approximately ${distanceMeters} meters away from your ${item.item_name}. It was last recorded at ${item.last_location_description}. Did you remember to take it?`;

  return { headline, message, speechText };
}

/**
 * Browser Notification Helper with safe permission requesting
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return "denied";
  }
}

/**
 * Delivers a system notification if granted
 */
export function sendDepartureNotification(
  headline: string,
  body: string
): boolean {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(headline, {
        body,
        icon: "/favicon.ico",
        tag: "yaad-departure-alert",
      });
      return true;
    } catch (err) {
      console.warn("Could not display system notification:", err);
      return false;
    }
  }
  return false;
}

/**
 * Generates an external Google Maps directions URL
 * Does not require a Google Maps API key (universal URL scheme)
 */
export function generateGoogleMapsUrl(
  latitude: number,
  longitude: number,
  label?: string
): string {
  const dest = `${latitude},${longitude}`;
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams({
    destination: dest,
    travelmode: "walking",
  });
  if (label) {
    params.set("destination_name", label);
  }
  return `${base}&${params.toString()}`;
}

/**
 * Generates an external Apple Maps directions URL
 * Opens Apple Maps app on iOS/macOS and web view elsewhere
 */
export function generateAppleMapsUrl(
  latitude: number,
  longitude: number,
  label?: string
): string {
  const daddr = `${latitude},${longitude}`;
  const base = "https://maps.apple.com/";
  const params = new URLSearchParams({
    daddr,
    dirflg: "w", // walking directions
  });
  if (label) {
    params.set("q", label);
  }
  return `${base}?${params.toString()}`;
}

/**
 * Validates whether geographic coordinates are non-null, numeric, and within valid Earth bounds.
 * Rejects (0, 0) "Null Island" fallback to avoid misleading navigation directions.
 */
export function isValidGeoCoordinates(
  coords?: Partial<GeoLocationCoordinates> | null
): coords is GeoLocationCoordinates {
  if (!coords) return false;
  const { latitude, longitude } = coords;
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Generates a cross-platform map navigation URL.
 * Automatically chooses Apple Maps for Apple platforms (iOS/macOS) and universal Google Maps for other platforms.
 * Strictly requires valid numeric coordinates.
 */
export function generateCrossPlatformMapUrl(
  latitude: number,
  longitude: number,
  label?: string,
  customUserAgent?: string
): string {
  const isApple = (() => {
    if (customUserAgent !== undefined) {
      return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(customUserAgent);
    }
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    return false;
  })();

  if (isApple) {
    return generateAppleMapsUrl(latitude, longitude, label);
  }
  return generateGoogleMapsUrl(latitude, longitude, label);
}

export type NavigationResolutionType =
  | "HAS_COORDINATES"
  | "LANDMARK_ONLY"
  | "UNCERTAIN_COORDINATES"
  | "NOT_FOUND";

export interface NavigationResolutionResult {
  type: NavigationResolutionType;
  item: TrackedItem | null;
  query: string;
  headline: string;
  locationDescription: string;
  landmarks: string[];
  coordinates: GeoLocationCoordinates | null;
  googleMapsUrl: string | null;
  appleMapsUrl: string | null;
  disclaimer: string;
}

/**
 * Resolves navigation guidance for a tracked item truthfully
 * Never fabricates coordinates, directions, or current item locations.
 * Suspends turn-by-turn map directions when GPS accuracy > 80m.
 */
export function resolveItemNavigationStatus(
  item: TrackedItem | null,
  query: string
): NavigationResolutionResult {
  if (!item) {
    return {
      type: "NOT_FOUND",
      item: null,
      query,
      headline: `No historical sighting recorded for "${query}"`,
      locationDescription: "Cannot provide navigation directions. Yaad records historical sightings only.",
      landmarks: [],
      coordinates: null,
      googleMapsUrl: null,
      appleMapsUrl: null,
      disclaimer: "Yaad records historical sightings only and never fabricates present locations.",
    };
  }

  const coords = item.coordinates;
  const hasValidCoordinates = isValidGeoCoordinates(coords);

  if (hasValidCoordinates && coords) {
    const accuracy = coords.accuracy ?? null;
    const tier = classifyGpsAccuracy(accuracy);

    // If accuracy exceeds 80m, do NOT use for walking navigation directions
    if (tier === "unusable" || (accuracy !== null && accuracy > GPS_MAX_NAVIGATION_THRESHOLD_METERS)) {
      return {
        type: "UNCERTAIN_COORDINATES",
        item,
        query,
        headline: `Coarse Location Guidance: ${item.item_name}`,
        locationDescription: item.last_location_description,
        landmarks: item.last_landmarks || [],
        coordinates: coords,
        googleMapsUrl: null,
        appleMapsUrl: null,
        disclaimer: `Recorded GPS accuracy (±${accuracy}m) exceeds the 80m walking navigation threshold. Map directions are disabled to prevent disorientation; please rely on visual scene landmarks described above.`,
      };
    }

    return {
      type: "HAS_COORDINATES",
      item,
      query,
      headline: `Navigate to ${item.item_name}`,
      locationDescription: item.last_location_description,
      landmarks: item.last_landmarks || [],
      coordinates: coords,
      googleMapsUrl: generateGoogleMapsUrl(coords.latitude, coords.longitude, item.item_name),
      appleMapsUrl: generateAppleMapsUrl(coords.latitude, coords.longitude, item.item_name),
      disclaimer: "Navigation directs you to where your item was last observed. Yaad cannot guarantee the item has not been moved.",
    };
  }

  return {
    type: "LANDMARK_ONLY",
    item,
    query,
    headline: `Landmark Guidance: ${item.item_name}`,
    locationDescription: item.last_location_description,
    landmarks: item.last_landmarks || [],
    coordinates: null,
    googleMapsUrl: null,
    appleMapsUrl: null,
    disclaimer: "Outdoor GPS coordinates were not recorded for this indoor sighting. Please verify the physical landmarks described above.",
  };
}
