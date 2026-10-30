import React, { useState } from "react";
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
} from "lucide-react";
import { CandidateItem, GeoLocationCoordinates } from "@/types";
import {
  simulateGlassesCapture,
  generateSimulatedGlassesPovFrame,
  GlassesDeviceState,
} from "@/lib/glassesSimulator";
import { speakCalmReminder } from "@/lib/speech";
import { analyzeSceneWithMock } from "@/lib/mockVision";

interface GlassesSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: GeoLocationCoordinates;
  onConfirmCandidates: (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera",
    coordinates?: GeoLocationCoordinates
  ) => void;
}

export const GlassesSimulatorModal: React.FC<GlassesSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentCoords,
  onConfirmCandidates,
}) => {
  const [deviceState, setDeviceState] = useState<GlassesDeviceState>({
    isDonned: true,
    batteryPercent: 88,
    connectionState: "connected",
    model: "meta_ray_ban_display",
  });

  const [selectedScenario, setSelectedScenario] = useState<string>("Coffee Table (Keys & Leather Wallet)");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [analyzedCandidates, setAnalyzedCandidates] = useState<CandidateItem[] | null>(null);

  if (!isOpen) return null;

  const handleSimulateVoiceCommand = async () => {
    setIsCapturing(true);
    const event = simulateGlassesCapture("voice_shortcut", currentCoords);

    // Run grounded mock analysis on the simulated POV frame
    try {
      const candidates = await analyzeSceneWithMock({
        requestedQuery: "keys and wallet",
        source: "browser_camera",
      });
      setAnalyzedCandidates(candidates);
    } catch {
      console.error("Simulator analysis error");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmAndTrack = () => {
    if (!analyzedCandidates) return;
    const selected = analyzedCandidates.filter((c) => c.is_selected);
    const povFrame = generateSimulatedGlassesPovFrame(selectedScenario);

    onConfirmCandidates(
      selected,
      povFrame,
      "browser_camera",
      currentCoords
    );
    setAnalyzedCandidates(null);
    onClose();
  };

  const handlePlaySpeakerSample = () => {
    speakCalmReminder(
      "Meta notice: You have stepped away from your coffee table. Your apartment keys and wallet were last recorded there. Did you remember to take them?"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-700 text-ivory-50 flex items-center justify-center">
              <Glasses className="w-4 h-4 text-sage-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-forest-900">
                  Meta Ray-Ban Virtual Simulator
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sage-100 text-forest-800 border border-sage-200">
                  Phase 9
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Mock Device Kit &amp; 600×600 Display Simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Device Status Bar */}
          <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300 flex items-center justify-between text-xs text-charcoal-800 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium text-forest-900">
                <span className={`w-2 h-2 rounded-full ${deviceState.isDonned ? "bg-forest-600 animate-pulse" : "bg-stone-400"}`} />
                {deviceState.isDonned ? "Glasses Worn (Donned)" : "Glasses Off (Doffed)"}
              </span>
              <span className="text-stone-400">|</span>
              <span className="flex items-center gap-1 text-stone-600">
                <BatteryCharging className="w-3.5 h-3.5 text-forest-700" />
                {deviceState.batteryPercent}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDeviceState({ ...deviceState, isDonned: !deviceState.isDonned })}
              className="text-[11px] px-2.5 py-1 rounded bg-white border border-ivory-300 hover:bg-ivory-200 font-medium transition-colors"
            >
              Toggle Don / Doff
            </button>
          </div>

          {/* 600x600 Display Viewport HUD Simulation */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-forest-800/40 bg-ivory-200/60 aspect-square max-w-[320px] mx-auto flex flex-col items-center justify-center p-4 text-center shadow-inner">
            <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-mono text-forest-900 bg-white/80 px-2 py-0.5 rounded shadow-xs">
              <Eye className="w-3 h-3 text-forest-700" />
              <span>600 × 600 HUD</span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono text-stone-600 bg-white/80 px-2 py-0.5 rounded shadow-xs">
              <MapPin className="w-3 h-3 text-forest-700" />
              <span>{currentCoords.latitude.toFixed(2)}° N</span>
            </div>

            {/* Simulated Eye-Level Centerpiece */}
            <div className="space-y-2 p-3 bg-white/90 rounded-xl border border-ivory-300 max-w-[240px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider font-bold text-forest-800 block">
                Eye-Level POV Frame
              </span>
              <p className="text-xs font-semibold text-charcoal-900">
                {selectedScenario}
              </p>
              <span className="text-[10px] text-stone-500 block">
                Ray-Ban 12MP POV Simulation
              </span>
            </div>

            {isCapturing && (
              <div className="absolute inset-0 bg-forest-900/40 backdrop-blur-xs flex items-center justify-center text-ivory-50 text-xs font-semibold">
                Snapping POV Frame &amp; Analyzing...
              </div>
            )}
          </div>

          {/* Scenario Selector */}
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-charcoal-800 block">
              Simulated POV Environment:
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
                  className={`p-2 rounded-lg text-left text-[11px] font-medium border transition-all ${
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

          {/* Trigger Voice Action */}
          {!analyzedCandidates ? (
            <div className="p-3.5 rounded-xl bg-forest-50/80 border border-forest-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-forest-700" />
                <div>
                  <span className="text-xs font-semibold text-forest-900 block">
                    Trigger: &ldquo;Hey Meta, map my belongings&rdquo;
                  </span>
                  <span className="text-[11px] text-stone-600">
                    Captures POV frame + current GPS coordinates
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulateVoiceCommand}
                disabled={isCapturing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Voice</span>
              </button>
            </div>
          ) : (
            /* Candidate Review in Simulator */
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-forest-900">
                <span>POV Detections ({analyzedCandidates.length})</span>
                <span className="text-[11px] text-stone-500 font-normal">
                  Grounding: {selectedScenario}
                </span>
              </div>

              <div className="space-y-2">
                {analyzedCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-forest-200 bg-forest-50/30 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-forest-900 block">
                        {c.item_name}
                      </span>
                      <p className="text-stone-600 text-[11px]">
                        {c.location_description}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-forest-800 bg-forest-100 px-1.5 py-0.5 rounded">
                      {c.confidence}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleConfirmAndTrack}
                className="w-full py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Map to Yaad Memory</span>
              </button>
            </div>
          )}

          {/* Open-Ear Directional Speaker Audio Sample */}
          <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-300 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-forest-700" />
              <span className="text-stone-700 text-[11px]">
                Test Open-Ear Directional Speaker Announcement
              </span>
            </div>
            <button
              type="button"
              onClick={handlePlaySpeakerSample}
              className="text-xs text-forest-800 hover:text-forest-900 font-semibold px-2 py-1 rounded hover:bg-ivory-200"
            >
              Play Audio
            </button>
          </div>

          {/* Disclosure */}
          <div className="p-2.5 bg-ivory-100 rounded-lg border border-ivory-200 text-[11px] text-stone-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
            <span>
              <strong>MWDATMockDevice Architecture:</strong> This simulator conforms to official Meta Ray-Ban Display &amp; Wearables specs without requiring physical hardware.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between text-xs">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
            Zero credit spend in simulator mode
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
