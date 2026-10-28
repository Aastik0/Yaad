import React, { useState } from "react";
import { TrackedItem, TrackedItemStatus } from "@/types";
import { StatusChip } from "./StatusChip";
import { MapPin, Clock, Check, AlertCircle, RefreshCw } from "lucide-react";

interface TrackedBelongingsSectionProps {
  items: TrackedItem[];
  onMarkCollected: (id: string) => void;
  onMarkUnconfirmed: (id: string) => void;
  onResolve: (id: string) => void;
  onSelectItem?: (item: TrackedItem) => void;
  searchFilter: string;
}

export const TrackedBelongingsSection: React.FC<TrackedBelongingsSectionProps> = ({
  items,
  onMarkCollected,
  onMarkUnconfirmed,
  onResolve,
  onSelectItem,
  searchFilter,
}) => {
  const [statusFilter, setStatusFilter] = useState<"all" | TrackedItemStatus>("all");

  const filteredItems = items.filter((item) => {
    // Search query match
    if (searchFilter.trim().length > 0) {
      const q = searchFilter.toLowerCase();
      const match =
        item.item_name.toLowerCase().includes(q) ||
        item.last_location_description.toLowerCase().includes(q) ||
        item.last_landmarks.some((l) => l.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter match
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.round(hours / 24)}d ago`;
    } catch {
      return "recently";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forest-900 tracking-tight">
            Tracked Belongings
          </h2>
          <p className="text-xs text-charcoal-700">
            Items registered with confirmed scene observations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: "All Items" },
              { id: "tracked_unconfirmed", label: "Unconfirmed" },
              { id: "collected", label: "Collected" },
              { id: "possibly_left_behind", label: "Left Behind" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-forest-700 text-ivory-50 shadow-xs"
                  : "bg-ivory-50 text-charcoal-700 hover:bg-ivory-200 border border-ivory-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Belongings Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-ivory-300 text-charcoal-700">
          <p className="text-sm font-medium">No items match your criteria.</p>
          <p className="text-xs mt-1 text-stone-500">
            Try adjusting your search query or tracking a new belonging above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                item.status === "possibly_left_behind"
                  ? "border-terracotta-200 bg-terracotta-50/20"
                  : item.status === "tracked_unconfirmed"
                  ? "border-amber-200/90"
                  : "border-ivory-300"
              }`}
            >
              <div
                className="cursor-pointer"
                onClick={() => onSelectItem && onSelectItem(item)}
              >
                {/* Item header: Category & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                    {item.category || "Belonging"}
                  </span>
                  <StatusChip status={item.status} size="sm" />
                </div>

                {/* Item Name */}
                <h3 className="text-base font-semibold text-forest-900 mt-2 hover:text-forest-700 transition-colors">
                  {item.item_name}
                </h3>

                {/* Grounded Location Description */}
                <div className="mt-3 flex items-start gap-2 text-xs text-charcoal-800 leading-relaxed bg-ivory-50 p-2.5 rounded-lg border border-ivory-200">
                  <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-stone-500 block text-[10px] uppercase">
                      Last recorded observation
                    </span>
                    <span>{item.last_location_description}</span>
                  </div>
                </div>

                {/* Landmarks */}
                {item.last_landmarks && item.last_landmarks.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-stone-500">Landmarks:</span>
                    {item.last_landmarks.map((lm, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-ivory-100 border border-ivory-300 text-[11px] text-charcoal-700"
                      >
                        {lm}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Observed Time & Quick Actions */}
              <div className="mt-4 pt-3 border-t border-ivory-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-stone-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(item.last_observed_at)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {item.status === "tracked_unconfirmed" && (
                    <button
                      onClick={() => onMarkCollected(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-forest-50 hover:bg-forest-100 text-forest-800 font-medium text-xs border border-forest-200 transition-colors"
                      title="Mark as collected by user"
                    >
                      <Check className="w-3 h-3 text-forest-600" />
                      Mark Collected
                    </button>
                  )}

                  {item.status === "possibly_left_behind" && (
                    <button
                      onClick={() => onResolve(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-800 font-medium text-xs border border-terracotta-200 transition-colors"
                      title="Resolve reminder"
                    >
                      <AlertCircle className="w-3 h-3 text-terracotta-600" />
                      Resolve Alert
                    </button>
                  )}

                  {item.status === "collected" && (
                    <button
                      onClick={() => onMarkUnconfirmed(item.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-stone-500 hover:text-stone-700 text-xs transition-colors"
                      title="Reset tracking status"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

