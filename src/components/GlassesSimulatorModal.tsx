import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Glasses,
  Mic,
  Volume2,
  MapPin,
  Sparkles,
  ShieldCheck,
  Check,
  BatteryCharging,
  Eye,
  Info,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Cloud,
  HardDrive,
  Zap,
  ArrowRight,
  Maximize2,
  Loader2,
} from "lucide-react";
import {
  CandidateItem,
  GeoLocationCoordinates,
  TrackedItem,
  PersonMemory,
  ItemObservation,
} from "@/types";
import {
  simulateGlassesCapture,
  generateSimulatedGlassesPovFrame,
  GlassesDeviceState,
} from "@/lib/glassesSimulator";
import { speakCalmReminder, speakRecallResult } from "@/lib/speech";
import { SecureImage } from "./SecureImage";
import { StatusChip } from "./StatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { isRealDeviceCoordinates, calculateDistanceMeters } from "@/lib/geo";

interface GlassesSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords?: GeoLocationCoordinates | null;
  onConfirmCandidates: (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera",
    coordinates?: GeoLocationCoordinates
  ) => void;
  trackedItems?: TrackedItem[];
  onMarkCollected?: (id: string) => Promise<void> | void;
  onMarkLeftBehind?: (id: string) => Promise<void> | void;
  peopleMemories?: PersonMemory[];
}

type SimulatorTab = "capture" | "recall" | "departure" | "people";

