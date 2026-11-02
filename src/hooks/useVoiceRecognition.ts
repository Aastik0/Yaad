import { useState, useEffect, useRef, useCallback } from "react";
import {
  ISpeechRecognitionConstructor,
  ISpeechRecognitionInstance,
  ISpeechRecognitionEvent,
  ISpeechRecognitionErrorEvent,
} from "../types/speech.ts";
import { isVoiceOutputEnabled, setVoiceOutputEnabled } from "../lib/speech.ts";

interface UseVoiceRecognitionOptions {
  onFinalTranscript?: (transcript: string) => void;
}

export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  voiceOutputEnabled: boolean;
  startListening: () => void;
  stopListening: () => void;
  cancelListening: () => void;
  toggleVoiceOutput: () => void;
  clearError: () => void;
}

export function useVoiceRecognition(options?: UseVoiceRecognitionOptions): UseVoiceRecognitionReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [voiceOutputEnabled, setVoiceOutput] = useState<boolean>(true);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const isAbortingRef = useRef<boolean>(false);
  const onFinalTranscriptRef = useRef(options?.onFinalTranscript);
  onFinalTranscriptRef.current = options?.onFinalTranscript;

  // Initialize browser support and audio preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        SpeechRecognition?: ISpeechRecognitionConstructor;
        webkitSpeechRecognition?: ISpeechRecognitionConstructor;
      };
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognitionClass));
      setVoiceOutput(isVoiceOutputEnabled());
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toggleVoiceOutput = useCallback(() => {
    const nextState = !voiceOutputEnabled;
    setVoiceOutput(nextState);
    setVoiceOutputEnabled(nextState);
  }, [voiceOutputEnabled]);

  const cancelListening = useCallback(() => {
    isAbortingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    setError(null);
    setTranscript("");
    isAbortingRef.current = false;

    const win = window as unknown as {
      SpeechRecognition?: ISpeechRecognitionConstructor;
      webkitSpeechRecognition?: ISpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    try {
      // Clean up previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false; // Push-to-talk single utterance
      recognition.interimResults = true; // Show live text
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      let finalCapturedText = "";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalCapturedText += text;
          } else {
            interimText += text;
          }
        }
        const currentDisplay = (finalCapturedText + " " + interimText).trim();
        setTranscript(currentDisplay);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        if (isAbortingRef.current) return;

        let friendlyError = "Speech recognition encountered an issue.";
        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            friendlyError = "Microphone permission was denied. Please allow microphone access in your browser.";
            break;
          case "no-speech":
            friendlyError = "No speech detected. Press the microphone and speak clearly.";
            break;
          case "network":
            friendlyError = "Speech recognition network error. Please check your internet connection.";
            break;
          case "audio-capture":
            friendlyError = "No microphone hardware was detected on your device.";
            break;
          case "aborted":
            return; // Expected on manual cancel
          default:
            friendlyError = `Speech recognition error: ${event.error}`;
        }
        setError(friendlyError);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;

        if (!isAbortingRef.current && finalCapturedText.trim()) {
          onFinalTranscriptRef.current?.(finalCapturedText.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setError("Failed to access speech recognition service. Please check your microphone permissions.");
      setIsListening(false);
    }
  }, []);

  return {
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
  };
}

