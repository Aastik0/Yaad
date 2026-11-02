"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  MapPin,
  ExternalLink,
  CheckCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  X,
  Navigation,
} from "lucide-react";
import type { NavigationResolutionResult } from "../lib/geo.ts";

export interface NavigationHandoffCardProps {
  resolution: NavigationResolutionResult;
  onMarkCollected?: (id: string) => void;
  onClose: () => void;
  className?: string;
}

export const NavigationHandoffCard: React.FC<NavigationHandoffCardProps> = ({
  resolution,
  onMarkCollected,
  onClose,
  className = "",
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { type, item, headline, locationDescription, landmarks, coordinates, googleMapsUrl, appleMapsUrl, disclaimer } =
    resolution;

  if (type === "NOT_FOUND") {
    return (
      <div
        className={`bg-stone-50 border border-stone-300 rounded-2xl p-5 shadow-xs transition-all ${className}`}
        data-testid="navigation-not-found-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-stone-200 text-stone-700 mt-0.5 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Navigation Sighting Not Found
              </span>
              <h3 className="text-base font-semibold text-charcoal-900 mt-0.5">
                {headline}
              </h3>
              <p className="text-sm text-charcoal-700 mt-1">
                {locationDescription}
              </p>
              <p className="text-xs text-stone-500 mt-2 italic">
                {disclaimer}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1"
            title="Dismiss navigation card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border-2 border-purple-200 rounded-2xl p-5 sm:p-6 shadow-sm transition-all ${className}`}
      data-testid="navigation-handoff-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-purple-100 text-purple-700 shrink-0 mt-0.5">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
                Last Recorded Sighting
              </span>
              {item?.category && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                  {item.category}
                </span>
              )}
              {type === "HAS_COORDINATES" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  GPS RECORDED
                </span>
              ) : type === "UNCERTAIN_COORDINATES" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  COARSE GPS (&gt;80m)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  LANDMARK ONLY
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-charcoal-900 mt-1">
              {item?.item_name || headline}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-charcoal-600 mt-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>
                Observed:{" "}
                {isMounted && item?.last_observed_at
                  ? new Date(item.last_observed_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Recently"}
              </span>
              {coordinates?.place_name && (
                <>
                  <span className="text-stone-300">·</span>
                  <span>{coordinates.place_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          title="Dismiss navigation card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grounded Location Description */}
      <div className="mt-4 p-3.5 rounded-xl bg-ivory-50 border border-ivory-200 text-sm text-charcoal-900">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-charcoal-900">Last Seen Location: </span>
            <span>{locationDescription}</span>
          </div>
        </div>

        {landmarks && landmarks.length > 0 && (
          <div className="mt-2 pl-6 flex flex-wrap items-center gap-1.5 text-xs text-charcoal-600">
            <span className="font-medium text-stone-500">Visual Landmarks:</span>
            {landmarks.map((lm, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white border border-ivory-300 text-charcoal-800 text-[11px]"
              >
                {lm}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Coordinates / Map Handoff Actions */}
      {type === "HAS_COORDINATES" && coordinates && (
        <div className="mt-4 pt-4 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-charcoal-600">
            <span className="font-semibold text-charcoal-800">Destination: </span>
            <span className="font-mono text-[11px] text-stone-600">
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)} (±{coordinates.accuracy || 10}m)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-all shadow-xs"
                data-testid="google-maps-button"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-sage-200" />
              </a>
            )}

            {appleMapsUrl && (
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white transition-all shadow-xs"
                data-testid="apple-maps-button"
              >
                <span>Apple Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-300" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Landmark Fallback Banner if Coordinates Absent */}
      {type === "LANDMARK_ONLY" && (
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Indoor Landmark Fallback: </span>
            <span>
              GPS coordinates were not recorded for this indoor sighting. Please check the visual landmarks described above.
            </span>
          </div>
        </div>
      )}

      {/* Coarse / Uncertain Coordinates Banner (>80m) */}
      {type === "UNCERTAIN_COORDINATES" && coordinates && (
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Coarse GPS Accuracy (±{coordinates.accuracy}m): </span>
            <span>
              Location accuracy exceeds the 80m navigation threshold. Map directions are disabled to prevent disorientation; please rely on the visual scene landmarks described above.
            </span>
          </div>
        </div>
      )}

      {/* User Actions & Truthful Disclaimer */}
      <div className="mt-4 pt-3.5 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 italic">
          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>{disclaimer}</span>
        </div>

        {item && onMarkCollected && (
          <button
            type="button"
            onClick={() => {
              onMarkCollected(item.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors self-end sm:self-center shrink-0 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>I found my {item.item_name}</span>
          </button>
        )}
      </div>
    </div>
  );
};

