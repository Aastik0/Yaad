import type { CandidateItemOutput } from "../schemas.ts";
import type { ObservationSource, UsageLedgerEntry } from "../../types/index.ts";

export interface VisionAnalysisContext {
  requestedQuery?: string;
  source?: ObservationSource;
  userId?: string;
  forceLive?: boolean;
}

export interface VisionAnalysisResult {
  candidates: CandidateItemOutput[];
  source: "mock" | "cache" | "live_meta_api";
  metaModel: string;
  scene_context?: string;
  uncertainty_notes?: string;
  cached?: boolean;
  tokens?: {
    input: number;
    output: number;
    cached?: number;
  };
  costUsd?: number;
}

export interface BudgetLedgerSummary {
  ledger: UsageLedgerEntry[];
  totalCostUsd: number;
  totalRequests: number;
  cacheHits: number;
  budgetRemainingUsd: number;
  reservedUsd: number;
  killSwitchActive: boolean;
  liveApiEnabled: boolean;
  budgetCapUsd: number;
}

export interface VisionProvider {
  readonly providerId: string;
  readonly modelId: string;
  analyzeScene(image: string, context?: VisionAnalysisContext): Promise<VisionAnalysisResult>;
}

