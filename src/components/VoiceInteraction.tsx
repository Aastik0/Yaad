"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  RotateCcw,
  Camera,
  Search,
  Compass,
  AlertCircle,
  HelpCircle,
  X,
} from "lucide-react";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition.ts";
import { parseVoiceIntent, ParsedVoiceIntent } from "../lib/voiceIntent.ts";
import {
  speakRememberConfirmation,
  speakUnknownIntent,
} from "../lib/speech.ts";

export interface VoiceInteractionProps {
  onRemember: () => void;
  onRecall: (query: string, targetItem?: string) => void;
  onNavigate: (query: string, targetItem?: string) => void;
  className?: string;
}

export const VoiceInteraction: React.FC<VoiceInteractionProps> = ({
  onRemember,
  onRecall,
  onNavigate,
  className = "",
}) => {
  const [lastIntent, setLastIntent] = useState<ParsedVoiceIntent | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleCommandRecognized = useCallback(
    (finalTranscript: string) => {
      setIsProcessing(true);
      const parsed = parseVoiceIntent(finalTranscript);
      setLastIntent(parsed);

      switch (parsed.type) {
        case "REMEMBER":
          setFeedbackMessage("Opening camera to record your surroundings...");
          speakRememberConfirmation();
          setTimeout(() => {
            onRemember();
            setIsProcessing(false);
          }, 800);
          break;

        case "RECALL": {
          const item = parsed.targetItem || parsed.normalizedQuery;
          setFeedbackMessage(`Searching memory for: "${item}"`);
          onRecall(parsed.normalizedQuery, parsed.targetItem);
          setIsProcessing(false);
          break;
        }

        case "NAVIGATE": {
          const item = parsed.targetItem || parsed.normalizedQuery;
          setFeedbackMessage(`Locating coordinates for: "${item}"`);
          onNavigate(parsed.normalizedQuery, parsed.targetItem);
          setIsProcessing(false);
          break;
        }

        case "UNKNOWN":
        default:
          setFeedbackMessage(
            `Unrecognized command: "${parsed.rawTranscript}". Try "Where are my keys?" or "Remember my items".`
          );
          speakUnknownIntent();
          setIsProcessing(false);
          break;
      }
    },
    [onRemember, onRecall, onNavigate]
  );

  const {
    isSupported,
    isListening,
    transcript,
    error,
    voiceOutputEnabled,
    startListening,
    stopListening,
    cancelListening,
    toggleVoiceOutput,
    clearError,
  } = useVoiceRecognition({
    onFinalTranscript: handleCommandRecognized,
  });

  // Auto-dismiss transient feedback message after 8 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const handlePushToTalk = () => {
    if (isListening) {
      stopListening();
    } else {
      setLastIntent(null);
      setFeedbackMessage(null);
      clearError();
      startListening();
    }
  };

  return (
    <div
      className={`relative bg-white/95 border border-ivory-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${className}`}
      data-testid="voice-interaction"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Push-To-Talk Button & Status Label */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handlePushToTalk}
            disabled={!isSupported && typeof window !== "undefined"}
            className={`relative flex items-center justify-center w-12 h-12 rounded-xl text-white font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isListening
                ? "bg-amber-600 hover:bg-amber-700 animate-pulse focus:ring-amber-500 scale-105"
                : isProcessing
                ? "bg-forest-600 animate-pulse focus:ring-forest-500"
                : "bg-forest-700 hover:bg-forest-800 active:scale-95 focus:ring-forest-600"
            } ${!isSupported ? "opacity-60 cursor-not-allowed bg-stone-400" : "cursor-pointer"}`}
            title={
              !isSupported
                ? "Speech recognition is not supported in this browser"
                : isListening
                ? "Listening... Click to finish speaking"
                : "Push to talk with Yaad"
            }
            aria-label={isListening ? "Stop listening" : "Push to talk"}
          >
            {isListening ? (
              <span className="relative flex items-center justify-center">
                <Mic className="w-5 h-5 text-white animate-bounce" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-white animate-ping" />
              </span>
            ) : isProcessing ? (
              <RotateCcw className="w-5 h-5 text-white animate-spin" />
            ) : !isSupported ? (
              <MicOff className="w-5 h-5 text-stone-200" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-charcoal-900">
                {isListening
                  ? "Listening to voice..."
                  : isProcessing
                  ? "Processing command..."
                  : "Voice Memory Assistant"}
              </span>
              {isListening && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                  MIC ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-600 mt-0.5">
              {isListening
                ? "Speak now: \"Where are my keys?\", \"Remember my items\", or \"Take me to my wallet\""
                : "Push to talk · Zero background listening · Explicit single command"}
            </p>
          </div>
        </div>

        {/* Right Side: Audio Preferences & Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {isListening && (
            <>
              <button
                type="button"
                onClick={stopListening}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-forest-100 hover:bg-forest-200 text-forest-800 transition-colors"
                title="Finish speech"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={cancelListening}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                title="Cancel voice input"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </>
          )}

          {/* Voice Output Toggle */}
          <button
            type="button"
            onClick={toggleVoiceOutput}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              voiceOutputEnabled
                ? "bg-sage-50 text-sage-800 border-sage-300 hover:bg-sage-100"
                : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
            }`}
            title={
              voiceOutputEnabled
                ? "Voice speech responses are enabled. Click to mute."
                : "Voice speech responses are muted. Click to enable spoken answers."
            }
            aria-label={voiceOutputEnabled ? "Mute voice responses" : "Enable voice responses"}
          >
            {voiceOutputEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-sage-700" />
                <span>Spoken audio on</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Transcript View during active speech */}
      {isListening && (
        <div className="mt-3.5 pt-3 border-t border-ivory-200 bg-amber-50/60 rounded-xl p-3 flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
              Live Transcription
            </span>
            <p className="text-sm text-charcoal-900 font-medium italic mt-0.5 break-words">
              {transcript || "Waiting for speech..."}
            </p>
          </div>
        </div>
      )}

      {/* Detected Intent Badge & Feedback */}
      {lastIntent && !isListening && (
        <div className="mt-3.5 pt-3 border-t border-ivory-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-500 font-medium">Recognized Intent:</span>
            {lastIntent.type === "REMEMBER" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>REMEMBER SCENE</span>
              </span>
            )}
            {lastIntent.type === "RECALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                <Search className="w-3.5 h-3.5 text-sky-700" />
                <span>RECALL: {lastIntent.targetItem?.toUpperCase()}</span>
              </span>
            )}
            {lastIntent.type === "NAVIGATE" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                <Compass className="w-3.5 h-3.5 text-purple-700" />
                <span>NAVIGATE: {lastIntent.targetItem?.toUpperCase()}</span>
              </span>
            )}
            {lastIntent.type === "UNKNOWN" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>UNKNOWN INTENT</span>
              </span>
            )}
          </div>

          <div className="text-xs text-charcoal-600 italic">
            &ldquo;{lastIntent.rawTranscript}&rdquo;
          </div>
        </div>
      )}

      {/* Spoken / Action Feedback Banner */}
      {feedbackMessage && !isListening && (
        <div className="mt-2.5 px-3 py-2 rounded-lg bg-ivory-100 border border-ivory-300 text-xs text-forest-900 flex items-center justify-between gap-2">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-400 hover:text-stone-600"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hardware / Permission Error Notice */}
      {error && (
        <div className="mt-3 pt-3 border-t border-red-200 flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick speech hint examples for user guidance */}
      {!isListening && !lastIntent && (
        <div className="mt-3 pt-2.5 border-t border-ivory-200/60 flex flex-wrap items-center gap-2 text-[11px] text-charcoal-500">
          <span className="font-medium text-stone-400">Quick prompts:</span>
          <button
            type="button"
            onClick={() => handleCommandRecognized("Where are my keys?")}
            className="px-2 py-0.5 rounded bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 transition-colors cursor-pointer"
          >
            &ldquo;Where are my keys?&rdquo;
          </button>
          <button
            type="button"
            onClick={() => handleCommandRecognized("Remember my belongings")}
            className="px-2 py-0.5 rounded bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 transition-colors cursor-pointer"
          >
            &ldquo;Remember my belongings&rdquo;
          </button>
          <button
            type="button"
            onClick={() => handleCommandRecognized("Take me to my wallet")}
            className="px-2 py-0.5 rounded bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 transition-colors cursor-pointer"
          >
            &ldquo;Take me to my wallet&rdquo;
          </button>
        </div>
      )}
    </div>
  );
};