export const GlassesSimulatorModal: React.FC<GlassesSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentCoords,
  onConfirmCandidates,
  trackedItems = [],
  onMarkCollected,
  onMarkLeftBehind,
  peopleMemories = [],
}) => {
  const { user } = useAuth();

  // Navigation tab within the simulator
  const [activeTab, setActiveTab] = useState<SimulatorTab>("capture");

  // Telemetry & Hardware status
  const [deviceState, setDeviceState] = useState<GlassesDeviceState>({
    isDonned: true,
    batteryPercent: 88,
    connectionState: "connected",
    model: "meta_ray_ban_display",
  });

  // Capture State
  const [selectedScenario, setSelectedScenario] = useState<string>(
    "Coffee Table (Keys & Leather Wallet)"
  );
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [analyzedCandidates, setAnalyzedCandidates] = useState<CandidateItem[] | null>(null);
  const [customQuery, setCustomQuery] = useState<string>("");
  const [showCustomQuery, setShowCustomQuery] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<"mock" | "meta_muse">("mock");
  const [showLiveConfirmDialog, setShowLiveConfirmDialog] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Recall State
  const [recallQuery, setRecallQuery] = useState<string>("");
  const [isRecalling, setIsRecalling] = useState<boolean>(false);
  const [recalledItem, setRecalledItem] = useState<{
    item: TrackedItem;
    speechSummary?: string;
    latestObservation?: ItemObservation;
  } | null>(null);
  const [recallNotFound, setRecallNotFound] = useState<string | null>(null);

  // Departure Simulation State
  const [simulatedDistanceMeters, setSimulatedDistanceMeters] = useState<number>(0);
  const [departureAlertActive, setDepartureAlertActive] = useState<boolean>(false);

  // People Memory State
  const [selectedPerson, setSelectedPerson] = useState<PersonMemory | null>(null);
  const [personQuery, setPersonQuery] = useState<string>("");

  // Determine whether coordinates are real device GPS or simulated
  const isRealGps = currentCoords ? isRealDeviceCoordinates(currentCoords) : false;
  const effectiveCoords: GeoLocationCoordinates = currentCoords || {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    place_name: "Simulated San Francisco",
  };

  // Fetch active vision provider configuration
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings/vision-provider")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.activeProvider) {
          setActiveProvider(data.activeProvider);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // 1. Unified AI Capture & Scene Analysis (Priority 2A)
  // -------------------------------------------------------------
  const handleSimulateCapture = async (liveConfirmed = false, queryOverride?: string) => {
    if (activeProvider === "meta_muse" && !liveConfirmed) {
      setShowLiveConfirmDialog(true);
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);
    simulateGlassesCapture("voice_shortcut", effectiveCoords);
    const povFrame = generateSimulatedGlassesPovFrame(selectedScenario);

    const effectiveQuery = queryOverride !== undefined ? queryOverride : customQuery.trim();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: povFrame,
          requestedQuery: effectiveQuery,
          source: "glasses_sdk",
          userId: user?.id || "demo-user",
          forceLive: liveConfirmed,
        }),
      });

      const data = await response.json();

      if (response.status === 403 && data.code === "developer_confirmation_required") {
        setShowLiveConfirmDialog(true);
        setIsCapturing(false);
        return;
      }

      if (data.success && Array.isArray(data.candidates)) {
        setAnalyzedCandidates(
          data.candidates.map((c: CandidateItem) => ({
            ...c,
            is_selected: true,
          }))
        );
      } else {
        setCaptureError(data.error || "No items detected in this scene.");
      }
    } catch (err: unknown) {
      console.error("[GlassesSimulator] Capture error:", err);
      setCaptureError((err as Error)?.message || "Failed to analyze POV frame.");
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleSelectCandidate = (id: string) => {
    if (!analyzedCandidates) return;
    setAnalyzedCandidates(
      analyzedCandidates.map((c) =>
        c.id === id ? { ...c, is_selected: !c.is_selected } : c
      )
    );
  };

  const handleRememberSelected = () => {
    if (!analyzedCandidates) return;
    const selected = analyzedCandidates.filter((c) => c.is_selected);
    if (selected.length === 0) return;
    const povFrame = generateSimulatedGlassesPovFrame(selectedScenario);

    onConfirmCandidates(
      selected,
      povFrame,
      "browser_camera",
      isRealGps ? currentCoords || undefined : undefined
    );
    setAnalyzedCandidates(null);
    onClose();
  };

  const handleRememberEverything = () => {
    if (!analyzedCandidates) return;
    const all = analyzedCandidates.map((c) => ({ ...c, is_selected: true }));
    const povFrame = generateSimulatedGlassesPovFrame(selectedScenario);

    onConfirmCandidates(
      all,
      povFrame,
      "browser_camera",
      isRealGps ? currentCoords || undefined : undefined
    );
    setAnalyzedCandidates(null);
    onClose();
  };

  // -------------------------------------------------------------
  // 2. Glanceable Recall Integration (Priority 2B)
  // -------------------------------------------------------------
  const handleExecuteRecall = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setRecallQuery(q);
    setIsRecalling(true);
    setRecallNotFound(null);
    setRecalledItem(null);

    try {
      const response = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await response.json();

      if (data.success && data.found && data.item) {
        // Find matching item in local trackedItems to get fresh status
        const localMatch =
          trackedItems.find(
            (t) => t.item_name.toLowerCase() === data.item.item_name.toLowerCase()
          ) || data.item;

        setRecalledItem({
          item: localMatch,
          speechSummary: data.speechSummary,
          latestObservation: data.latestObservation,
        });

        if (data.speechSummary) {
          speakCalmReminder(data.speechSummary);
        } else {
          speakRecallResult(localMatch.item_name, localMatch.last_location_description);
        }
      } else {
        setRecallNotFound(q);
        speakRecallResult(q, null);
      }
    } catch (err: unknown) {
      console.error("[GlassesSimulator] Recall error:", err);
      // Fallback: match from client-side trackedItems
      const qLower = q.toLowerCase();
      const match = trackedItems.find(
        (t) =>
          t.item_name.toLowerCase().includes(qLower) ||
          qLower.includes(t.item_name.toLowerCase())
      );
      if (match) {
        setRecalledItem({ item: match });
        speakRecallResult(match.item_name, match.last_location_description);
      } else {
        setRecallNotFound(q);
        speakRecallResult(q, null);
      }
    } finally {
      setIsRecalling(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Mark as Collected Interaction (Priority 2C)
  // -------------------------------------------------------------
  const handleMarkItemCollected = async (itemId: string) => {
    if (onMarkCollected) {
      await onMarkCollected(itemId);
    }
    // Update local state if currently viewing this item
    if (recalledItem && recalledItem.item.id === itemId) {
      setRecalledItem({
        ...recalledItem,
        item: { ...recalledItem.item, status: "collected" },
      });
    }
    speakCalmReminder(
      `Marked ${recalledItem?.item.item_name || "item"} as collected. Safe travels!`
    );
  };

  // -------------------------------------------------------------
  // 4. Departure Movement & Geofencing (Priority 2D)
  // -------------------------------------------------------------
  const handleSimulateMovement = (meters: number) => {
    setSimulatedDistanceMeters(meters);
    const unconfirmed = trackedItems.filter(
      (t) => t.status === "tracked_unconfirmed" || t.status === "possibly_left_behind"
    );

    if (meters >= 30 && unconfirmed.length > 0) {
      setDepartureAlertActive(true);
      const targetItem = unconfirmed[0];
      if (onMarkLeftBehind) {
        onMarkLeftBehind(targetItem.id);
      }
      speakCalmReminder(
        `Meta Notice: You have stepped ${meters} meters away from your table. Did you remember your ${targetItem.item_name}?`
      );
    } else {
      setDepartureAlertActive(false);
      if (meters === 0) {
        speakCalmReminder("Returned to table origin. Safe within geofence.");
      }
    }
  };

  // -------------------------------------------------------------
  // 5. Conversational People Memory (Priority 2F)
  // -------------------------------------------------------------
  const handleRecallPerson = (personName: string) => {
    setPersonQuery(personName);
    const q = personName.toLowerCase().trim();
    const match = peopleMemories.find(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        q.includes(p.display_name.toLowerCase()) ||
        (p.context_or_relationship && p.context_or_relationship.toLowerCase().includes(q))
    );

    if (match) {
      setSelectedPerson(match);
      const speech = `${match.display_name} is your ${match.context_or_relationship || "friend"}. ${match.notes}`;
      speakCalmReminder(speech);
    } else {
      setSelectedPerson(null);
      speakCalmReminder(`I don't have any notes recorded for ${personName}.`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="glasses-simulator-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-700 text-ivory-50 flex items-center justify-center shadow-xs">
              <Glasses className="w-4 h-4 text-sage-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="glasses-simulator-title"
                  className="text-sm sm:text-base font-semibold text-forest-900"
                >
                  Meta Ray-Ban Virtual Simulator
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    user
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-sage-100 text-forest-800 border-sage-200"
                  }`}
                >
                  {user ? "Cloud Synced" : "Demo Mode"}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Meta Wearables DAT · 600×600 Optical Viewport &amp; Audio Simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors cursor-pointer"
            title="Close simulator (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex bg-ivory-200/80 p-1 border-b border-ivory-300 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("capture")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "capture"
                ? "bg-white text-forest-900 shadow-xs"
                : "text-stone-600 hover:text-forest-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-forest-700" />
            <span>POV Capture</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recall")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "recall"
                ? "bg-white text-forest-900 shadow-xs"
                : "text-stone-600 hover:text-forest-900"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-forest-700" />
            <span>Recall HUD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("departure")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "departure"
                ? "bg-white text-forest-900 shadow-xs"
                : "text-stone-600 hover:text-forest-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Departure</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "people"
                ? "bg-white text-forest-900 shadow-xs"
                : "text-stone-600 hover:text-forest-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-sage-600" />
            <span>People</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Device Telemetry Status Bar */}
          <div className="p-2.5 rounded-xl bg-ivory-100 border border-ivory-300 flex items-center justify-between text-xs text-charcoal-800 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-forest-900">
                <span
                  className={`w-2 h-2 rounded-full ${
                    deviceState.isDonned ? "bg-emerald-600 animate-pulse" : "bg-stone-400"
                  }`}
                />
                {deviceState.isDonned ? "Glasses Donned" : "Doffed (Off Face)"}
              </span>
              <span className="text-stone-300">|</span>
              <span className="flex items-center gap-1 text-stone-600">
                <BatteryCharging className="w-3.5 h-3.5 text-forest-700" />
                {deviceState.batteryPercent}%
              </span>
              <span className="text-stone-300">|</span>
              <span className="flex items-center gap-1 text-[11px] text-stone-600 font-mono">
                <MapPin className="w-3 h-3 text-forest-700" />
                {isRealGps ? (
                  <span>
                    GPS ±{currentCoords?.accuracy || 10}m ({effectiveCoords.latitude.toFixed(2)}° N)
                  </span>
                ) : (
                  <span className="text-stone-500">Simulated SF (37.77° N)</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  activeProvider === "meta_muse"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-forest-100 text-forest-800"
                }`}
              >
                {activeProvider === "meta_muse" ? "Meta Muse AI" : "Mock AI"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setDeviceState({ ...deviceState, isDonned: !deviceState.isDonned })
                }
                className="text-[10px] px-2 py-0.5 rounded bg-white border border-ivory-300 hover:bg-ivory-200 font-medium transition-colors"
              >
                Toggle
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: POV Capture & Scene Detection                          */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "capture" && (
            <div className="space-y-4">
              {/* 600x600 Display Viewport HUD Simulation */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-forest-800/40 bg-ivory-200/60 aspect-square max-w-[280px] mx-auto flex flex-col items-center justify-center p-4 text-center shadow-inner">
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[9px] font-mono text-forest-900 bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                  <Eye className="w-3 h-3 text-forest-700" />
                  <span>600 × 600 HUD</span>
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-mono text-stone-600 bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                  <MapPin className="w-3 h-3 text-forest-700" />
                  <span>{effectiveCoords.latitude.toFixed(2)}° N</span>
                </div>

                {/* Simulated Eye-Level Centerpiece */}
                <div className="space-y-1.5 p-3 bg-white/95 rounded-xl border border-ivory-300 max-w-[220px] shadow-sm">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-forest-800 block">
                    Eye-Level POV Frame
                  </span>
                  <p className="text-xs font-semibold text-charcoal-900 leading-tight">
                    {selectedScenario}
                  </p>
                  <span className="text-[9px] text-stone-500 block">
                    12MP Ray-Ban Optical Frame
                  </span>
                </div>

                {isCapturing && (
                  <div className="absolute inset-0 bg-forest-950/60 backdrop-blur-xs flex flex-col items-center justify-center text-ivory-50 text-xs font-semibold gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-sage-200" />
                    <span>Analyzing POV with {activeProvider === "meta_muse" ? "Meta Muse" : "AI"}...</span>
                  </div>
                )}
              </div>

              {/* Scenario Selector */}
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-charcoal-800 block text-[11px]">
                  Select Simulated POV Environment:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Coffee Table (Keys & Leather Wallet)",
                    "Work Desk (Reading Glasses & Bottle)",
                  ].map((scenario) => (
                    <button
                      key={scenario}
                      type="button"
                      onClick={() => setSelectedScenario(scenario)}
                      className={`p-2 rounded-lg text-left text-[11px] font-medium border transition-all cursor-pointer ${
                        selectedScenario === scenario
                          ? "border-forest-600 bg-forest-50/60 text-forest-900 font-semibold"
                          : "border-ivory-300 bg-white text-stone-600 hover:bg-ivory-50"
                      }`}
                    >
                      {scenario}
                    </button>
                  ))}
                </div>
              </div>

              {captureError && (
                <div className="p-2.5 rounded-lg bg-terracotta-50 border border-terracotta-200 text-xs text-terracotta-700 flex items-center justify-between gap-2">
                  <span>{captureError}</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateCapture(false)}
                    className="underline text-[11px] font-semibold hover:text-terracotta-900"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Trigger Voice Action */}
              {!analyzedCandidates ? (
                <div className="p-3.5 rounded-xl bg-forest-50/80 border border-forest-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-forest-700 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-forest-900 block">
                        &ldquo;Hey Meta, map my belongings&rdquo;
                      </span>
                      <span className="text-[11px] text-stone-600">
                        Dispatches POV frame directly to /api/analyze
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSimulateCapture(false)}
                    disabled={isCapturing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sage-200" />
                    <span>Capture &amp; Analyze</span>
                  </button>
                </div>
              ) : (
                /* Candidate Review in Simulator */
                <div className="space-y-3 pt-1">
                  <div className="flex items-start justify-between border-b border-ivory-200 pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-forest-900">
                        I spotted these belongings
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Choose what to remember. Unchecked items will not be saved.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnalyzedCandidates(null)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-forest-900 px-2 py-1 rounded hover:bg-ivory-100 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retake POV</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {analyzedCandidates.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => toggleSelectCandidate(c.id)}
                        className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 cursor-pointer select-none transition-all ${
                          c.is_selected
                            ? "border-forest-600 bg-forest-50/40 shadow-xs"
                            : "border-ivory-300 bg-white/60 opacity-60"
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-forest-900">
                              {c.item_name}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-forest-800 bg-forest-100 px-1.5 py-0.2 rounded">
                              {c.confidence}
                            </span>
                          </div>
                          <p className="text-stone-600 text-[11px]">
                            {c.location_description}
                          </p>
                          {c.landmarks && c.landmarks.length > 0 && (
                            <div className="flex items-center gap-1 pt-1 flex-wrap text-[10px] text-stone-500">
                              <span>Landmarks:</span>
                              {c.landmarks.map((lm, idx) => (
                                <span
                                  key={idx}
                                  className="bg-ivory-100 border border-ivory-300 px-1 py-0.2 rounded"
                                >
                                  {lm}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 mt-0.5 transition-all ${
                            c.is_selected
                              ? "bg-forest-700 border-forest-700 text-ivory-50"
                              : "border-stone-300 bg-white"
                          }`}
                        >
                          {c.is_selected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Optional: Tell Yaad what to look for */}
                  <div className="pt-1 border-t border-ivory-200">
                    <button
                      type="button"
                      onClick={() => setShowCustomQuery(!showCustomQuery)}
                      className="inline-flex items-center gap-1.5 text-xs text-forest-800 hover:text-forest-950 font-medium py-1"
                    >
                      <Search className="w-3.5 h-3.5 text-forest-700" />
                      <span>Tell Yaad what to look for</span>
                      {showCustomQuery ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {showCustomQuery && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-ivory-50 border border-ivory-200 space-y-1.5">
                        <p className="text-[11px] text-stone-600">
                          Looking for something specific? Type what to find and re-scan:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                            placeholder="e.g. keys, glasses, wallet..."
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-ivory-300 bg-white text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-600"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (customQuery.trim()) {
                                  handleSimulateCapture(false, customQuery.trim());
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={isCapturing || !customQuery.trim()}
                            onClick={() => handleSimulateCapture(false, customQuery.trim())}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-forest-700 hover:bg-forest-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Re-scan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRememberEverything}
                      disabled={analyzedCandidates.length === 0}
                      className="flex-1 py-2 rounded-xl border border-forest-600/40 text-forest-800 hover:bg-forest-100/60 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Remember Everything
                    </button>
                    <button
                      type="button"
                      onClick={handleRememberSelected}
                      disabled={analyzedCandidates.filter((c) => c.is_selected).length === 0}
                      className="flex-1 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        Remember Selected (
                        {analyzedCandidates.filter((c) => c.is_selected).length})
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: Glanceable Recall (Priority 2B & 2C)                   */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "recall" && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-forest-900">
                  Glanceable Memory Recall
                </h3>
                <p className="text-[11px] text-stone-500">
                  Simulate asking Meta glasses where your belongings were last observed.
                </p>
              </div>

              {/* Quick Simulated Voice Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-stone-600 font-medium block">
                  Simulated Voice Commands:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Where are my keys?",
                    "Where is my wallet?",
                    "Where did I leave my glasses?",
                  ].map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleExecuteRecall(phrase)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Mic className="w-3 h-3 text-forest-600" />
                      <span>&ldquo;{phrase}&rdquo;</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recallQuery}
                  onChange={(e) => setRecallQuery(e.target.value)}
                  placeholder="Or type an item name (e.g. keys)..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-600"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleExecuteRecall(recallQuery);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isRecalling || !recallQuery.trim()}
                  onClick={() => handleExecuteRecall(recallQuery)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-forest-700 hover:bg-forest-800 text-white disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {isRecalling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Recall</span>
                </button>
              </div>

              {/* Recalled Item Glanceable Card */}
              {recalledItem && (
                <div className="p-4 rounded-xl border border-forest-200 bg-forest-50/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-forest-900">
                        {recalledItem.item.item_name}
                      </span>
                      <StatusChip status={recalledItem.item.status} size="sm" />
                    </div>
                    {/* Mark Collected Action (Priority 2C) */}
                    {recalledItem.item.status !== "collected" && (
                      <button
                        type="button"
                        onClick={() => handleMarkItemCollected(recalledItem.item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>I Got This</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-charcoal-800">
                    <span className="text-stone-500 font-medium">Last recorded: </span>
                    <strong className="text-forest-900">
                      {recalledItem.item.last_location_description}
                    </strong>
                  </p>

                  {/* Landmarks */}
                  {recalledItem.item.last_landmarks &&
                    recalledItem.item.last_landmarks.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-stone-600">
                        <MapPin className="w-3 h-3 text-forest-700 shrink-0" />
                        <span>Landmarks:</span>
                        {recalledItem.item.last_landmarks.map((lm, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-2 py-0.5 rounded border border-ivory-300 text-[10px]"
                          >
                            {lm}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Scene Snapshot Preview */}
                  {(recalledItem.latestObservation?.image_reference ||
                    recalledItem.item.image_reference) && (
                    <div className="pt-2 border-t border-forest-100">
                      <span className="text-[10px] text-stone-500 font-medium block mb-1">
                        Scene Snapshot on File:
                      </span>
                      <SecureImage
                        imageReference={
                          recalledItem.latestObservation?.image_reference ||
                          recalledItem.item.image_reference
                        }
                        alt="Captured scene"
                        className="w-full max-h-36 object-cover rounded-lg border border-ivory-300"
                      />
                    </div>
                  )}

                  {/* Spoken summary repeat button */}
                  {recalledItem.speechSummary && (
                    <button
                      type="button"
                      onClick={() => speakCalmReminder(recalledItem.speechSummary!)}
                      className="inline-flex items-center gap-1.5 text-xs text-forest-800 hover:underline pt-1"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-forest-700" />
                      <span>Re-play Voice Announcement</span>
                    </button>
                  )}
                </div>
              )}

              {recallNotFound && (
                <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300 text-xs text-stone-600 text-center space-y-1">
                  <p className="font-semibold text-charcoal-800">
                    No recorded sighting for &ldquo;{recallNotFound}&rdquo;
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Try asking for &ldquo;keys&rdquo; or &ldquo;wallet&rdquo;, or map the item first in POV Capture.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: Departure & Geofencing (Priority 2D & 2E)             */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "departure" && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-forest-900">
                    Departure Intelligence &amp; Geofencing
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    Simulation
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Test walk-away displacement to trigger proactive smart-glasses left-behind warnings.
                </p>
              </div>

              {/* Displacement Stepper */}
              <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-300 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-charcoal-800">
                    Simulated Distance from Table:
                  </span>
                  <span className="font-mono text-sm font-bold text-forest-900">
                    {simulatedDistanceMeters}m
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { label: "0m (At Table)", meters: 0 },
                    { label: "15m (Safe)", meters: 15 },
                    { label: "35m (Breach!)", meters: 35 },
                    { label: "75m (Far Away)", meters: 75 },
                  ].map((btn) => (
                    <button
                      key={btn.meters}
                      type="button"
                      onClick={() => handleSimulateMovement(btn.meters)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        simulatedDistanceMeters === btn.meters
                          ? "bg-forest-700 text-white shadow-xs"
                          : "bg-white border border-ivory-300 text-stone-700 hover:bg-ivory-100"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Geofence Breach Banner */}
              {departureAlertActive ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ GEOFENCE BREACH: {simulatedDistanceMeters}m from Table</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    You have stepped outside the safe 30m geofence radius. An open-ear audio notice was dispatched to remind you to take your belongings.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      speakCalmReminder(
                        `Meta Notice: You have stepped ${simulatedDistanceMeters} meters away from your table. Did you remember your keys and wallet?`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs text-amber-900 underline font-semibold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Re-play Open-Ear Alert</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Distance ({simulatedDistanceMeters}m) is within the safe 30m radius. No alert triggered.
                  </span>
                </div>
              )}

              {/* Unconfirmed Items under watch */}
              <div className="space-y-1 text-xs">
                <span className="text-[11px] font-semibold text-stone-600 block">
                  Items Subject to Departure Alerts ({trackedItems.filter((t) => t.status !== "collected").length}):
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {trackedItems.filter((t) => t.status !== "collected").map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-white border border-ivory-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-charcoal-900">{item.item_name}</span>
                      <StatusChip status={item.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: Conversational People Memory (Priority 2F)            */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "people" && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-forest-900">
                  Conversational People Memory
                </h3>
                <p className="text-[11px] text-stone-500">
                  Whisper assistive notes about colleagues, care providers, and friends directly into your ear.
                </p>
              </div>

              {/* Quick People Query Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-stone-600 font-medium block">
                  Ask About Contacts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {peopleMemories.length > 0 ? (
                    peopleMemories.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleRecallPerson(person.display_name)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3 text-forest-600" />
                        <span>&ldquo;Who is {person.display_name.split(" ")[0]}?&rdquo;</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400">No people memories recorded yet.</span>
                  )}
                </div>
              </div>

              {/* Person Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={personQuery}
                  onChange={(e) => setPersonQuery(e.target.value)}
                  placeholder="Ask e.g. Elena, Marcus, Sarah..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-ivory-300 bg-white text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-600"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRecallPerson(personQuery);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!personQuery.trim()}
                  onClick={() => handleRecallPerson(personQuery)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-forest-700 hover:bg-forest-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Ask
                </button>
              </div>

              {/* Selected Person Card */}
              {selectedPerson && (
                <div className="p-3.5 rounded-xl border border-forest-200 bg-forest-50/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-forest-900">
                      {selectedPerson.display_name}
                    </span>
                    {selectedPerson.context_or_relationship && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sage-100 text-forest-800 font-medium">
                        {selectedPerson.context_or_relationship}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-800 leading-relaxed">
                    {selectedPerson.notes}
                  </p>
                  {selectedPerson.met_at && (
                    <span className="text-[11px] text-stone-500 block">
                      Met at: {selectedPerson.met_at}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      speakCalmReminder(
                        `${selectedPerson.display_name} is your ${selectedPerson.context_or_relationship || "friend"}. ${selectedPerson.notes}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs text-forest-800 hover:underline pt-1 cursor-pointer font-medium"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-forest-700" />
                    <span>Whisper Audio In Ear</span>
                  </button>
                </div>
              )}

              {/* Ethical AI Notice */}
              <div className="p-2.5 bg-ivory-100 rounded-lg border border-ivory-200 text-[11px] text-stone-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Ethical Guardrail:</strong> Strictly conversational note recall. Zero biometric facial recognition or camera surveillance of bystanders.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
            <span>
              {user ? `Connected to ${user.email}` : "Demo Mode · Zero credit spend"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors cursor-pointer"
          >
            Close Simulator
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Live Meta AI in Simulator */}
      {showLiveConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-ivory-300 shadow-2xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-700" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-forest-900">
                Confirm Live Meta AI Simulator Call
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                You are about to submit this simulated POV frame to Meta Model API (<strong>muse-spark-1.3</strong>).
              </p>
            </div>

            <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 text-[11px] text-stone-600 space-y-1">
              <p className="font-medium text-forest-900">Safety Gates:</p>
              <ul className="list-disc list-inside space-y-0.5 text-stone-500">
                <li>$5.00 spend cap enforced server-side</li>
                <li>Zero credentials exposed to browser</li>
                <li>SHA-256 duplicate image cache active</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLiveConfirmDialog(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-ivory-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLiveConfirmDialog(false);
                  handleSimulateCapture(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-200" />
                <span>Confirm &amp; Analyze</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
