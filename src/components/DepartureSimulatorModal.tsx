import React, { useState, useEffect } from "react";
import { TrackedItem } from "@/types";
import {
  LogOut,
  X,
  AlertTriangle,
  Check,
  ShieldAlert,
  Volume2,
  VolumeX,
  CheckCheck,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  Radio,
  Sliders,
} from "lucide-react";
import { speakCalmReminder, stopSpeech } from "@/lib/speech";

interface DepartureSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  unconfirmedItems: TrackedItem[];
  onMarkCollected: (id: string) => void;
  onMarkLeftBehind: (id: string) => void;
  onResolve?: (id: string) => void;
}

export const DepartureSimulatorModal: React.FC<DepartureSimulatorModalProps> = ({
  isOpen,
  onClose,
  unconfirmedItems,
  onMarkCollected,
  onMarkLeftBehind,
  onResolve,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Radius & GPS distance simulation state
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number>(50);
  const [simulatedDistanceMeters, setSimulatedDistanceMeters] = useState<number>(75);
  const isOutsideRadius = simulatedDistanceMeters > geofenceRadiusMeters;

  // Stop speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Primary mapped location from items
  const primaryCoords = unconfirmedItems[0]?.coordinates || {
    latitude: 37.7749,
    longitude: -122.4194,
    place_name: "Mapped Origin",
  };

  // Generate calm spoken sentence
  const generateSpokenSummary = (distance = simulatedDistanceMeters) => {
    if (unconfirmedItems.length === 0) {
      return "All tracked belongings have been confirmed as collected. You are good to go.";
    }

    const itemsSummary = unconfirmedItems
      .map((item) => `${item.item_name}, last recorded ${item.last_location_description}`)
      .join(". Also, ");

    return `Meta notice: You have stepped ${distance} meters away from your mapped belongings. You have ${
      unconfirmedItems.length
    } unconfirmed item${
      unconfirmedItems.length > 1 ? "s" : ""
    }: ${itemsSummary}. Did you remember to pick them up?`;
  };

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      const text = generateSpokenSummary();
      const success = speakCalmReminder(text);
      if (success) {
        setIsSpeaking(true);
      }
    }
  };

  // Auto-trigger speech when user slides past the geofence radius boundary
  const handleDistanceSliderChange = (newDistance: number) => {
    setSimulatedDistanceMeters(newDistance);
    if (newDistance > geofenceRadiusMeters && !isOutsideRadius && unconfirmedItems.length > 0) {
      speakCalmReminder(generateSpokenSummary(newDistance));
      setIsSpeaking(true);
    }
  };

  const handleClose = () => {
    stopSpeech();
    setIsSpeaking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-forest-900">
                  Location Radius &amp; Departure Simulator
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800">
                  GPS Geofence
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Simulating Meta Glasses departure alerts when stepping outside mapped radius
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Dementia & Cognitive Independence Mission Card */}
          <div className="p-3.5 rounded-xl bg-forest-50/70 border border-forest-200 text-xs text-charcoal-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-forest-900 font-semibold">
              <Heart className="w-4 h-4 text-forest-700" />
              <span>Dementia Care &amp; Memory Independence Vision</span>
            </div>
            <p className="text-[11px] text-charcoal-700 leading-relaxed">
              For people with dementia, mild cognitive impairment, or memory loss, leaving essential items creates severe disorientation. By mapping belongings to GPS coordinates and announcing departures, Yaad gives users independence and security.
            </p>
          </div>

          {/* Interactive GPS Radius Simulator Slider */}
          <div className="p-4 rounded-xl bg-ivory-50 border border-ivory-300 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-forest-900">
                <Radio className="w-3.5 h-3.5 text-forest-700 animate-pulse" />
                <span>Simulate Walking Away from Table</span>
              </div>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  isOutsideRadius
                    ? "bg-terracotta-100 text-terracotta-800 border border-terracotta-200"
                    : "bg-forest-100 text-forest-800"
                }`}
              >
                {isOutsideRadius ? "Outside Radius (Alarm Active)" : "Within Safe Radius"}
              </span>
            </div>

            {/* Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                <span>0m (At Table)</span>
                <span className="font-semibold text-forest-900">
                  Current Distance: {simulatedDistanceMeters}m
                </span>
                <span>150m (Down Street)</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                value={simulatedDistanceMeters}
                onChange={(e) => handleDistanceSliderChange(parseInt(e.target.value))}
                className="w-full accent-forest-700 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5">
                <span>Safe Zone (&lt;{geofenceRadiusMeters}m)</span>
                <span>Geofence Boundary: {geofenceRadiusMeters}m</span>
                <span>Departure Trigger Zone</span>
              </div>
            </div>

            {/* Coordinates Display */}
            <div className="pt-2 border-t border-ivory-200 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-forest-700" />
                Origin: {primaryCoords.latitude}° N, {Math.abs(primaryCoords.longitude)}° W
              </span>
              <span>Radius: {geofenceRadiusMeters}m</span>
            </div>
          </div>

          {/* Voice Reminder Audio Pill */}
          {unconfirmedItems.length > 0 && (
            <div className="p-3 rounded-xl bg-white border border-forest-100 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-forest-700" />
                <div>
                  <span className="text-xs font-semibold text-forest-900 block">
                    Meta Glasses Audio Announcement
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Directional open-ear spoken reminder
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleVoice}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSpeaking
                    ? "bg-terracotta-100 text-terracotta-800 border border-terracotta-200"
                    : "bg-forest-700 hover:bg-forest-800 text-ivory-50 shadow-xs"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Announcement</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Unconfirmed Items List or All Clear */}
          {unconfirmedItems.length === 0 ? (
            <div className="p-8 text-center bg-forest-50/50 rounded-2xl border border-forest-100 space-y-2">
              <div className="w-12 h-12 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-forest-900">
                All tracked belongings are collected!
              </h3>
              <p className="text-xs text-forest-800 max-w-sm mx-auto leading-relaxed">
                You have confirmed all tracked items. You are ready to move safely without leaving items behind.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
                <span>{unconfirmedItems.length} item(s) unconfirmed in this radius</span>
                <span className="text-[11px] text-stone-400">
                  Select an action for each
                </span>
              </div>

              {unconfirmedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border space-y-3 transition-colors ${
                    isOutsideRadius
                      ? "border-terracotta-300 bg-terracotta-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase font-semibold tracking-wider text-stone-500">
                        {item.category || "Belonging"}
                      </span>
                      <h4 className="text-sm font-semibold text-forest-900">
                        {item.item_name}
                      </h4>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isOutsideRadius
                          ? "bg-terracotta-100 text-terracotta-800 border-terracotta-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {isOutsideRadius ? "Outside Radius!" : "Unconfirmed"}
                    </span>
                  </div>

                  {/* Grounded Location Description */}
                  <div className="flex items-start gap-2 text-xs text-charcoal-800 bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-stone-500 block text-[10px] uppercase">
                        Last recorded observation
                      </span>
                      <span>{item.last_location_description}</span>
                    </div>
                  </div>

                  {/* Landmarks */}
                  {item.last_landmarks && item.last_landmarks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-stone-500">
                      <span>Landmarks:</span>
                      {item.last_landmarks.map((lm, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-white border border-ivory-300 text-charcoal-700"
                        >
                          {lm}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Resolution Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60 text-xs">
                    {onResolve && (
                      <button
                        onClick={() => onResolve(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium transition-colors"
                        title="Dismiss reminder without taking action"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-stone-500" />
                        <span>Dismiss</span>
                      </button>
                    )}

                    <button
                      onClick={() => onMarkLeftBehind(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-terracotta-200 bg-white hover:bg-terracotta-50 text-terracotta-700 font-medium transition-colors"
                      title="Flag that this item may have been left behind"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600" />
                      <span>Mark Left Behind</span>
                    </button>

                    <button
                      onClick={() => onMarkCollected(item.id)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-ivory-50 font-medium transition-colors shadow-xs"
                      title="Confirm that you have picked up this item"
                    >
                      <Check className="w-3.5 h-3.5 text-sage-200" />
                      <span>Confirm Collected</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between text-xs">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Check timestamp: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
