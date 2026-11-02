import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Shield,
  Zap,
  Activity,
  Lock,
  RotateCcw,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { UsageLedgerEntry } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface DeveloperDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UsageSummary {
  ledger: UsageLedgerEntry[];
  totalCostUsd: number;
  totalRequests: number;
  cacheHits: number;
  budgetRemainingUsd: number;
  killSwitchActive: boolean;
  budgetCapUsd?: number;
  liveApiEnabled?: boolean;
}

interface ProviderEligibility {
  activeProvider: "mock" | "meta_muse";
  userSelectedProvider: "mock" | "meta_muse";
  eligibleForLive: boolean;
  gates: {
    userSelected: boolean;
    liveApiEnabled: boolean;
    killSwitchInactive: boolean;
    hasApiKey: boolean;
    budgetAvailable: boolean;
    userAuthenticated: boolean;
  };
  reasons: string[];
  budget: {
    spentUsd: number;
    budgetCapUsd: number;
    remainingUsd: number;
  };
}

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({ isOpen, onClose }) => {
  const { session } = useAuth();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [providerInfo, setProviderInfo] = useState<ProviderEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const [usageRes, providerRes] = await Promise.all([
        fetch("/api/usage"),
        fetch("/api/settings/vision-provider", { headers }),
      ]);

      const [usageJson, providerJson] = await Promise.all([
        usageRes.json(),
        providerRes.json(),
      ]);

      if (usageJson.success && usageJson.data) {
        setUsage(usageJson.data);
      }
      if (providerJson.success) {
        setProviderInfo(providerJson);
      }
    } catch (err) {
      console.error("Failed to fetch developer settings:", err);
      setErrorMessage("Could not load latest usage and provider status.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  const handleSelectProvider = async (targetProvider: "mock" | "meta_muse") => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // If selecting Meta Muse, prompt confirmation
    if (targetProvider === "meta_muse" && providerInfo?.activeProvider !== "meta_muse") {
      setShowConfirmModal(true);
      return;
    }

    await applyProviderSwitch(targetProvider);
  };

  const applyProviderSwitch = async (targetProvider: "mock" | "meta_muse") => {
    setSwitching(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/settings/vision-provider", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: targetProvider,
          developerConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to switch AI vision provider.");
      }

      setProviderInfo(data);
      setSuccessMessage(
        targetProvider === "meta_muse"
          ? "Meta Muse (Live AI) enabled. External calls are protected by the $5.00 testing cap."
          : "Switched to Mock AI (Free Mode). Zero external calls will be made."
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error updating provider.";
      setErrorMessage(msg);
    } finally {
      setSwitching(false);
      setShowConfirmModal(false);
    }
  };

  if (!isOpen) return null;

  const currentCap = usage?.budgetCapUsd ?? providerInfo?.budget.budgetCapUsd ?? 5.0;
  const currentSpent = usage?.totalCostUsd ?? providerInfo?.budget.spentUsd ?? 0.0;
  const currentRemaining = usage?.budgetRemainingUsd ?? providerInfo?.budget.remainingUsd ?? 5.0;
  const isLiveActive = providerInfo?.activeProvider === "meta_muse";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center">
              <Zap className="w-4 h-4 text-forest-700" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-forest-900">
                Developer Controls &amp; Credit Protection
              </h2>
              <p className="text-[11px] text-stone-500">
                AI Vision Provider Selection · Meta Model API Safeguards · Budget Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-terracotta-50 border border-terracotta-200 text-xs text-terracotta-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-terracotta-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Action Blocked</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-forest-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Configuration Updated</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Vision AI Provider Selector */}
          <div className="p-4 rounded-xl bg-ivory-50 border border-ivory-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-forest-700" />
                <span className="text-xs font-semibold text-forest-900">
                  Vision AI Grounding Provider
                </span>
              </div>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                  isLiveActive
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-forest-100 text-forest-800 border border-forest-200"
                }`}
              >
                {isLiveActive ? "● Meta Muse (Live AI)" : "● Mock AI (Free Mode)"}
              </span>
            </div>

            <p className="text-[11px] text-stone-500">
              Select the active scene understanding provider. Mock AI guarantees zero credit spend. Meta Muse connects to Meta Model API (`muse-spark-1.3`) under strict safety guardrails.
            </p>

            {/* Provider Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Mock AI */}
              <button
                type="button"
                onClick={() => handleSelectProvider("mock")}
                disabled={switching}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !isLiveActive
                    ? "bg-white border-forest-600 ring-2 ring-forest-600/20 shadow-xs"
                    : "bg-ivory-100/60 border-ivory-300 hover:bg-white hover:border-ivory-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-forest-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                    Mock AI (Free)
                  </span>
                  {!isLiveActive && (
                    <span className="text-[10px] uppercase font-bold text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Offline demo engine with instant grounded candidates and zero external network calls.
                </p>
              </button>

              {/* Option 2: Meta Muse */}
              <button
                type="button"
                onClick={() => handleSelectProvider("meta_muse")}
                disabled={switching || (!providerInfo?.eligibleForLive && !isLiveActive)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isLiveActive
                    ? "bg-white border-amber-600 ring-2 ring-amber-600/20 shadow-xs cursor-pointer"
                    : !providerInfo?.eligibleForLive
                    ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
                    : "bg-ivory-100/60 border-ivory-300 hover:bg-white hover:border-ivory-400 cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-forest-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Meta Muse (Live AI)
                  </span>
                  {isLiveActive ? (
                    <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  ) : !providerInfo?.eligibleForLive ? (
                    <span className="text-[10px] font-medium text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded">
                      Unavailable
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Meta Model API (`muse-spark-1.3`). Consumes credits from your $5.00 testing cap.
                </p>
                {!providerInfo?.eligibleForLive && !isLiveActive && providerInfo?.reasons && (
                  <span className="text-[10px] text-terracotta-700 block mt-1.5 font-medium">
                    Blocked: {providerInfo.reasons.find((r) => !r.includes("Mock AI")) || "Safety gates failed"}
                  </span>
                )}
              </button>
            </div>

            {/* Live Warning Notice */}
            {isLiveActive && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Live Inference Mode Active</span>
                  <span>
                    Camera captures will query Meta Model API (`muse-spark-1.3`). Credit consumption is bounded to your $5.00 cap. Each scene analysis requires explicit one-click confirmation.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Budget Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Planned Spend Ceiling */}
            <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-300">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                Testing Spend Ceiling
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-forest-900">
                  ${currentSpent.toFixed(4)}
                </span>
                <span className="text-xs text-stone-400">/ ${currentCap.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                ${currentRemaining.toFixed(4)} remaining
              </p>
            </div>

            {/* Untouched Reserve */}
            <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100">
              <span className="text-[10px] uppercase font-semibold text-forest-800 block">
                Untouched Reserve
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-forest-900">$145.00</span>
                <span className="text-xs text-forest-700">reserved</span>
              </div>
              <p className="text-[10px] text-forest-700 mt-1">
                Preserved from $150 credit pool
              </p>
            </div>

            {/* Cache Efficiency */}
            <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-300">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                Duplicate Cache
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-forest-900">
                  {usage?.cacheHits || 0}
                </span>
                <span className="text-xs text-stone-400">
                  / {usage?.totalRequests || 0} hits
                </span>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                SHA-256 duplicate cache
              </p>
            </div>
          </div>

          {/* Kill Switch & Safety Status */}
          <div className="p-3.5 rounded-xl border border-ivory-300 bg-ivory-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-forest-700" />
              <div>
                <span className="text-xs font-semibold text-forest-900 block">
                  Safety Kill Switch (META_REQUESTS_KILL_SWITCH)
                </span>
                <span className="text-[11px] text-stone-500">
                  {usage?.killSwitchActive
                    ? "Active: All live calls blocked"
                    : `Inactive: Protected by $${currentCap.toFixed(2)} testing spend cap`}
                </span>
              </div>
            </div>

            <span
              className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                usage?.killSwitchActive
                  ? "bg-terracotta-100 text-terracotta-800 border border-terracotta-200"
                  : "bg-forest-100 text-forest-800"
              }`}
            >
              {usage?.killSwitchActive ? "HALTED" : "PROTECTED"}
            </span>
          </div>

          {/* Request Ledger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-forest-900">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-forest-700" />
                <span>API Usage Ledger ({usage?.ledger.length || 0})</span>
              </span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="text-stone-500 hover:text-forest-800 flex items-center gap-1 font-normal text-[11px] cursor-pointer"
              >
                <RotateCcw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {(!usage?.ledger || usage.ledger.length === 0) ? (
              <div className="p-6 text-center bg-ivory-50 rounded-xl border border-ivory-200 text-xs text-stone-500">
                No external API requests recorded yet. Yaad is operating cleanly in zero-cost Demo Mode.
              </div>
            ) : (
              <div className="divide-y divide-ivory-200 border border-ivory-300 rounded-xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                {usage.ledger.map((entry) => (
                  <div key={entry.id} className="p-3 text-xs flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-charcoal-900 font-mono text-[11px]">
                          {entry.model}
                        </span>
                        {entry.cached && (
                          <span className="text-[10px] bg-sage-100 text-forest-800 px-1 rounded font-medium">
                            CACHED
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase font-semibold px-1 rounded ${
                            entry.status === "success"
                              ? "bg-forest-50 text-forest-700"
                              : "bg-terracotta-50 text-terracotta-700"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400">
                        {new Date(entry.timestamp).toLocaleTimeString()} · Tokens: {entry.input_tokens} in / {entry.output_tokens} out
                      </p>
                    </div>

                    <span className="font-mono text-xs font-semibold text-forest-900">
                      ${entry.estimated_cost_usd.toFixed(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between text-xs">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-forest-700" />
            API keys kept server-side; zero secret leakage.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Live Mode */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-ivory-300 shadow-2xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-forest-900">
                Confirm Live Meta AI Activation
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                You are about to enable <strong>Meta Muse (muse-spark-1.3)</strong>. Live scene analyses will make outbound requests to the Meta Model API and consume testing credits from your <strong>${currentCap.toFixed(2)} testing allowance</strong> (${currentRemaining.toFixed(4)} remaining).
              </p>
            </div>

            <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 text-[11px] text-stone-600 space-y-1">
              <p className="font-medium text-forest-900">Active Safeguards:</p>
              <ul className="list-disc list-inside space-y-0.5 text-stone-500">
                <li>Strict ${currentCap.toFixed(2)} total spend cap</li>
                <li>Kill switch halts calls immediately</li>
                <li>Confirmation prompt before each analysis</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-ivory-100 transition-colors cursor-pointer"
              >
                Cancel (Keep Free Mode)
              </button>
              <button
                type="button"
                onClick={() => applyProviderSwitch("meta_muse")}
                disabled={switching}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-200" />
                <span>{switching ? "Enabling..." : "Confirm & Enable Live AI"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
