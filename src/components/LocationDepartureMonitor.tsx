"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  ShieldAlert,
  Bell,
  Sliders,
  AlertTriangle,
  CheckCheck,
  Footprints,
  Info,
  X,
  ChevronDown,
  ChevronUp,
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
import { SecureImage } from "./SecureImage";

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
    accuracy,
    readingsCount,
    isMonitoring,
    error,
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
      className={`space-y-3 ${className}`}
      data-testid="location-departure-monitor"
    >
      {/* High-Priority Active Departure Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.item.id}
              className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm"
              data-testid="departure-alert-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-amber-300 bg-amber-100 shrink-0 shadow-2xs mt-0.5">
                    <SecureImage
                      imageReference={alert.item.image_reference}
                      itemCategory={alert.item.category}
                      itemName={alert.item.item_name}
                      alt={alert.item.item_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-amber-200 text-amber-900 flex items-center justify-center border border-white">
                      <ShieldAlert className="w-3 h-3 text-amber-900" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Departure Alert
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-950">
                        {alert.distanceMeters}m away
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-semibold text-charcoal-900 mt-1">
                      Did you leave your {alert.item.item_name} at {alert.item.last_location_description}?
                    </h4>
                    <p className="text-xs text-charcoal-700 mt-1">
                      You walked past your {geofenceRadius}m departure boundary.
                      {alert.item.last_landmarks.length > 0 && (
                        <span> Visible landmarks: {alert.item.last_landmarks.join(", ")}.</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.item.id)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-amber-100 transition-colors"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-3.5 pt-3 border-t border-amber-200 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCollectItem(alert.item.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <CheckCheck className="w-4 h-4 text-sage-200" />
                  <span>I have my {alert.item.item_name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(alert.item.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <span>Dismiss</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calm Ambient Departure Guard Status Bar */}
      <div className="bg-white/80 border border-ivory-300 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Ambient Status */}
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMonitoring && status === "active"
                  ? "bg-emerald-500 animate-pulse"
                  : isMonitoring && status === "requesting"
                  ? "bg-amber-500 animate-pulse"
                  : isMonitoring
                  ? "bg-amber-400"
                  : "bg-stone-300"
              }`}
            />
            <div>
              <span className="font-semibold text-charcoal-900">
                Departure Guard:{" "}
                {isMonitoring
                  ? status === "active"
                    ? `Active (${geofenceRadius}m radius)`
                    : status === "requesting"
                    ? "Acquiring GPS..."
                    : status === "inaccurate"
                    ? `Low GPS Accuracy (±${accuracy}m)`
                    : "Active"
                  : "Standby"}
              </span>
              <span className="text-stone-400 text-[11px] ml-2 hidden sm:inline">
                {isMonitoring
                  ? `Monitors uncollected items before you leave (${readingsCount} GPS checks)`
                  : "Ready to guard against forgotten belongings"}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {notificationPermission !== "granted" && (
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 border border-forest-200 transition-colors cursor-pointer"
                title="Enable desktop notifications for departure reminders"
              >
                <Bell className="w-3.5 h-3.5 text-forest-600" />
                <span>Enable Alerts</span>
              </button>
            )}

            {isMonitoring ? (
              <button
                type="button"
                onClick={stopMonitoring}
                className="px-2.5 py-1 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={startMonitoring}
                className="px-2.5 py-1 rounded-lg text-forest-800 bg-forest-50 hover:bg-forest-100 border border-forest-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Start Guard
              </button>
            )}

            {/* Toggle Advanced Developer / GPS Settings */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs transition-colors cursor-pointer"
              title="Toggle geofence parameters & simulation tools"
              aria-label="Toggle geofence parameters"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Settings</span>
              {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Controls Drawer (Cleanly hidden by default) */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-ivory-200 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-charcoal-900 block">Departure Radius</span>
                <span className="text-stone-400 text-[11px]">
                  Alert threshold distance from recorded location
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[25, 50, 100, 150].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setGeofenceRadius(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      geofenceRadius === r
                        ? "bg-forest-700 text-white font-semibold"
                        : "bg-ivory-100 hover:bg-ivory-200 text-charcoal-700"
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-ivory-100">
              <div>
                <span className="font-semibold text-charcoal-900 block">Jitter Buffer</span>
                <span className="text-stone-400 text-[11px]">
                  Consecutive readings required to confirm departure
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setJitterThreshold(count)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      jitterThreshold === count
                        ? "bg-forest-700 text-white font-semibold"
                        : "bg-ivory-100 hover:bg-ivory-200 text-charcoal-700"
                    }`}
                  >
                    {count} {count === 1 ? "Fix" : "Fixes"}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Displacement Simulator */}
            {isMonitoring && (
              <div className="pt-2.5 border-t border-ivory-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                  <Footprints className="w-3.5 h-3.5 text-stone-400" />
                  <span>Test Step Simulator:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => simulateMovement(20)}
                    className="px-2 py-0.5 rounded-md bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 transition-colors cursor-pointer"
                  >
                    +20m
                  </button>
                  <button
                    type="button"
                    onClick={() => simulateMovement(60)}
                    className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold transition-colors cursor-pointer"
                  >
                    +60m (Breach)
                  </button>
                  <button
                    type="button"
                    onClick={() => simulateMovement(100)}
                    className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold transition-colors cursor-pointer"
                  >
                    +100m
                  </button>
                  <button
                    type="button"
                    onClick={() => simulateMovement(0)}
                    className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-ivory-100 flex items-center gap-1.5 text-[11px] text-stone-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Foreground monitoring runs while this browser tab is active. Meta Ray-Ban companion bridges background tracking.
              </span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mt-2.5 pt-2.5 border-t border-red-200 flex items-center justify-between gap-2 text-xs text-red-700">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-red-700 hover:text-red-900 underline text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
