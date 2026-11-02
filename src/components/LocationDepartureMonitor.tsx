"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  ShieldAlert,
  Bell,
  Sliders,
  AlertTriangle,
  Check,
  CheckCheck,
  RotateCcw,
  Footprints,
  Info,
  X,
  Volume2,
} from "lucide-react";
import type { TrackedItem, GeoLocationCoordinates } from "../types/index.ts";
import { useForegroundLocation } from "../hooks/useForegroundLocation.ts";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  DEFAULT_JITTER_BUFFER_COUNT,
  DEFAULT_ACCURACY_THRESHOLD_METERS,
  evaluateGeofence,
  formatTruthfulDepartureAlert,
  requestNotificationPermission,
  sendDepartureNotification,
} from "../lib/geo.ts";
import { speakCalmReminder } from "../lib/speech.ts";

export interface LocationDepartureMonitorProps {
  unconfirmedItems: TrackedItem[];
  onMarkCollected: (id: string) => void;
  onMarkLeftBehind: (id: string) => void;
  onLocationUpdate?: (coords: GeoLocationCoordinates) => void;
  className?: string;
}

export const LocationDepartureMonitor: React.FC<LocationDepartureMonitorProps> = ({
  unconfirmedItems,
  onMarkCollected,
  onMarkLeftBehind,
  onLocationUpdate,
  className = "",
}) => {
  const [geofenceRadius, setGeofenceRadius] = useState<number>(DEFAULT_GEOFENCE_RADIUS_METERS);
  const [jitterThreshold, setJitterThreshold] = useState<number>(DEFAULT_JITTER_BUFFER_COUNT);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Track active departure alerts: item.id -> { item, distance, timestamp }
  const [activeAlerts, setActiveAlerts] = useState<
    Array<{
      item: TrackedItem;
      distanceMeters: number;
      timestamp: string;
    }>
  >([]);

  // Jitter tracking buffer: item.id -> consecutive breach count
  const breachBufferRef = useRef<Record<string, number>>({});
  // Deduplication to prevent continuous repeated alerts
  const alertedItemsRef = useRef<Set<string>>(new Set());

  // Check browser notification status on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
  };

  // Evaluate departure breach whenever live coordinates update
  const handleLocationUpdate = useCallback(
    (coords: GeoLocationCoordinates) => {
      onLocationUpdate?.(coords);

      const itemsWithCoords = unconfirmedItems.filter(
        (item) => item.coordinates && item.status !== "collected" && item.status !== "resolved"
      );

      itemsWithCoords.forEach((item) => {
        if (!item.coordinates) return;

        const effectiveRadius = item.geofence_radius_meters || geofenceRadius;
        const evaluation = evaluateGeofence(
          coords,
          item.coordinates,
          effectiveRadius,
          DEFAULT_ACCURACY_THRESHOLD_METERS
        );

        if (!evaluation.isAccurate) {
          // Reject inaccurate readings from triggering departure alerts
          return;
        }

        if (evaluation.isBreached) {
          const currentCount = (breachBufferRef.current[item.id] || 0) + 1;
          breachBufferRef.current[item.id] = currentCount;

          if (currentCount >= jitterThreshold && !alertedItemsRef.current.has(item.id)) {
            // Geofence departure confirmed with jitter filtering!
            alertedItemsRef.current.add(item.id);
            const alertData = {
              item,
              distanceMeters: evaluation.distanceMeters,
              timestamp: new Date().toISOString(),
            };

            setActiveAlerts((prev) => [
              ...prev.filter((a) => a.item.id !== item.id),
              alertData,
            ]);

            // Notify repository / status transition
            onMarkLeftBehind(item.id);

            // Audio & System notifications
            const alertText = formatTruthfulDepartureAlert(item, evaluation.distanceMeters);
            speakCalmReminder(alertText.speechText);
            sendDepartureNotification(alertText.headline, alertText.message);
          }
        } else {
          // Inside radius: reset breach count and remove from alerted set
          breachBufferRef.current[item.id] = 0;
          alertedItemsRef.current.delete(item.id);
          setActiveAlerts((prev) => prev.filter((a) => a.item.id !== item.id));
        }
      });
    },
    [unconfirmedItems, geofenceRadius, jitterThreshold, onLocationUpdate, onMarkLeftBehind]
  );

  const {
    status,
    coordinates,
    error,
    isMonitoring,
    accuracy,
    readingsCount,
    lastReadingTime,
    startMonitoring,
    stopMonitoring,
    simulateMovement,
    clearError,
  } = useForegroundLocation({
    accuracyThresholdMeters: DEFAULT_ACCURACY_THRESHOLD_METERS,
    onLocationUpdate: handleLocationUpdate,
  });

  const handleDismissAlert = (itemId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.item.id !== itemId));
  };

  const handleCollectItem = (itemId: string) => {
    onMarkCollected(itemId);
    setActiveAlerts((prev) => prev.filter((a) => a.item.id !== itemId));
    alertedItemsRef.current.delete(itemId);
  };

  return (
    <div
      className={`bg-white/95 border border-ivory-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${className}`}
      data-testid="location-departure-monitor"
    >
      {/* Active Departure Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="mb-4 space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.item.id}
              className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm animate-pulse-once"
              data-testid="departure-alert-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-200 text-amber-900 mt-0.5 shrink-0">
                    <ShieldAlert className="w-5 h-5 text-amber-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Departure Alert Triggered
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950">
                        {alert.distanceMeters}m Away
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-charcoal-900 mt-1">
                      Your {alert.item.item_name} may still be at {alert.item.last_location_description}
                    </h4>
                    <p className="text-xs text-charcoal-700 mt-0.5">
                      You stepped past your {geofenceRadius}m safety radius. Landmarks:{" "}
                      {alert.item.last_landmarks.join(", ") || "None recorded"}.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.item.id)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Action Buttons */}
              <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCollectItem(alert.item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-sage-200" />
                  <span>I have my {alert.item.item_name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.item.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <span>Acknowledge</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Monitoring Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: GPS Indicator & Status */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              isMonitoring
                ? status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
                : "bg-ivory-200 text-charcoal-700"
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-charcoal-900">
                Foreground Departure Geofence
              </span>
              {status === "active" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ACTIVE (±{accuracy}m)
                </span>
              )}
              {status === "requesting" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                  ACQUIRING GPS
                </span>
              )}
              {status === "inaccurate" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  LOW ACCURACY (±{accuracy}m)
                </span>
              )}
              {status === "denied" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                  PERMISSION DENIED
                </span>
              )}
              {status === "idle" && (
                <span className="text-[11px] text-stone-400 font-medium">Inactive</span>
              )}
            </div>

            <p className="text-xs text-charcoal-600 mt-0.5">
              {isMonitoring
                ? `Monitoring departure radius (${geofenceRadius}m) · ${readingsCount} GPS fix${readingsCount === 1 ? "" : "es"}`
                : "Monitors belongings distance and triggers calm departure reminders before leaving"}
            </p>
          </div>
        </div>

        {/* Right: Monitoring & Settings Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            title="Configure geofence radius & accuracy"
            aria-label="Geofence settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {notificationPermission !== "granted" && (
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Enable desktop notifications for departure alerts"
            >
              <Bell className="w-3.5 h-3.5 text-stone-500" />
              <span>Enable Alerts</span>
            </button>
          )}

          {isMonitoring ? (
            <button
              type="button"
              onClick={stopMonitoring}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
            >
              <span>Stop GPS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startMonitoring}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 text-sage-200" />
              <span>Start GPS Monitoring</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="mt-3.5 pt-3 border-t border-ivory-200 bg-ivory-50/80 rounded-xl p-3.5 text-xs text-charcoal-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-charcoal-900 block">Departure Radius</span>
              <span className="text-stone-500 text-[11px]">
                Distance before departure alerts trigger (default: 50m)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[25, 50, 100, 150].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setGeofenceRadius(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    geofenceRadius === r
                      ? "bg-forest-700 text-white"
                      : "bg-white border border-ivory-300 text-charcoal-700 hover:bg-ivory-100"
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-ivory-200">
            <div>
              <span className="font-semibold text-charcoal-900 block">Jitter Filter (Readings Count)</span>
              <span className="text-stone-500 text-[11px]">
                Consecutive readings outside boundary before alerting (prevents GPS jitter)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setJitterThreshold(count)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    jitterThreshold === count
                      ? "bg-forest-700 text-white"
                      : "bg-white border border-ivory-300 text-charcoal-700 hover:bg-ivory-100"
                  }`}
                >
                  {count} {count === 1 ? "Reading" : "Readings"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Message if any */}
      {error && (
        <div className="mt-3 pt-3 border-t border-red-200 flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-600 hover:text-red-800 underline text-xs font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Testing Movement Simulator Bar (Allows instant testing without physical travel) */}
      {isMonitoring && (
        <div className="mt-3.5 pt-2.5 border-t border-ivory-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-charcoal-600">
          <div className="flex items-center gap-1.5 font-medium text-stone-500">
            <Footprints className="w-3.5 h-3.5 text-stone-400" />
            <span>Test Displacement Simulator:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => simulateMovement(20)}
              className="px-2 py-0.5 rounded bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 transition-colors"
              title="Simulate walking 20m away"
            >
              +20m
            </button>
            <button
              type="button"
              onClick={() => simulateMovement(60)}
              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold transition-colors"
              title="Simulate stepping 60m away (crosses 50m geofence)"
            >
              +60m (Breach Geofence)
            </button>
            <button
              type="button"
              onClick={() => simulateMovement(100)}
              className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold transition-colors"
              title="Simulate stepping 100m away"
            >
              +100m
            </button>
            <button
              type="button"
              onClick={() => simulateMovement(0)}
              className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Reset position"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Operating Notice Disclaimer */}
      <div className="mt-3 pt-2 border-t border-ivory-200/50 flex items-center gap-1.5 text-[11px] text-stone-400">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>
          Foreground monitoring only. Browsers suspend JavaScript execution in background tabs; background geofencing requires a native companion.
        </span>
      </div>
    </div>
  );
};

