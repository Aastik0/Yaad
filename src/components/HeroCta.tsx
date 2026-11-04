"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera,
  LogOut,
  Search,
  Mic,
  MicOff,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Key,
  Wallet,
  Glasses,
  Laptop,
  Headphones,
  Luggage,
  Smartphone,
  Watch,
  ArrowRight,
} from "lucide-react";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition.ts";
import { parseVoiceIntent } from "../lib/voiceIntent.ts";
import {
  speakRememberConfirmation,
  speakUnknownIntent,
} from "../lib/speech.ts";

export interface HeroCtaProps {
  onCaptureClick: () => void;
  onSimulateDeparture: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unconfirmedCount: number;
  onVoiceRecall?: (query: string, targetItem?: string) => void;
  onVoiceNavigate?: (query: string, targetItem?: string) => void;
}

interface QuickItem {
  id: string;
  label: string;
  subtext: string;
  prompt: string;
  target: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

const QUICK_RECALL_ITEMS: QuickItem[] = [
  {
    id: "keys",
    label: "Keys",
    subtext: "Where are my keys?",
    prompt: "Where are my keys?",
    target: "keys",
    icon: Key,
    colorClass: "text-amber-700",
    bgClass: "bg-amber-100 group-hover:bg-amber-200",
  },
  {
    id: "wallet",
    label: "Wallet",
    subtext: "Where is my wallet?",
    prompt: "Where is my wallet?",
    target: "wallet",
    icon: Wallet,
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-100 group-hover:bg-emerald-200",
  },
  {
    id: "glasses",
    label: "Glasses",
    subtext: "Where are my glasses?",
    prompt: "Where are my glasses?",
    target: "glasses",
    icon: Glasses,
    colorClass: "text-indigo-700",
    bgClass: "bg-indigo-100 group-hover:bg-indigo-200",
  },
  {
    id: "laptop",
    label: "Laptop",
    subtext: "Where is my laptop?",
    prompt: "Where is my laptop?",
    target: "laptop",
    icon: Laptop,
    colorClass: "text-blue-700",
    bgClass: "bg-blue-100 group-hover:bg-blue-200",
  },
  {
    id: "headphones",
    label: "AirPods",
    subtext: "Where are my headphones?",
    prompt: "Where are my headphones?",
    target: "headphones",
    icon: Headphones,
    colorClass: "text-purple-700",
    bgClass: "bg-purple-100 group-hover:bg-purple-200",
  },
  {
    id: "bag",
    label: "Backpack",
    subtext: "Where is my bag?",
    prompt: "Where is my backpack?",
    target: "backpack",
    icon: Luggage,
    colorClass: "text-rose-700",
    bgClass: "bg-rose-100 group-hover:bg-rose-200",
  },
];

export const HeroCta: React.FC<HeroCtaProps> = ({
  onCaptureClick,
  onSimulateDeparture,
  searchQuery,
  onSearchChange,
  unconfirmedCount,
  onVoiceRecall,
  onVoiceNavigate,
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommandRecognized = useCallback(
    (finalTranscript: string) => {
      setIsProcessing(true);
      const parsed = parseVoiceIntent(finalTranscript);

      switch (parsed.type) {
        case "REMEMBER":
          setFeedbackMessage("Opening camera to capture belongings...");
          speakRememberConfirmation();
          setTimeout(() => {
            onCaptureClick();
            setIsProcessing(false);
          }, 700);
          break;

        case "RECALL": {
          const item = parsed.targetItem || parsed.normalizedQuery;
          setFeedbackMessage(`Searching memory for "${item}"...`);
          onSearchChange(item);
          if (onVoiceRecall) {
            onVoiceRecall(parsed.normalizedQuery, parsed.targetItem);
          }
          setIsProcessing(false);
          break;
        }

        case "NAVIGATE": {
          const item = parsed.targetItem || parsed.normalizedQuery;
          setFeedbackMessage(`Locating "${item}"...`);
          onSearchChange(item);
          if (onVoiceNavigate) {
            onVoiceNavigate(parsed.normalizedQuery, parsed.targetItem);
          }
          setIsProcessing(false);
          break;
        }

        case "UNKNOWN":
        default:
          onSearchChange(parsed.rawTranscript);
          setFeedbackMessage(`Heard: "${parsed.rawTranscript}"`);
          speakUnknownIntent();
          setIsProcessing(false);
          break;
      }
    },
    [onCaptureClick, onSearchChange, onVoiceRecall, onVoiceNavigate]
  );

  const {
    isSupported,
    isListening,
    transcript,
    error: voiceError,
    voiceOutputEnabled,
    startListening,
    stopListening,
    toggleVoiceOutput,
    clearError,
  } = useVoiceRecognition({
    onFinalTranscript: handleCommandRecognized,
  });

  // Auto-dismiss transient feedback message after 6 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedbackMessage(null);
      clearError();
      startListening();
    }
  };

  const handleQuickPrompt = (prompt: string, targetName: string) => {
    onSearchChange(prompt);
    if (onVoiceRecall) {
      onVoiceRecall(prompt, targetName);
    }
    inputRef.current?.focus();
  };

