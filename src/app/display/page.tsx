"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Mic,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { CandidateItem, TrackedItem, ItemObservation, GeoLocationCoordinates } from "@/types";
import { DEFAULT_DEMO_COORDINATES, calculateDistanceMeters, evaluateGeofence, generateGoogleMapsUrl } from "@/lib/geo";
import { parseVoiceIntent } from "@/lib/voiceIntent";
import { speakCalmReminder } from "@/lib/speech";
import { getStorageRepository } from "@/lib/repository";
import { useAuth } from "@/contexts/AuthContext";
import {
  POV_SCENE_PRESETS,
  PovScenePreset,
  VIRTUAL_VOICE_COMMANDS,
  simulateVirtualDeparture,
  isVirtualHardwareAuthorized,
} from "@/lib/display/virtualHardwareAdapter";

type HudState = "IDLE" | "CAPTURING" | "CONFIRMING" | "RECALLING" | "DEPARTURE_ALERT" | "NAVIGATING";

export default function MetaDisplayPage() {
  const { user, isConfigured } = useAuth();

  // Primary HUD state
  const [hudState, setHudState] = useState<HudState>("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("YAAD HUD • READY");
  const [currentTime, setCurrentTime] = useState<string>("12:00 PM");

  // Telemetry & Hardware state
  const [batteryPercent] = useState<number>(88);
  const [currentCoords, setCurrentCoords] = useState<GeoLocationCoordinates>(DEFAULT_DEMO_COORDINATES);
  const [originCoords, setOriginCoords] = useState<GeoLocationCoordinates>(DEFAULT_DEMO_COORDINATES);
  const [displacementMeters, setDisplacementMeters] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");

  // Belongings & Memory state
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [detectedCandidates, setDetectedCandidates] = useState<CandidateItem[]>([]);
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState<number>(0);
  const [activeRecallResult, setActiveRecallResult] = useState<{
    itemName: string;
    location: string;
    landmarks: string[];
    observedAt: string;
    coordinates?: GeoLocationCoordinates;
    speechSummary?: string;
  } | null>(null);
  const [departureAlertItem, setDepartureAlertItem] = useState<string>("Apartment Keys & Wallet");

  // D-Pad Focus Navigation
  // Menu items on IDLE: 0 = Remember, 1 = Recall, 2 = Items List
  const [idleFocusIdx, setIdleFocusIdx] = useState<number>(0);

  // Virtual Hardware Dev Adapter state
  const [selectedScene, setSelectedScene] = useState<PovScenePreset>(POV_SCENE_PRESETS[0]);
  const [isDevToolbarOpen, setIsDevToolbarOpen] = useState<boolean>(true);
  const [isLiveWebcamActive, setIsLiveWebcamActive] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Audio synthesis helper (Web Audio API for subtle UI chimes)
  const playHudSound = useCallback((frequency: number, type: OscillatorType = "sine", duration: number = 0.08) => {
    if (isAudioMuted || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay may be restricted
    }
  }, [isAudioMuted]);

  // Load initial tracked items from repository
  const refreshTrackedItems = useCallback(async () => {
    try {
      const repo = getStorageRepository(user);
      const items = await repo.getItems();
      setTrackedItems(items);
    } catch (e) {
      console.warn("[DisplayHUD] Failed to fetch items:", e);
    }
  }, [user]);

  useEffect(() => {
    refreshTrackedItems();
  }, [refreshTrackedItems]);

  // Clock ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  // Live Mac Webcam initialization for developer preview
  useEffect(() => {
    if (!isLiveWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 600, height: 600 } })
      .then((stream) => {
        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      })
      .catch((err) => {
        console.warn("[DisplayHUD] Webcam access denied or unavailable:", err);
        setIsLiveWebcamActive(false);
      });

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isLiveWebcamActive]);

  // Trigger Scene Capture & Analysis
  const triggerCaptureAndAnalyze = useCallback(async (customImage?: string) => {
    setHudState("CAPTURING");
    setStatusMessage("SCANNING POV SCENE...");
    playHudSound(520, "sine", 0.12);

    let imagePayload = customImage || selectedScene.svgDataUrl;

    // If live webcam is active, grab actual frame
    if (isLiveWebcamActive && videoRef.current) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 600, 600);
          imagePayload = canvas.toDataURL("image/jpeg", 0.75);
        }
      } catch (err) {
        console.warn("[DisplayHUD] Frame grab failed, using preset SVG:", err);
      }
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePayload,
          requestedQuery: "personal belongings",
          source: "glasses_sdk",
          userId: user?.id || "demo-user",
        }),
      });

      const data = await response.json();
      if (data.success && data.candidates && data.candidates.length > 0) {
        setDetectedCandidates(data.candidates);
        setSelectedCandidateIdx(0);
        setHudState("CONFIRMING");
        setStatusMessage(`FOUND ${data.candidates.length} CANDIDATES • SWIPE TO REVIEW`);
        playHudSound(780, "triangle", 0.15);
      } else {
        setStatusMessage("NO NEW ITEMS DETECTED");
        setTimeout(() => setHudState("IDLE"), 2000);
      }
    } catch (err) {
      console.error("[DisplayHUD] Analysis error:", err);
      setStatusMessage("ANALYSIS FAILED • RETRY");
      setTimeout(() => setHudState("IDLE"), 2000);
    }
  }, [isLiveWebcamActive, playHudSound, selectedScene, user]);

  // Confirm Candidate to Shared Memory
  const confirmSelectedCandidate = useCallback(async () => {
    if (detectedCandidates.length === 0) return;
    const candidate = detectedCandidates[selectedCandidateIdx];
    if (!candidate) return;

    setStatusMessage(`SAVING: ${candidate.item_name}...`);
    playHudSound(880, "sine", 0.18);

    try {
      const repo = getStorageRepository(user);
      const now = new Date().toISOString();

      const newObs: ItemObservation = {
        id: `obs-${Date.now()}-${candidate.id}`,
        user_id: user?.id || "demo-user",
        item_name: candidate.item_name,
        item_category: candidate.category || "Belonging",
        location_description: candidate.location_description,
        landmarks: candidate.landmarks || selectedScene.landmarks,
        description: candidate.description,
        confidence: candidate.confidence,
        observed_at: now,
        source: "glasses_sdk",
        coordinates: currentCoords,
        user_confirmed: true,
        created_at: now,
      };

      const newTracked: TrackedItem = {
        id: `item-${Date.now()}-${candidate.id}`,
        user_id: user?.id || "demo-user",
        item_name: candidate.item_name,
        category: candidate.category || "Belonging",
        status: "tracked_unconfirmed",
        last_location_description: candidate.location_description,
        last_landmarks: candidate.landmarks || selectedScene.landmarks,
        last_observed_at: now,
        coordinates: currentCoords,
        geofence_radius_meters: 50,
        updated_at: now,
      };

      const savedObs = await repo.saveObservation(newObs);
      await repo.saveItem({
        ...newTracked,
        last_observation_id: savedObs.id,
        image_reference: savedObs.image_reference,
      });

      // Speak confirmation
      if (!isAudioMuted) {
        speakCalmReminder(`Saved ${candidate.item_name} at ${candidate.location_description}`);
      }

      await refreshTrackedItems();
      setOriginCoords(currentCoords); // Set anchor for departure geofencing

      // Advance to next candidate or return to IDLE
      if (detectedCandidates.length > 1 && selectedCandidateIdx < detectedCandidates.length - 1) {
        setSelectedCandidateIdx((prev) => prev + 1);
        setStatusMessage("CONFIRMED • NEXT CANDIDATE");
      } else {
        setStatusMessage("ALL MEMORIES SAVED • YAAD READY");
        setTimeout(() => setHudState("IDLE"), 1600);
      }
    } catch (err) {
      console.error("[DisplayHUD] Confirm error:", err);
      setStatusMessage("SAVE FAILED");
      setTimeout(() => setHudState("IDLE"), 2000);
    }
  }, [currentCoords, detectedCandidates, isAudioMuted, playHudSound, refreshTrackedItems, selectedCandidateIdx, selectedScene.landmarks, user]);

  // Execute Grounded Recall Query
  const executeRecallQuery = useCallback(async (query: string) => {
    setHudState("RECALLING");
    setStatusMessage(`SEARCHING: "${query}"...`);
    playHudSound(600, "sine", 0.1);

    try {
      const response = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (data.success && data.found && data.item) {
        setActiveRecallResult({
          itemName: data.item.item_name,
          location: data.item.last_location_description,
          landmarks: data.item.landmarks || [],
          observedAt: data.item.last_observed_at,
          coordinates: currentCoords,
          speechSummary: data.speechSummary,
        });
        setStatusMessage("GROUNDED MEMORY FOUND");
        playHudSound(840, "sine", 0.15);

        if (!isAudioMuted && data.speechSummary) {
          speakCalmReminder(data.speechSummary);
        }
      } else {
        setActiveRecallResult(null);
        setStatusMessage(`NO RECORD FOUND FOR: "${query}"`);
        if (!isAudioMuted) {
          speakCalmReminder(`I could not find any recorded sighting for ${query}.`);
        }
      }
    } catch (err) {
      console.error("[DisplayHUD] Recall error:", err);
      setStatusMessage("RECALL ERROR");
    }
  }, [currentCoords, isAudioMuted, playHudSound]);

  // Execute Voice Command Ingestion
  const handleVoiceCommand = useCallback((transcript: string) => {
    setVoiceTranscript(transcript);
    setIsListeningVoice(false);
    playHudSound(660, "sine", 0.1);

    const intent = parseVoiceIntent(transcript);
    switch (intent.type) {
      case "REMEMBER":
        triggerCaptureAndAnalyze();
        break;
      case "RECALL":
        executeRecallQuery(intent.targetItem || "keys");
        break;
      case "NAVIGATE":
        if (activeRecallResult?.coordinates) {
          setHudState("NAVIGATING");
          setStatusMessage("LAUNCHING DIRECTIONS...");
        } else {
          executeRecallQuery(intent.targetItem || "keys");
          setHudState("NAVIGATING");
        }
        break;
      default:
        setStatusMessage(`COMMAND: "${transcript}"`);
        break;
    }
  }, [activeRecallResult?.coordinates, executeRecallQuery, playHudSound, triggerCaptureAndAnalyze]);

  // Geofence & Departure Trigger Simulation
  const handleSimulateDeparture = useCallback((offsetMeters: number) => {
    const newCoords = simulateVirtualDeparture(originCoords, offsetMeters);
    setCurrentCoords(newCoords);
    setDisplacementMeters(offsetMeters);

    const dist = calculateDistanceMeters(
      originCoords.latitude,
      originCoords.longitude,
      newCoords.latitude,
      newCoords.longitude
    );
    const geofence = evaluateGeofence(newCoords, originCoords, 30);

    if (geofence.isBreached && trackedItems.length > 0) {
      const unconfirmed = trackedItems.find((t) => t.status !== "collected") || trackedItems[0];
      setDepartureAlertItem(unconfirmed ? unconfirmed.item_name : "Car Keys & Wallet");
      setHudState("DEPARTURE_ALERT");
      setStatusMessage("⚠️ GEOFENCE BREACH • CHECK ITEMS");
      playHudSound(440, "square", 0.25);

      if (!isAudioMuted) {
        speakCalmReminder(`Warning: You have moved ${Math.round(dist)} meters away. Did you remember your ${unconfirmed?.item_name || "belongings"}?`);
      }
    } else {
      setStatusMessage(`DISTANCE: ${Math.round(dist)}m • WITHIN SAFE RADIUS`);
      playHudSound(600, "sine", 0.08);
    }
  }, [isAudioMuted, originCoords, playHudSound, trackedItems]);

  // Directional Focus Keyboard Navigation (D-Pad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          playHudSound(480, "sine", 0.05);
          if (hudState === "IDLE") {
            setIdleFocusIdx((prev) => (prev > 0 ? prev - 1 : 2));
          } else if (hudState === "CONFIRMING") {
            setSelectedCandidateIdx((prev) => (prev > 0 ? prev - 1 : detectedCandidates.length - 1));
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          playHudSound(480, "sine", 0.05);
          if (hudState === "IDLE") {
            setIdleFocusIdx((prev) => (prev < 2 ? prev + 1 : 0));
          } else if (hudState === "CONFIRMING") {
            setSelectedCandidateIdx((prev) => (prev < detectedCandidates.length - 1 ? prev + 1 : 0));
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          playHudSound(440, "sine", 0.05);
          if (hudState === "CONFIRMING") {
            setSelectedCandidateIdx((prev) => (prev > 0 ? prev - 1 : detectedCandidates.length - 1));
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          playHudSound(520, "sine", 0.05);
          if (hudState === "CONFIRMING") {
            setSelectedCandidateIdx((prev) => (prev < detectedCandidates.length - 1 ? prev + 1 : 0));
          }
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          playHudSound(720, "sine", 0.1);
          if (hudState === "IDLE") {
            if (idleFocusIdx === 0) triggerCaptureAndAnalyze();
            else if (idleFocusIdx === 1) executeRecallQuery("keys");
            else setHudState("RECALLING");
          } else if (hudState === "CONFIRMING") {
            confirmSelectedCandidate();
          } else if (hudState === "RECALLING") {
            setHudState("NAVIGATING");
          } else if (hudState === "DEPARTURE_ALERT") {
            setHudState("RECALLING");
          } else if (hudState === "NAVIGATING") {
            // Open external map handoff
            const url = generateGoogleMapsUrl(currentCoords.latitude, currentCoords.longitude);
            window.open(url, "_blank");
          }
          break;

        case "Escape":
        case "Backspace":
          e.preventDefault();
          playHudSound(360, "sine", 0.08);
          setHudState("IDLE");
          setStatusMessage("YAAD HUD • READY");
          break;

        case "v":
        case "V":
        case "t":
        case "T":
          e.preventDefault();
          setIsListeningVoice((prev) => !prev);
          break;

        case "h":
        case "H":
          e.preventDefault();
          setIsDevToolbarOpen((prev) => !prev);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmSelectedCandidate, detectedCandidates.length, executeRecallQuery, hudState, idleFocusIdx, playHudSound, triggerCaptureAndAnalyze, currentCoords]);

  return (
    <div className="min-h-screen bg-[#070B0E] text-white flex flex-col items-center justify-center p-2 sm:p-4 font-sans select-none">
      {/* Top Bar with Mode Information */}
      <div className="w-full max-w-[1080px] flex items-center justify-between pb-3 text-xs text-gray-400 border-b border-gray-800 mb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Yaad Web Companion</span>
          </Link>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
            META RAY-BAN DISPLAY HUD (600×600)
          </span>
          <span className="text-gray-500 hidden md:inline">
            Use keyboard <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">↓</kbd> <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">Enter</kbd> <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">Esc</kbd>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="flex items-center gap-1 text-gray-400 hover:text-white"
            title="Toggle Audio Feedback"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isAudioMuted ? "Muted" : "Audio On"}</span>
          </button>
          <button
            onClick={() => setIsDevToolbarOpen(!isDevToolbarOpen)}
            className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-emerald-900/60 font-mono text-xs"
          >
            {isDevToolbarOpen ? "Hide Dev Toolbar [H]" : "Show Dev Toolbar [H]"}
          </button>
        </div>
      </div>

      {/* Main Container: 600x600 Display Canvas + Side Dev Adapter */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-6">
        {/* ========================================================================= */}
        {/* 600x600 MONOCULAR ADDITIVE WAVEGUIDE DISPLAY CANVAS                       */}
        {/* ========================================================================= */}
        <div className="relative w-[600px] h-[600px] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 flex flex-col justify-between p-6">
          {/* Real Webcam Passthrough Background (Optional for contrast preview) */}
          {isLiveWebcamActive && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
              muted
              playsInline
            />
          )}

          {/* Additive Optical Grid / Framing Reticle */}
          <div className="absolute inset-0 border border-emerald-500/10 pointer-events-none rounded-xl" />

          {/* ----------------- HUD HEADER (Telemetry Bar) ----------------- */}
          <div className="relative z-10 flex items-center justify-between text-xs font-mono tracking-wider border-b border-gray-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold tracking-widest">YAAD HUD</span>
              <span className="text-gray-500">•</span>
              <span className="text-emerald-400">{hudState}</span>
            </div>

            <div className="flex items-center gap-3 text-gray-400">
              <span className="text-white font-semibold">{currentTime}</span>
              <span>BAT {batteryPercent}%</span>
              <span className="text-emerald-400">GPS LOCK</span>
            </div>
          </div>

          {/* ----------------- HUD CENTER CONTENT AREA ----------------- */}
          <div className="relative z-10 flex-1 flex flex-col justify-center items-center my-4">
            {/* VIEW 1: IDLE HUD */}
            {hudState === "IDLE" && (
              <div className="w-full flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-16 h-16 rounded-full border border-emerald-400/40 flex items-center justify-center bg-emerald-950/20">
                  <Compass className="w-8 h-8 text-emerald-400" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-wide text-white">MEMORY ASSISTANT</h1>
                  <p className="text-xs text-gray-400 tracking-wider font-mono mt-1">
                    {trackedItems.length} ITEMS SAVED • GEOFENCE ACTIVE (30M)
                  </p>
                </div>

                {/* Focus-Navigable Menu Buttons */}
                <div className="w-full max-w-md space-y-2.5 font-mono text-sm">
                  <div
                    onClick={() => triggerCaptureAndAnalyze()}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      idleFocusIdx === 0
                        ? "border-emerald-400 bg-emerald-950/40 text-white ring-2 ring-emerald-400/50"
                        : "border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold">[1] REMEMBER POV SCENE</span>
                    </div>
                    {idleFocusIdx === 0 && <span className="text-xs text-emerald-300">ENTER ↵</span>}
                  </div>

                  <div
                    onClick={() => executeRecallQuery("keys")}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      idleFocusIdx === 1
                        ? "border-emerald-400 bg-emerald-950/40 text-white ring-2 ring-emerald-400/50"
                        : "border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-4 h-4 text-sky-400" />
                      <span className="font-semibold">[2] RECALL LAST SIGHTING</span>
                    </div>
                    {idleFocusIdx === 1 && <span className="text-xs text-emerald-300">ENTER ↵</span>}
                  </div>

                  <div
                    onClick={() => {
                      if (trackedItems.length > 0) {
                        const first = trackedItems[0];
                        setActiveRecallResult({
                          itemName: first.item_name,
                          location: first.last_location_description,
                          landmarks: first.last_landmarks,
                          observedAt: first.last_observed_at,
                          coordinates: first.coordinates,
                        });
                        setHudState("RECALLING");
                      } else {
                        executeRecallQuery("keys");
                      }
                    }}
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      idleFocusIdx === 2
                        ? "border-emerald-400 bg-emerald-950/40 text-white ring-2 ring-emerald-400/50"
                        : "border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold">[3] RECENT MEMORIES ({trackedItems.length})</span>
                    </div>
                    {idleFocusIdx === 2 && <span className="text-xs text-emerald-300">ENTER ↵</span>}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: CAPTURING & ANALYZING */}
            {hudState === "CAPTURING" && (
              <div className="flex flex-col items-center justify-center space-y-6 text-center">
                <div className="relative w-36 h-36 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center bg-black/60">
                  <div className="absolute inset-2 border border-dashed border-emerald-400/40 rounded-xl animate-spin" />
                  <Camera className="w-10 h-10 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-wider text-white">ANALYZING POV FRAME</h2>
                  <p className="text-xs text-emerald-400 font-mono mt-2">META VISION AI ENGINE RUNNING...</p>
                </div>
              </div>
            )}

            {/* VIEW 3: CONFIRMING CANDIDATES */}
            {hudState === "CONFIRMING" && detectedCandidates.length > 0 && (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="text-xs font-mono text-emerald-400 tracking-wider">
                  ITEM {selectedCandidateIdx + 1} OF {detectedCandidates.length} DETECTED
                </div>

                {/* Candidate Card */}
                {(() => {
                  const candidate = detectedCandidates[selectedCandidateIdx];
                  return (
                    <div className="w-full max-w-md p-5 rounded-2xl bg-gray-900/80 border-2 border-emerald-400 ring-2 ring-emerald-400/30 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                          {candidate.category || "Belonging"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {candidate.confidence.toUpperCase()} CONFIDENCE
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">{candidate.item_name}</h3>
                      <p className="text-xs text-gray-300 mb-3">{candidate.description}</p>

                      <div className="text-xs font-mono text-gray-400 space-y-1 border-t border-gray-800 pt-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{candidate.location_description}</span>
                        </div>
                        {candidate.landmarks && candidate.landmarks.length > 0 && (
                          <div className="text-[11px] text-gray-500 pl-5">
                            Near: {candidate.landmarks.join(" • ")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Action Controls */}
                <div className="w-full max-w-md flex items-center justify-between text-xs font-mono pt-2">
                  <button
                    onClick={() => setHudState("IDLE")}
                    className="px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white"
                  >
                    DISCARD [ESC]
                  </button>
                  <span className="text-gray-500">SWIPE ◄ ►</span>
                  <button
                    onClick={confirmSelectedCandidate}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SAVE MEMORY [ENTER]</span>
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: RECALLING GROUNDED MEMORY */}
            {hudState === "RECALLING" && (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="text-xs font-mono text-sky-400 tracking-wider">
                  GROUNDED HISTORICAL SIGHTING
                </div>

                {activeRecallResult ? (
                  <div className="w-full max-w-md p-5 rounded-2xl bg-gray-900/90 border border-sky-400/80 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-sky-300">FOUND IN YAAD MEMORY</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                        <Clock className="w-3 h-3 text-sky-400" />
                        {new Date(activeRecallResult.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white">{activeRecallResult.itemName}</h3>

                    <div className="p-3 rounded-xl bg-black/60 border border-gray-800 text-xs font-mono space-y-1.5">
                      <div className="flex items-start gap-1.5 text-gray-200">
                        <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <span>{activeRecallResult.location}</span>
                      </div>
                      {activeRecallResult.landmarks.length > 0 && (
                        <div className="text-gray-400 text-[11px] pl-5.5">
                          Landmarks: {activeRecallResult.landmarks.join(" • ")}
                        </div>
                      )}
                    </div>

                    {activeRecallResult.speechSummary && (
                      <p className="text-xs text-sky-200 italic">&ldquo;{activeRecallResult.speechSummary}&rdquo;</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setHudState("IDLE")}
                        className="text-xs text-gray-400 hover:text-white font-mono"
                      >
                        BACK [ESC]
                      </button>
                      <button
                        onClick={() => setHudState("NAVIGATING")}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs flex items-center gap-1.5 font-mono"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>NAVIGATE [ENTER]</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 font-mono text-xs">
                    NO RECORD MATCHING QUERY
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: PROACTIVE DEPARTURE ALERT */}
            {hudState === "DEPARTURE_ALERT" && (
              <div className="w-full max-w-md p-6 rounded-2xl bg-amber-950/80 border-2 border-amber-400 ring-4 ring-amber-400/20 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400 mx-auto flex items-center justify-center animate-bounce">
                  <AlertTriangle className="w-8 h-8 text-amber-300" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-amber-300 font-mono tracking-wider">
                    ⚠️ PROACTIVE DEPARTURE ALERT
                  </h2>
                  <p className="text-sm font-semibold text-white mt-1">
                    Did you take your {departureAlertItem}?
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-amber-900/60 text-xs font-mono text-left space-y-1 text-gray-300">
                  <div>• Geofence breach: moved {Math.round(displacementMeters)}m away</div>
                  <div>• Last seen stationary at table</div>
                  <div>• Timestamp: 3 minutes ago</div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs font-mono">
                  <button
                    onClick={() => setHudState("IDLE")}
                    className="px-3 py-1.5 rounded border border-gray-700 text-gray-400"
                  >
                    DISMISS [ESC]
                  </button>
                  <button
                    onClick={() => setHudState("RECALLING")}
                    className="px-3 py-1.5 rounded bg-amber-400 text-black font-bold"
                  >
                    CHECK SIGHTING [ENTER]
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 6: NAVIGATION HANDOFF */}
            {hudState === "NAVIGATING" && (
              <div className="w-full max-w-md p-6 rounded-2xl bg-gray-900/90 border-2 border-sky-400 text-left space-y-4 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sky-400 font-bold tracking-wider">GROUNDED NAVIGATION</span>
                  <Navigation className="w-4 h-4 text-sky-400 animate-pulse" />
                </div>

                <h3 className="text-lg font-bold text-white">
                  Navigate to {activeRecallResult?.itemName || "Belonging"}
                </h3>

                <div className="p-3 rounded-xl bg-black/60 border border-gray-800 text-xs space-y-1 text-gray-300">
                  <div>📍 Coordinates: ({currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)})</div>
                  <div>🏛 Landmark: {activeRecallResult?.location || "Cafe Table"}</div>
                  <div>🚶 Direct Walking Path: ~{Math.round(displacementMeters || 45)} meters return</div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    onClick={() => setHudState("RECALLING")}
                    className="text-gray-400 hover:text-white"
                  >
                    BACK [ESC]
                  </button>
                  <a
                    href={generateGoogleMapsUrl(currentCoords.latitude, currentCoords.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-sky-400 text-black font-bold flex items-center gap-1.5"
                  >
                    <span>LAUNCH MAP DIRECTIONS [ENTER]</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ----------------- HUD FOOTER (Status & Voice Indicator) ----------------- */}
          <div className="relative z-10 border-t border-gray-800/80 pt-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate max-w-[420px]">
              <span className="text-emerald-400">❯</span>
              <span className="text-gray-300 tracking-wide truncate">{statusMessage}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isListeningVoice ? (
                <span className="flex items-center gap-1 text-sky-400 animate-pulse">
                  <Mic className="w-3.5 h-3.5" />
                  <span>LISTENING...</span>
                </span>
              ) : (
                <span className="text-gray-600 text-[11px]">[V] VOICE PTT</span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PHASE 23B: DEVELOPMENT-ONLY VIRTUAL HARDWARE ADAPTER                      */}
        {/* ========================================================================= */}
        {isDevToolbarOpen && isVirtualHardwareAuthorized() && (
          <div className="w-[420px] bg-gray-900/90 rounded-2xl border border-gray-800 p-5 font-mono text-xs text-gray-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>VIRTUAL HARDWARE ADAPTER</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                DEV ONLY
              </span>
            </div>

            {/* 1. Camera POV Frame Injection */}
            <div className="space-y-2">
              <label className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                1. Eye-Level POV Camera Injection
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedScene.id}
                  onChange={(e) => {
                    const found = POV_SCENE_PRESETS.find((p) => p.id === e.target.value);
                    if (found) setSelectedScene(found);
                  }}
                  className="flex-1 bg-black border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {POV_SCENE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => triggerCaptureAndAnalyze()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shrink-0"
                >
                  Snap Frame
                </button>
              </div>

              {/* Mac Webcam Option */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                <span>Or use Mac FaceTime HD camera:</span>
                <button
                  onClick={() => setIsLiveWebcamActive(!isLiveWebcamActive)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isLiveWebcamActive ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {isLiveWebcamActive ? "● Webcam Active" : "Enable Webcam"}
                </button>
              </div>
            </div>

            {/* 2. Voice Command Dispatch */}
            <div className="space-y-2 border-t border-gray-800 pt-3">
              <label className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                2. Spoken Voice Command Trigger
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VIRTUAL_VOICE_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.transcript}
                    onClick={() => handleVoiceCommand(cmd.transcript)}
                    className="p-2 rounded-lg bg-black hover:bg-gray-800 border border-gray-800 text-left text-[11px] text-sky-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold">{cmd.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. GPS Movement & Departure Simulation */}
            <div className="space-y-2 border-t border-gray-800 pt-3">
              <label className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                3. Geofence Departure Simulation
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimulateDeparture(0)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px]"
                >
                  Reset (0m)
                </button>
                <button
                  onClick={() => handleSimulateDeparture(15)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px]"
                >
                  +15m Safe
                </button>
                <button
                  onClick={() => handleSimulateDeparture(50)}
                  className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px]"
                >
                  +50m Breach!
                </button>
              </div>
            </div>

            {/* 4. On-Screen D-Pad Controller */}
            <div className="space-y-2 border-t border-gray-800 pt-3">
              <label className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                4. On-Screen D-Pad / Touchpad Swipes
              </label>
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <button
                  onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }))}
                  className="w-12 h-8 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center font-bold"
                >
                  ▲
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))}
                    className="w-12 h-8 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center font-bold"
                  >
                    ◄
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))}
                    className="w-14 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                  >
                    ENTER
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))}
                    className="w-12 h-8 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center font-bold"
                  >
                    ►
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))}
                    className="w-12 h-8 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center font-bold"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))}
                    className="w-14 h-8 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[11px]"
                  >
                    ESC
                  </button>
                </div>
              </div>
            </div>

            {/* Shared Persistence Status */}
            <div className="p-2.5 rounded-lg bg-black/70 border border-gray-800 text-[10px] space-y-1">
              <div className="text-gray-400">SHARED PERSISTENCE STATUS:</div>
              <div className="text-emerald-400">
                • Mode: {isConfigured && user ? "Supabase Cloud (RLS Active)" : "LocalStorage (Offline Demo)"}
              </div>
              <div className="text-gray-400">• User: {user?.email || "demo-user"}</div>
              <div className="text-gray-400">• Tracked Belongings: {trackedItems.length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
