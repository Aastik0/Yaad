import React from "react";
import { ItemObservation, TrackedItem } from "@/types";
import { StatusChip } from "./StatusChip";
import { MapPin, Clock, ShieldCheck, X, Sparkles, AlertCircle } from "lucide-react";

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
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "earlier";
    }
  };

  const getRelativeTime = (isoString: string) => {
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

        {/* Optional scene snapshot preview */}
        {latestObservation?.image_reference && (
          <div className="mt-2 pt-2 border-t border-ivory-200">
            <span className="text-[11px] text-stone-500 font-medium block mb-1">
              Scene snapshot reference:
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={latestObservation.image_reference}
              alt="Snapshot observation"
              className="w-full max-h-40 object-cover rounded-lg border border-ivory-300"
            />
          </div>
        )}
      </div>

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