  return (
    <section className="bg-white border border-ivory-300 rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Clear Value Proposition */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 text-forest-800 text-xs font-semibold border border-forest-100 mb-3.5">
            <Sparkles className="w-3.5 h-3.5 text-forest-600" />
            <span>AI Memory Companion · Meta Ray-Ban</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900 leading-tight">
            Never leave your essentials behind.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-charcoal-700 leading-relaxed">
            Snap what you set down. Yaad grounds your items to physical landmarks and sends calm reminders before you walk away.
          </p>
        </div>

        {/* Right Column: Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onCaptureClick}
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-forest-700 hover:bg-forest-800 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-forest-600 focus:ring-offset-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-200" />
            <span>Remember Belongings</span>
          </button>

          <button
            type="button"
            onClick={onSimulateDeparture}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-ivory-100 hover:bg-ivory-200 active:scale-[0.98] text-charcoal-800 border border-ivory-300 text-sm font-medium transition-all cursor-pointer"
            title="Simulate walking away to test departure alerts"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Simulate Departure</span>
            {unconfirmedCount > 0 && (
              <span className="ml-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                {unconfirmedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Omnibox: Unified Search & Voice Bar */}
      <div className="mt-6 pt-6 border-t border-ivory-200">
        <div className="relative max-w-2xl">
          <div className="relative flex items-center">
            {/* Left Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-charcoal-500">
              <Search className="w-4 h-4 text-stone-400" />
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isListening
                  ? "Listening... Speak naturally (e.g., 'Where did I leave my keys?')"
                  : "Ask where anything is... e.g., 'Where are my keys?'"
              }
              className={`w-full pl-11 pr-24 py-3.5 rounded-2xl border text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none transition-all shadow-xs ${
                isListening
                  ? "bg-amber-50/50 border-amber-400 ring-2 ring-amber-300/50"
                  : "bg-ivory-50 border-ivory-300 focus:bg-white focus:border-forest-600 focus:ring-2 focus:ring-forest-100"
              }`}
            />

            {/* Right Action Cluster: Clear button + Audio toggle + Mic button */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Voice Output Toggle */}
              <button
                type="button"
                onClick={toggleVoiceOutput}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title={voiceOutputEnabled ? "Spoken answers enabled (click to mute)" : "Spoken answers muted (click to unmute)"}
                aria-label={voiceOutputEnabled ? "Mute spoken answers" : "Unmute spoken answers"}
              >
                {voiceOutputEnabled ? (
                  <Volume2 className="w-4 h-4 text-forest-700" />
                ) : (
                  <VolumeX className="w-4 h-4 text-stone-400" />
                )}
              </button>

              {/* Microphone Push-To-Talk Button */}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={!isSupported && typeof window !== "undefined"}
                className={`relative p-2 rounded-xl transition-all ${
                  isListening
                    ? "bg-amber-600 text-white animate-pulse shadow-sm"
                    : isProcessing
                    ? "bg-forest-600 text-white animate-spin"
                    : "text-stone-500 hover:text-forest-800 hover:bg-forest-50"
                } ${!isSupported ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={
                  !isSupported
                    ? "Voice recognition not supported in this browser"
                    : isListening
                    ? "Listening... Tap to finish speaking"
                    : "Ask with your voice"
                }
                aria-label={isListening ? "Stop listening" : "Ask with voice"}
              >
                {isListening ? (
                  <Mic className="w-4 h-4 text-white" />
                ) : isProcessing ? (
                  <RotateCcw className="w-4 h-4 text-white" />
                ) : !isSupported ? (
                  <MicOff className="w-4 h-4 text-stone-300" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Live Interim Transcript or Feedback */}
          {isListening && transcript && (
            <div className="mt-2 text-xs text-amber-800 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
              <span>Hearing: &ldquo;{transcript}&rdquo;</span>
            </div>
          )}

          {feedbackMessage && !isListening && (
            <div className="mt-2 text-xs text-forest-800 font-medium px-3 py-1.5 rounded-xl bg-forest-50 border border-forest-200">
              {feedbackMessage}
            </div>
          )}

          {voiceError && !isListening && (
            <div className="mt-2 text-xs text-rose-700 font-medium px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200">
              Voice note: {voiceError}
            </div>
          )}
        </div>

        {/* Quick-Use Belongings Icon Grid */}
        <div className="mt-5 pt-4 border-t border-ivory-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-forest-600" />
              <span>Quick Find Icons</span>
            </span>
            <span className="text-[11px] text-stone-400">1-tap instant recall</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {QUICK_RECALL_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickPrompt(item.prompt, item.target)}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white hover:bg-forest-50/50 border border-ivory-300 hover:border-forest-300 text-left transition-all group shadow-2xs cursor-pointer active:scale-95"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${item.bgClass} ${item.colorClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-charcoal-900 group-hover:text-forest-900 truncate">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-stone-400 group-hover:text-forest-600 truncate">
                      Locate
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
