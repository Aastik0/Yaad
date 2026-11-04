import React, { useState, useEffect } from "react";
import { TrackedItem, ItemObservation } from "@/types";
import { StatusChip } from "./StatusChip";
import { SecureImage } from "./SecureImage";
import {
  X,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  Check,
  History,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Camera,
} from "lucide-react";
import { generateGoogleMapsUrl, generateAppleMapsUrl, isValidGeoCoordinates } from "@/lib/geo";
import { getItemDummySceneImage } from "@/lib/dummyImages";

interface ItemDetailModalProps {
  isOpen: boolean;
  item: TrackedItem | null;
  observations: ItemObservation[];
  onClose: () => void;
  onUpdateItem: (updated: TrackedItem) => void;
  onDeleteItem: (itemId: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  item,
  observations,
  onClose,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!isOpen || !item) return null;

  const itemObservations = observations.filter(
    (obs) =>
      obs.item_name.toLowerCase() === item.item_name.toLowerCase() ||
      obs.id === item.last_observation_id
  );

  const handleStartEdit = () => {
    setEditedName(item.item_name);
    setEditedCategory(item.category || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) return;
    onUpdateItem({
      ...item,
      item_name: editedName.trim(),
      category: editedCategory.trim() || undefined,
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleStatusChange = (status: TrackedItem["status"]) => {
    onUpdateItem({
      ...item,
      status,
      updated_at: new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete '${item.item_name}' and its observation history?`)) {
      onDeleteItem(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Item Details &amp; History
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Item Main Info */}
          <div className="space-y-3">
            {isEditing ? (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="font-medium text-stone-600 block mb-0.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-ivory-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-medium text-stone-600 block mb-0.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-ivory-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded text-stone-600 hover:bg-ivory-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3.5 py-1.5 rounded bg-forest-700 text-ivory-50 font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
                    {item.category || "Belonging"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleStartEdit}
                      className="p-1.5 rounded hover:bg-ivory-200 text-stone-400 hover:text-charcoal-800 transition-colors"
                      title="Edit item name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1.5 rounded hover:bg-terracotta-50 text-stone-400 hover:text-terracotta-600 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-charcoal-900 mt-1">
                  {item.item_name}
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <StatusChip status={item.status} size="md" />
                </div>

                {/* Original Scene Photograph with Expand */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-forest-700" />
                      <span>Scene Photograph at Observation</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand Photo</span>
                    </button>
                  </div>
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative rounded-2xl overflow-hidden border border-ivory-300 bg-ivory-100 group cursor-pointer shadow-xs hover:border-forest-600 transition-all"
                  >
                    <SecureImage
                      imageReference={item.image_reference || itemObservations[0]?.image_reference}
                      itemCategory={item.category}
                      itemName={item.item_name}
                      alt={`Original scene for ${item.item_name}`}
                      className="w-full max-h-48 object-cover group-hover:scale-[1.01] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-charcoal-950/0 group-hover:bg-charcoal-950/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-charcoal-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Click to view full photo</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Status Toggles */}
          <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 space-y-2">
            <span className="text-xs font-semibold text-charcoal-800 block">
              Update Current Status:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                onClick={() => handleStatusChange("collected")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                  item.status === "collected"
                    ? "bg-forest-700 text-ivory-50 shadow-xs"
                    : "bg-white border border-ivory-300 text-forest-800 hover:bg-forest-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Collected</span>
              </button>

              <button
                onClick={() => handleStatusChange("tracked_unconfirmed")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                  item.status === "tracked_unconfirmed"
                    ? "bg-amber-600 text-ivory-50 shadow-xs"
                    : "bg-white border border-ivory-300 text-amber-900 hover:bg-amber-50"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tracked (Unconfirmed)</span>
              </button>

              <button
                onClick={() => handleStatusChange("possibly_left_behind")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all inline-flex items-center gap-1.5 ${
                  item.status === "possibly_left_behind"
                    ? "bg-terracotta-600 text-ivory-50 shadow-xs"
                    : "bg-white border border-ivory-300 text-terracotta-800 hover:bg-terracotta-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Possibly Left Behind</span>
              </button>
            </div>
          </div>

          {/* Latest Grounded Location */}
          <div className="p-4 bg-white rounded-xl border border-ivory-300 shadow-xs space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block">
              Latest Recorded Observation
            </span>
            <div className="flex items-start gap-2 text-xs text-charcoal-900">
              <MapPin className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
              <span>{item.last_location_description}</span>
            </div>

            {item.last_landmarks && item.last_landmarks.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-stone-500">
                <span>Landmarks:</span>
                {item.last_landmarks.map((lm, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-ivory-100 border border-ivory-200 text-charcoal-700"
                  >
                    {lm}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] text-stone-400 pt-1">
              <Clock className="w-3 h-3" />
              <span>Recorded at {isMounted ? new Date(item.last_observed_at).toLocaleString() : item.last_observed_at.slice(0, 10)}</span>
            </div>

            {/* GPS Location & Radius Tag */}
            {item.coordinates && isValidGeoCoordinates(item.coordinates) ? (
              <div className="mt-2 pt-2 border-t border-ivory-200 text-xs text-charcoal-800 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                  GPS Geofence Origin
                </span>
                <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                  <span className="font-mono text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-100 font-medium">
                    {item.coordinates.latitude.toFixed(6)}° N, {Math.abs(item.coordinates.longitude).toFixed(6)}° W (±{item.coordinates.accuracy || 10}m)
                  </span>
                  <span className="text-stone-500">
                    Radius: {item.geofence_radius_meters || 50}m
                  </span>
                </div>
                {item.coordinates.place_name && (
                  <p className="text-[11px] text-stone-500">
                    Location: {item.coordinates.place_name}
                  </p>
                )}
                {item.coordinates.accuracy && item.coordinates.accuracy > 65 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Low GPS accuracy (±{item.coordinates.accuracy}m). Visual landmarks provide primary grounding.
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1.5">
                  <a
                    href={generateGoogleMapsUrl(
                      item.coordinates.latitude,
                      item.coordinates.longitude,
                      item.item_name
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-forest-700 hover:bg-forest-800 text-white transition-colors"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-sage-200" />
                  </a>
                  <a
                    href={generateAppleMapsUrl(
                      item.coordinates.latitude,
                      item.coordinates.longitude,
                      item.item_name
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-800 hover:bg-stone-900 text-white transition-colors"
                  >
                    <span>Apple Maps</span>
                    <ExternalLink className="w-3 h-3 text-stone-300" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-ivory-200 flex items-center gap-1.5 text-[11px] text-stone-600">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="font-medium text-stone-700">
                  Indoor Landmark Grounded (No GPS recorded)
                </span>
                <span className="text-stone-400">
                  — Navigation relies on visual landmarks
                </span>
              </div>
            )}
          </div>

          {/* Observation History list */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-forest-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-forest-700" />
              Observation Timeline ({itemObservations.length})
            </h3>

            {itemObservations.length === 0 ? (
              <p className="text-xs text-stone-500 italic">
                No archived observation snapshots for this item.
              </p>
            ) : (
              <div className="space-y-2">
                {itemObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className="p-3 bg-ivory-50 rounded-lg border border-ivory-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{isMounted ? new Date(obs.observed_at).toLocaleString() : obs.observed_at.slice(0, 10)}</span>
                      <span className="capitalize font-medium text-forest-800">
                        {obs.confidence} confidence
                      </span>
                    </div>
                    <p className="text-charcoal-800">{obs.description}</p>
                    {obs.image_reference && (
                      <div className="pt-1">
                        <SecureImage
                          imageReference={obs.image_reference}
                          alt="Observation frame"
                          className="w-full max-h-36 object-cover rounded border border-ivory-300"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <Shield className="w-3 h-3 text-forest-700" />
            Private memory record
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>

      {/* High-Resolution Scene Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded scene view for ${item.item_name}`}
          className="fixed inset-0 z-60 bg-charcoal-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-ivory-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-charcoal-900">
                  {item.item_name} — Original Scene Snapshot
                </h4>
                <p className="text-xs text-stone-500">
                  {item.last_location_description} · Recorded at {item.last_observed_at.slice(0, 10)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-charcoal-800 hover:bg-ivory-200 transition-colors cursor-pointer"
                title="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Viewport */}
            <div className="p-4 sm:p-6 bg-charcoal-950/5 flex items-center justify-center overflow-auto max-h-[70vh]">
              <SecureImage
                imageReference={item.image_reference || itemObservations[0]?.image_reference}
                itemCategory={item.category}
                itemName={item.item_name}
                alt={`Original scene for ${item.item_name}`}
                className="w-full max-h-[64vh] object-contain rounded-2xl shadow-lg border border-ivory-200"
              />
            </div>

            {/* Lightbox Footer with Landmark chips */}
            <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-stone-500">Visual Landmarks:</span>
                {item.last_landmarks.map((lm, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-white border border-ivory-300 text-charcoal-800 text-[11px]"
                  >
                    {lm}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-forest-700 text-white font-semibold text-xs hover:bg-forest-800 transition-colors cursor-pointer shrink-0"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

