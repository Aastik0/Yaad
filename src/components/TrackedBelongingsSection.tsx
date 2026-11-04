"use client";

import React, { useState, useEffect } from "react";
import { TrackedItem, TrackedItemStatus } from "@/types";
import { StatusChip } from "./StatusChip";
import { SecureImage } from "./SecureImage";
import {
  MapPin,
  Clock,
  Check,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Key,
  Wallet,
  Glasses,
  Laptop,
  Smartphone,
  Headphones,
  Luggage,
  Watch,
  Book,
  Package,
  ExternalLink,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { isValidGeoCoordinates, generateCrossPlatformMapUrl } from "@/lib/geo";

interface TrackedBelongingsSectionProps {
  items: TrackedItem[];
  onMarkCollected: (id: string) => void;
  onMarkUnconfirmed: (id: string) => void;
  onResolve: (id: string) => void;
  onSelectItem?: (item: TrackedItem) => void;
  searchFilter: string;
}

function getCategoryIconConfig(category?: string, name?: string) {
  const combined = `${category || ""} ${name || ""}`.toLowerCase();
  if (combined.includes("key") || combined.includes("fob")) {
    return { icon: Key, color: "text-amber-700", bg: "bg-amber-100", label: "Keys" };
  }
  if (combined.includes("wallet") || combined.includes("purse") || combined.includes("card")) {
    return { icon: Wallet, color: "text-emerald-700", bg: "bg-emerald-100", label: "Wallet" };
  }
  if (combined.includes("glass") || combined.includes("spectacle") || combined.includes("shade")) {
    return { icon: Glasses, color: "text-indigo-700", bg: "bg-indigo-100", label: "Eyewear" };
  }
  if (combined.includes("laptop") || combined.includes("macbook") || combined.includes("computer")) {
    return { icon: Laptop, color: "text-blue-700", bg: "bg-blue-100", label: "Computing" };
  }
  if (combined.includes("phone") || combined.includes("iphone") || combined.includes("mobile")) {
    return { icon: Smartphone, color: "text-sky-700", bg: "bg-sky-100", label: "Phone" };
  }
  if (combined.includes("headphone") || combined.includes("airpod") || combined.includes("earbud")) {
    return { icon: Headphones, color: "text-purple-700", bg: "bg-purple-100", label: "Audio" };
  }
  if (combined.includes("bag") || combined.includes("backpack") || combined.includes("tote") || combined.includes("luggage")) {
    return { icon: Luggage, color: "text-rose-700", bg: "bg-rose-100", label: "Bag" };
  }
  if (combined.includes("watch") || combined.includes("tracker")) {
    return { icon: Watch, color: "text-teal-700", bg: "bg-teal-100", label: "Watch" };
  }
  if (combined.includes("book") || combined.includes("journal") || combined.includes("notebook")) {
    return { icon: Book, color: "text-amber-800", bg: "bg-amber-100", label: "Notebook" };
  }
  return { icon: Package, color: "text-forest-700", bg: "bg-forest-100", label: category || "Belonging" };
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
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (!isMounted) {
      return "recently";
    }
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

  const filterTabs = [
    { id: "all", label: "All Items", icon: Sparkles },
    { id: "tracked_unconfirmed", label: "Unconfirmed", icon: Clock },
    { id: "collected", label: "Collected", icon: CheckCircle2 },
    { id: "possibly_left_behind", label: "Left Behind", icon: AlertTriangle },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Tracked Belongings
          </h2>
          <p className="text-xs text-charcoal-600 mt-0.5">
            Confirmed items grounded to physical landmarks with departure boundaries.
          </p>
        </div>

        {/* Filter Pills with Icons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-forest-700 text-white shadow-xs font-semibold"
                    : "bg-white text-charcoal-700 hover:bg-ivory-100 border border-ivory-300"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Belongings Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-ivory-300 text-charcoal-700 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-ivory-100 flex items-center justify-center mx-auto text-stone-400">
            <Sparkles className="w-5 h-5 text-forest-600" />
          </div>
          <p className="text-sm font-semibold text-charcoal-900">No items match your criteria.</p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search query or tap &ldquo;Remember Belongings&rdquo; above to record a new item.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const catConfig = getCategoryIconConfig(item.category, item.item_name);
            const CategoryIcon = catConfig.icon;
            const hasValidCoords = isValidGeoCoordinates(item.coordinates);
            const mapUrl =
              hasValidCoords && item.coordinates
                ? generateCrossPlatformMapUrl(
                    item.coordinates.latitude,
                    item.coordinates.longitude,
                    item.item_name
                  )
                : null;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between hover:shadow-sm ${
                  item.status === "possibly_left_behind"
                    ? "border-rose-300 bg-rose-50/20"
                    : item.status === "tracked_unconfirmed"
                    ? "border-amber-200"
                    : "border-ivory-300"
                }`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => onSelectItem && onSelectItem(item)}
                >
                  {/* Item header: Category icon badge, photo thumbnail & status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Photo Thumbnail or Category Icon Box */}
                      {item.image_reference ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-ivory-200 bg-ivory-100 shrink-0 group">
                          <SecureImage
                            imageReference={item.image_reference}
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-md ${catConfig.bg} ${catConfig.color} flex items-center justify-center shadow-xs border border-white`}
                            title={catConfig.label}
                          >
                            <CategoryIcon className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-xl ${catConfig.bg} ${catConfig.color} flex items-center justify-center shrink-0 shadow-2xs border border-ivory-200`}
                          title={catConfig.label}
                        >
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">
                            {catConfig.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-charcoal-900 hover:text-forest-700 transition-colors">
                          {item.item_name}
                        </h3>
                      </div>
                    </div>

                    <StatusChip status={item.status} size="sm" />
                  </div>

                  {/* Grounded Location Description */}
                  <div className="mt-3.5 flex items-start gap-2.5 text-xs text-charcoal-800 leading-relaxed bg-ivory-50 p-3 rounded-xl border border-ivory-200">
                    <MapPin className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-stone-500 block text-[10px] uppercase tracking-wider">
                        Last Recorded Observation
                      </span>
                      <span className="font-medium text-charcoal-900 mt-0.5 block">{item.last_location_description}</span>

                      {/* Coordinates Indicator */}
                      {hasValidCoords && item.coordinates ? (
                        <div className="mt-2 pt-2 border-t border-ivory-200 flex items-center justify-between text-[11px] text-stone-600 flex-wrap gap-1">
                          <span className="text-[10px] text-forest-800 font-semibold bg-forest-50 px-2 py-0.5 rounded-md border border-forest-100">
                            📍 GPS Grounded (±{item.coordinates.accuracy || 10}m)
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Radius: {item.geofence_radius_meters || 50}m
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-ivory-200 flex items-center gap-1.5 text-[10px] text-stone-500">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>Indoor Landmark Grounded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Landmarks */}
                  {item.last_landmarks && item.last_landmarks.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-stone-400 font-medium">Landmarks:</span>
                      {item.last_landmarks.map((lm, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-ivory-100 border border-ivory-200 text-[11px] text-charcoal-700 font-medium"
                        >
                          {lm}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: Observed Time & Quick Actions */}
                <div className="mt-4 pt-3 border-t border-ivory-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{formatRelativeTime(item.last_observed_at)}</span>
                  </div>

                  {/* Quick Action Icons & Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Map Link Icon */}
                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-forest-700 hover:bg-forest-50 transition-colors cursor-pointer"
                        title="View coordinates on map"
                        aria-label="View on map"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* View Details Icon */}
                    {onSelectItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-forest-700 hover:bg-forest-50 transition-colors cursor-pointer"
                        title="Inspect memory details"
                        aria-label="Inspect details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Status Action Button */}
                    {item.status === "tracked_unconfirmed" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkCollected(item.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                        title="Mark as collected by user"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Mark Collected</span>
                      </button>
                    )}

                    {item.status === "possibly_left_behind" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(item.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                        title="Resolve reminder"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Resolve Alert</span>
                      </button>
                    )}

                    {item.status === "collected" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkUnconfirmed(item.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-ivory-100 text-xs font-medium transition-colors cursor-pointer"
                        title="Reset tracking status"
                      >
                        <RefreshCw className="w-3 h-3 text-stone-400" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
