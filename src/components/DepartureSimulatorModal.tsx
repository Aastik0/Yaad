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

  // Stop speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate calm spoken sentence
  const generateSpokenSummary = () => {
    if (unconfirmedItems.length === 0) {
      return "All tracked belongings have been confirmed as collected. You are good to go.";
    }

    const itemsSummary = unconfirmedItems
      .map((item) => `${item.item_name}, last recorded ${item.last_location_description}`)
      .join(". Also, ");

    return `Before you step away, you have ${unconfirmedItems.length} unconfirmed belonging${
      unconfirmedItems.length > 1 ? "s" : ""
    }: ${itemsSummary}. Did you remember to collect them?`;
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

  const handleClose = () => {
    stopSpeech();
    setIsSpeaking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-forest-900">
                  Departure Check Simulator
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800">
                  Simulation
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Checking tracked items before you move to your next location
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
          {/* Honest Simulation Disclaimer */}
          <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300 text-xs text-charcoal-800 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <span>
              <strong>Simulated in browser:</strong> Real background geofencing and smart-glasses departure triggers require native hardware integration. In this MVP, departure is triggered on-demand.
            </span>
          </div>

          {/* Voice Reminder Audio Pill */}
          {unconfirmedItems.length > 0 && (
            <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-forest-700" />
                <div>
                  <span className="text-xs font-semibold text-forest-900 block">
                    Calm Voice Reminder (Web Speech)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Spoken audio feedback with text fallback
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
                    <span>Play Reminder</span>
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
                <span>{unconfirmedItems.length} item(s) unconfirmed</span>
                <span className="text-[11px] text-stone-400">
                  Select an action for each
                </span>
              </div>

              {unconfirmedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
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

                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Unconfirmed
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
