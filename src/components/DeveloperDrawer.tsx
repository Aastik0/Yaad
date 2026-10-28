import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Zap,
  Database,
  DollarSign,
  Activity,
  Layers,
  Lock,
  RotateCcw,
} from "lucide-react";
import { UsageLedgerEntry } from "@/types";

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
}

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({ isOpen, onClose }) => {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usage");
      const json = await res.json();
      if (json.success && json.data) {
        setUsage(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
                Meta Model API spend protection, usage ledger, and kill switch
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
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Budget Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Planned Spend Ceiling */}
            <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-300">
              <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                Planned Spend Ceiling
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-forest-900">
                  ${usage?.totalCostUsd.toFixed(4) || "0.0000"}
                </span>
                <span className="text-xs text-stone-400">/ $75.00</span>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Hard project budget cap
              </p>
            </div>

            {/* Untouched Reserve */}
            <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100">
              <span className="text-[10px] uppercase font-semibold text-forest-800 block">
                Untouched Reserve
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-forest-900">$75.00</span>
                <span className="text-xs text-forest-700">reserved</span>
              </div>
              <p className="text-[10px] text-forest-700 mt-1">
                Preserved from $150 credit
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
                    : "Inactive: Mock/Live calls protected by $75 cap"}
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
                onClick={fetchUsage}
                disabled={loading}
                className="text-stone-500 hover:text-forest-800 flex items-center gap-1 font-normal text-[11px]"
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
            className="px-4 py-1.5 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-xs font-semibold text-charcoal-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

