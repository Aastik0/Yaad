import { useState, useEffect, useRef, useCallback } from "react";
import type { GeoLocationCoordinates } from "../types/index.ts";
import {
  DEFAULT_ACCURACY_THRESHOLD_METERS,
  isReadingAccurate,
  simulateCoordinateOffset,
} from "../lib/geo.ts";

export type LocationMonitoringStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "inaccurate"
  | "unsupported";

export interface UseForegroundLocationOptions {
  accuracyThresholdMeters?: number;
  onLocationUpdate?: (coords: GeoLocationCoordinates) => void;
}

export interface UseForegroundLocationReturn {
  status: LocationMonitoringStatus;
  coordinates: GeoLocationCoordinates | null;
  error: string | null;
  isMonitoring: boolean;
  accuracy: number | null;
  isAccurate: boolean;
  readingsCount: number;
  lastReadingTime: string | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  simulateMovement: (distanceMeters: number) => void;
  clearError: () => void;
}

export function useForegroundLocation(
  options?: UseForegroundLocationOptions
): UseForegroundLocationReturn {
  const accuracyThreshold =
    options?.accuracyThresholdMeters ?? DEFAULT_ACCURACY_THRESHOLD_METERS;

  const [status, setStatus] = useState<LocationMonitoringStatus>("idle");
  const [coordinates, setCoordinates] = useState<GeoLocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readingsCount, setReadingsCount] = useState<number>(0);
  const [lastReadingTime, setLastReadingTime] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const onLocationUpdateRef = useRef(options?.onLocationUpdate);
  onLocationUpdateRef.current = options?.onLocationUpdate;

  const clearError = useCallback(() => setError(null), []);

  const stopMonitoring = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("idle");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const startMonitoring = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStatus("requesting");
    setError(null);

    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          // Phase 24D/24E: 6 decimal places (~0.1m precision)
          const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
          const lon = Math.round(pos.coords.longitude * 1000000) / 1000000;
          const acc = Math.round(pos.coords.accuracy);
          const accurate = isReadingAccurate(acc, accuracyThreshold);

          const coords: GeoLocationCoordinates = {
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            place_name: "Current GPS Location",
          };

          setCoordinates(coords);
          setLastReadingTime(new Date().toISOString());
          setReadingsCount((prev) => prev + 1);

          if (accurate) {
            setStatus("active");
            setError(null);
          } else {
            setStatus("inaccurate");
            setError(`Low GPS accuracy (±${acc}m). Outdoor accuracy threshold is ±${accuracyThreshold}m.`);
          }

          onLocationUpdateRef.current?.(coords);
        },
        (err) => {
          let msg = "Could not retrieve current location.";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setStatus("denied");
              msg = "Location permission was denied. Please allow location access in your browser settings.";
              break;
            case err.POSITION_UNAVAILABLE:
              setStatus("unavailable");
              msg = "Location signal unavailable. Please ensure GPS/location services are turned on.";
              break;
            case err.TIMEOUT:
              setStatus("unavailable");
              msg = "Location request timed out while acquiring GPS satellite lock.";
              break;
            default:
              setStatus("unavailable");
              msg = err.message || "Unknown location error.";
          }
          setError(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 5000,
        }
      );

      watchIdRef.current = id;
    } catch (err) {
      console.error("Failed to start geolocation watch:", err);
      setStatus("unavailable");
      setError("Failed to initialize location monitoring service.");
    }
  }, [accuracyThreshold]);

  // Utility to test simulated displacement without physical travel
  const simulateMovement = useCallback(
    (distanceMeters: number) => {
      setCoordinates((prev) => {
        const base = prev || { latitude: 37.7749, longitude: -122.4194, accuracy: 12 };
        const offset = simulateCoordinateOffset(base.latitude, base.longitude, distanceMeters);
        const updated: GeoLocationCoordinates = {
          latitude: offset.latitude,
          longitude: offset.longitude,
          accuracy: base.accuracy || 12,
          place_name: `Simulated +${distanceMeters}m displacement`,
        };
        setLastReadingTime(new Date().toISOString());
        setReadingsCount((count) => count + 1);
        setStatus("active");
        onLocationUpdateRef.current?.(updated);
        return updated;
      });
    },
    []
  );

  const accuracy = coordinates?.accuracy ?? null;
  const isAccurate = accuracy !== null ? isReadingAccurate(accuracy, accuracyThreshold) : false;

  return {
    status,
    coordinates,
    error,
    isMonitoring: status === "active" || status === "inaccurate" || status === "requesting",
    accuracy,
    isAccurate,
    readingsCount,
    lastReadingTime,
    startMonitoring,
    stopMonitoring,
    simulateMovement,
    clearError,
  };
}

