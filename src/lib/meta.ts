import type { AnalyzeRequestInput, CandidateItemOutput } from "./schemas.ts";
import { getVisionProvider } from "./vision/factory.ts";
import { BudgetManager } from "./vision/budget.ts";
import { computeCacheKey as internalComputeCacheKey } from "./vision/cache.ts";
import type { UsageLedgerEntry } from "../types/index.ts";

/**
 * Server-only Meta Model API Adapter for Yaad
 * Backwards-compatible facade over the modular VisionProvider architecture.
 * Integrates with Meta Muse (`muse-spark-1.3`), enforces budget guardrails ($5 initial testing cap),
 * and provides offline fallback for Demo Mode.
 */

export function getUsageLedger(): {
  ledger: UsageLedgerEntry[];
  totalCostUsd: number;
  totalRequests: number;
  cacheHits: number;
  budgetRemainingUsd: number;
  killSwitchActive: boolean;
  budgetCapUsd: number;
  liveApiEnabled: boolean;
} {
  const summary = BudgetManager.getInstance().getSummary();
  return {
    ledger: summary.ledger,
    totalCostUsd: summary.totalCostUsd,
    totalRequests: summary.totalRequests,
    cacheHits: summary.cacheHits,
    budgetRemainingUsd: summary.budgetRemainingUsd,
    killSwitchActive: summary.killSwitchActive,
    budgetCapUsd: summary.budgetCapUsd,
    liveApiEnabled: summary.liveApiEnabled,
  };
}

export function computeCacheKey(
  userId: string,
  imageStr: string,
  query: string,
  model: string
): string {
  return internalComputeCacheKey(userId, imageStr, query, model);
}

export async function analyzeScene(input: AnalyzeRequestInput): Promise<{
  candidates: CandidateItemOutput[];
  source: "mock" | "cache" | "live_meta_api";
  metaModel: string;
  scene_context?: string;
  uncertainty_notes?: string;
  cached?: boolean;
}> {
  const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";
  const provider = getVisionProvider({
    isDemoMode: isDemo && !input.forceLive && input.requestedProvider !== "meta_muse",
    forceLive: input.forceLive,
    userId: input.userId,
    requestedProvider: input.requestedProvider,
  });

  const result = await provider.analyzeScene(input.image, {
    requestedQuery: input.requestedQuery,
    source: input.source,
    userId: input.userId,
    forceLive: input.forceLive,
  });

  return {
    candidates: result.candidates,
    scene_context: result.scene_context,
    uncertainty_notes: result.uncertainty_notes,
    source: result.source,
    metaModel: result.metaModel,
    cached: result.cached || false,
  };
}
