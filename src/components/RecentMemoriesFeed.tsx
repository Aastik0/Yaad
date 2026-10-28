import React from "react";
import { ItemObservation } from "@/types";
import { History, Camera, Upload, Shield, Trash2 } from "lucide-react";

interface RecentMemoriesFeedProps {
  observations: ItemObservation[];
  onDeleteObservation: (id: string) => void;
}

export const RecentMemoriesFeed: React.FC<RecentMemoriesFeedProps> = ({
  observations,
  onDeleteObservation,
}) => {
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

  return (
    <div className="bg-white rounded-2xl border border-ivory-300 p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
        <div>
          <h2 className="text-base font-semibold text-forest-900 tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-forest-700" />
            Recent Observation History
          </h2>
          <p className="text-xs text-charcoal-700 mt-0.5">
            Historical records stamped at time of capture. Observations do not assert present location.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-stone-500 bg-ivory-100 px-2 py-1 rounded-md">
          <Shield className="w-3 h-3 text-forest-600" />
          <span>Private retention</span>
        </div>
      </div>

      <div className="divide-y divide-ivory-200 mt-2">
        {observations.map((obs) => (
          <div key={obs.id} className="py-4 first:pt-3 last:pb-1 group">
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
                  Recorded at {new Date(obs.observed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Landmarks:{" "}
                  <span className="text-charcoal-700">{obs.landmarks.join(", ")}</span>
                  {obs.coordinates && (
                    <span className="ml-2 font-mono text-[10px] text-forest-700 bg-forest-50 px-1.5 py-0.2 rounded border border-forest-100">
                      📍 {obs.coordinates.latitude}° N, {Math.abs(obs.coordinates.longitude)}° W
                    </span>
                  )}
                </p>
              </div>

              {/* Privacy control: deletion */}
              <button
                onClick={() => onDeleteObservation(obs.id)}
                className="text-stone-400 hover:text-terracotta-600 p-1.5 rounded hover:bg-terracotta-50 transition-colors shrink-0"
                title="Delete observation record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

