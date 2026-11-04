"use client";

import React, { useState, useEffect } from "react";
import { ItemObservation } from "@/types";
import { History, Camera, Upload, Shield, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { isValidGeoCoordinates } from "@/lib/geo";

interface RecentMemoriesFeedProps {
  observations: ItemObservation[];
  onDeleteObservation: (id: string) => void;
}

export const RecentMemoriesFeed: React.FC<RecentMemoriesFeedProps> = ({
  observations,
  onDeleteObservation,
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getSourceIcon = (source: ItemObservation["source"]) => {
    switch (source) {
      case "browser_camera":
        return <Camera className="w-3.5 h-3.5 text-forest-700" />;
      case "browser_upload":
        return <Upload className="w-3.5 h-3.5 text-sage-600" />;
      default:
        return <History className="w-3.5 h-3.5 text-stone-500" />;
    }
  };

  const getSourceLabel = (source: ItemObservation["source"]) => {
    switch (source) {
      case "browser_camera":
        return "Camera capture";
      case "browser_upload":
        return "Photo upload";
      default:
        return "Manual entry";
    }
  };

  const getConfidenceBadge = (confidence: ItemObservation["confidence"]) => {
    const map = {
      high: "bg-forest-50 text-forest-700 border-forest-200",
      medium: "bg-amber-50 text-amber-800 border-amber-200",
      low: "bg-terracotta-50 text-terracotta-800 border-terracotta-200",
      unknown: "bg-stone-50 text-stone-600 border-stone-200",
    };
    return (
      <span
        className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${
          map[confidence] || map.unknown
        }`}
      >
        {confidence} confidence
      </span>
    );
  };

  if (observations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 rounded-2xl border border-ivory-300 p-5 shadow-2xs transition-all">
      {/* Header with Collapsible Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-forest-700 group-hover:bg-forest-50 transition-colors">
            <History className="w-4 h-4 text-forest-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-forest-900 group-hover:text-forest-700 transition-colors">
              Observation History ({observations.length})
            </h3>
            <p className="text-xs text-stone-500">
              Historical visual sighting logs stamped at capture time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-500 bg-ivory-100 px-2 py-0.5 rounded-lg">
            <Shield className="w-3 h-3 text-forest-600" />
            <span>Private</span>
          </div>
          <div className="p-1 rounded-lg text-stone-400 group-hover:text-stone-700 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded List */}
      {isExpanded && (
        <div className="divide-y divide-ivory-200 mt-4 pt-3 border-t border-ivory-200 animate-fadeIn">
          {observations.map((obs) => (
            <div key={obs.id} className="py-3.5 first:pt-1 last:pb-1 group">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-forest-900">
                      {obs.item_name}
                    </span>
                    {getConfidenceBadge(obs.confidence)}
                    <div className="inline-flex items-center gap-1 text-xs text-stone-500 bg-ivory-50 px-2 py-0.5 rounded border border-ivory-200">
                      {getSourceIcon(obs.source)}
                      <span>{getSourceLabel(obs.source)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-800 leading-relaxed">
                    {obs.description}
                  </p>

                  <p className="text-[11px] text-stone-500">
                    {isMounted
                      ? `Recorded at ${new Date(obs.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Recorded recently"}{" "}
                    · Landmarks: <span className="text-charcoal-700">{obs.landmarks.join(", ") || "None"}</span>
                    {obs.coordinates && isValidGeoCoordinates(obs.coordinates) ? (
                      <span className="ml-2 font-mono text-[10px] text-forest-700 bg-forest-50 px-1.5 py-0.5 rounded border border-forest-100">
                        📍 GPS Grounded (±{obs.coordinates.accuracy || 10}m)
                      </span>
                    ) : (
                      <span className="ml-2 text-[10px] text-stone-500 bg-ivory-100 px-1.5 py-0.5 rounded border border-ivory-200">
                        📍 Indoor Landmark Grounded
                      </span>
                    )}
                  </p>
                </div>

                {/* Privacy control: deletion */}
                <button
                  type="button"
                  onClick={() => onDeleteObservation(obs.id)}
                  className="text-stone-400 hover:text-terracotta-600 p-1.5 rounded-lg hover:bg-terracotta-50 transition-colors shrink-0 cursor-pointer"
                  title="Delete observation record"
                  aria-label="Delete observation record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
