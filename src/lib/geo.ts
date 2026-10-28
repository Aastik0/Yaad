import type { GeoLocationCoordinates } from "../types/index.ts";

/**
 * Geolocation & Radius Calculation Utilities for Yaad
 * Supports dementia care radius alerts & location-grounded belongings tracking.
 */

// Default fallback coordinates (e.g. Hacker Lounge / Cafe)
export const DEFAULT_DEMO_COORDINATES: GeoLocationCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 12,
  place_name: "Community Cafe & Hacker Lounge",
};

/**
 * Requests browser GPS coordinates with graceful fallback
 */
export async function getBrowserLocation(): Promise<{
  coordinates: GeoLocationCoordinates;
  isRealGps: boolean;
}> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return { coordinates: DEFAULT_DEMO_COORDINATES, isRealGps: false };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coordinates: {
            latitude: Math.round(pos.coords.latitude * 10000) / 10000,
            longitude: Math.round(pos.coords.longitude * 10000) / 10000,
            accuracy: Math.round(pos.coords.accuracy),
            place_name: "Current Device Location",
          },
          isRealGps: true,
        });
      },
      (err) => {
        console.warn("Browser GPS unavailable or denied, using demo coordinates:", err.message);
        resolve({ coordinates: DEFAULT_DEMO_COORDINATES, isRealGps: false });
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  });
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
    latitude: Math.round((baseLat + deltaLat) * 10000) / 10000,
    longitude: baseLon,
  };
}
