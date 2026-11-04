import React, { useState, useEffect } from "react";
import { ItemObservation, TrackedItem } from "@/types";
import { StatusChip } from "./StatusChip";
import { SecureImage } from "./SecureImage";
import {
  MapPin,
  Clock,
  ShieldCheck,
  X,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { isValidGeoCoordinates, generateCrossPlatformMapUrl } from "@/lib/geo";
import { getItemDummySceneImage } from "@/lib/dummyImages";

interface RecallAnswerCardProps {
  item: TrackedItem;
  latestObservation?: ItemObservation;
  query: string;
  onClose: () => void;
}

export const RecallAnswerCard: React.FC<RecallAnswerCardProps> = ({
  item,
  latestObservation,
  query,
  onClose,
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isImageExpanded, setIsImageExpanded] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatTime = (isoString: string) => {
    if (!isMounted) return "earlier";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "earlier";
    }
  };

  const getRelativeTime = (isoString: string) => {
    if (!isMounted) return "recently";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
      if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
      return `${Math.round(hours / 24)} days ago`;
    } catch {
      return "recently";
    }
  };

  const hasValidCoordinates = isValidGeoCoordinates(item.coordinates);
  const mapUrl =
    hasValidCoordinates && item.coordinates
      ? generateCrossPlatformMapUrl(
          item.coordinates.latitude,
          item.coordinates.longitude,
          item.item_name
        )
      : null;

  const effectiveImageRef =
    latestObservation?.image_reference ||
    item.image_reference ||
    getItemDummySceneImage(item.category, item.item_name);

  return (
    <div className="bg-forest-50/60 border border-forest-200 rounded-2xl p-5 sm:p-6 shadow-sm relative transition-all">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-charcoal-800 hover:bg-forest-100/60 transition-colors"
        title="Dismiss recall answer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-forest-700 text-ivory-50 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-sage-200" />
        </div>
        <div>
          <span className="text-xs font-semibold text-forest-900 uppercase tracking-wider block">
            Grounded Recall
          </span>
          <span className="text-[11px] text-stone-500">
            Matched query: &ldquo;{query}&rdquo;
          </span>
        </div>
      </div>

      {/* Main Grounded Statement */}
      <div className="bg-white rounded-xl p-4 border border-forest-100 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-forest-900">
            {item.item_name}
          </h3>
          <StatusChip status={item.status} size="sm" />
        </div>

        <p className="text-sm text-charcoal-900 leading-relaxed">
          Your <strong>{item.item_name}</strong> was last recorded{" "}
          <span className="text-forest-800 font-medium underline decoration-sage-300 underline-offset-2">
            {item.last_location_description}
          </span>{" "}
          at {formatTime(item.last_observed_at)} ({getRelativeTime(item.last_observed_at)}).
        </p>

        {/* Landmarks */}
        {item.last_landmarks && item.last_landmarks.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs text-charcoal-700">
            <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
            <span className="font-medium text-stone-500">Nearby landmarks:</span>
            {item.last_landmarks.map((lm, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-ivory-100 border border-ivory-300 text-[11px] text-charcoal-800"
              >
                {lm}
              </span>
            ))}
          </div>
        )}

        {/* GPS Coordinates Origin & Open in Maps Action */}
        {hasValidCoordinates && item.coordinates && mapUrl && (
          <div className="pt-2 border-t border-forest-100 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-100 font-medium">
                  📍 {item.coordinates.latitude.toFixed(6)}° N, {Math.abs(item.coordinates.longitude).toFixed(6)}° W (±{item.coordinates.accuracy || 10}m)
                </span>
                <span className="text-stone-500">
                  (Geofence: {item.geofence_radius_meters || 50}m)
                </span>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-all shadow-xs shrink-0"
                data-testid="recall-open-in-maps-button"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-sage-200" />
              </a>
            </div>

            {/* Low GPS accuracy warning */}
            {item.coordinates.accuracy && item.coordinates.accuracy > 65 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Low GPS accuracy (±{item.coordinates.accuracy}m). Visual scene landmarks above provide primary grounding.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Truthful indoor landmark representation when GPS absent */}
        {!hasValidCoordinates && (
          <div className="pt-2 border-t border-forest-100 flex items-center gap-1.5 text-[11px] text-stone-600">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-medium text-stone-700">
              Indoor Landmark Grounded (No GPS recorded)
            </span>
            <span className="text-stone-400">
              — Grounding relies truthfully on visual landmarks
            </span>
          </div>
        )}

        {/* Grounded Scene Snapshot Preview with Expand capability */}
        {effectiveImageRef && (
          <div className="mt-3 pt-3 border-t border-forest-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-stone-600 font-semibold flex items-center gap-1.5">
                <span>Original scene photograph:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsImageExpanded(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900 hover:underline cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expand Scene</span>
              </button>
            </div>
            <div
              onClick={() => setIsImageExpanded(true)}
              className="relative group cursor-pointer rounded-xl overflow-hidden border border-ivory-300 bg-ivory-100 hover:border-forest-600 transition-all shadow-2xs"
            >
              <SecureImage
                imageReference={effectiveImageRef}
                alt={`Original captured scene for ${item.item_name}`}
                className="w-full max-h-48 object-cover group-hover:scale-[1.01] transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-forest-950/0 group-hover:bg-forest-950/15 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 bg-charcoal-900/75 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 transition-opacity">
                  <Maximize2 className="w-3 h-3 text-sage-200" />
                  <span>Click to expand</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Scene Lightbox Modal */}
      {isImageExpanded && effectiveImageRef && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded scene view for ${item.item_name}`}
          className="fixed inset-0 z-60 bg-charcoal-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsImageExpanded(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-ivory-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 bg-ivory-50 border-b border-ivory-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-forest-900">
                  {item.item_name} — Original Scene Snapshot
                </h4>
                <p className="text-[11px] text-stone-500">
                  Captured at {formatTime(item.last_observed_at)} · {item.last_location_description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImageExpanded(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
                title="Close expanded view"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Body with full uncropped image */}
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-charcoal-900/5 min-h-[300px]">
              <SecureImage
                imageReference={effectiveImageRef}
                alt={`Full uncropped scene snapshot for ${item.item_name}`}
                className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-sm"
              />
            </div>

            {/* Lightbox Footer with Context & Landmarks */}
            <div className="px-5 py-3 bg-ivory-50 border-t border-ivory-200 flex items-center justify-between text-xs text-charcoal-700 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                <span className="font-medium text-stone-500">Visual Anchors:</span>
                {item.last_landmarks && item.last_landmarks.length > 0 ? (
                  item.last_landmarks.map((lm, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-white border border-ivory-300 text-[11px] text-charcoal-800"
                    >
                      {lm}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-400">None specified</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsImageExpanded(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-forest-700 hover:bg-forest-800 text-white transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Truthful memory disclaimer banner */}
      <div className="mt-3 flex items-start gap-2 text-xs text-stone-600">
        <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
        <span>
          <strong>Truthful memory principle:</strong> This reflects what was observed at{" "}
          {formatTime(item.last_observed_at)}. Yaad never claims an item is definitely still present.
        </span>
      </div>
    </div>
  );
};

