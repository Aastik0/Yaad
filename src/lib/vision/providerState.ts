import { BudgetManager } from "./budget.ts";

export type VisionProviderType = "mock" | "meta_muse";

export interface VisionGateStatus {
  userSelected: boolean;
  liveApiEnabled: boolean;
  killSwitchInactive: boolean;
  hasApiKey: boolean;
  budgetAvailable: boolean;
  userAuthenticated: boolean;
}

export interface ProviderEligibility {
  activeProvider: VisionProviderType;
  userSelectedProvider: VisionProviderType;
  eligibleForLive: boolean;
  gates: VisionGateStatus;
  reasons: string[];
  budget: {
    spentUsd: number;
    budgetCapUsd: number;
    remainingUsd: number;
  };
}

/**
 * VisionProviderState
 * Centralized, server-validated state manager for AI Vision grounding provider selection.
 *
 * Guarantees:
 * 1. Default provider is always Mock AI (zero external calls, zero cost).
 * 2. Meta Muse is authorized ONLY when all 6 server gates pass:
 *    - Explicit user selection of Live AI
 *    - ENABLE_LIVE_META_API=true
 *    - META_REQUESTS_KILL_SWITCH=false
 *    - MODEL_API_KEY or META_API_KEY is configured
 *    - BudgetManager confirms remaining budget ($5.00 testing cap)
 *    - User is authenticated or developer confirmation is active
 * 3. Client cannot bypass server gates via request payloads alone.
 */
export class VisionProviderState {
  private static instance: VisionProviderState;
  private userSelectedProvider: VisionProviderType = "mock";
  private isDeveloperConfirmed = false;

  private constructor() {}

  public static getInstance(): VisionProviderState {
    if (!VisionProviderState.instance) {
      VisionProviderState.instance = new VisionProviderState();
    }
    return VisionProviderState.instance;
  }

  public getEligibility(userId?: string): ProviderEligibility {
    const budgetSummary = BudgetManager.getInstance().getSummary();
    const liveApiEnabled =
      process.env.ENABLE_LIVE_META_API === "true" ||
      process.env.ENABLE_LIVE_META_API === "1";
    const killSwitchInactive =
      process.env.META_REQUESTS_KILL_SWITCH !== "true" &&
      process.env.META_REQUESTS_KILL_SWITCH !== "1";
    const hasApiKey = Boolean(process.env.MODEL_API_KEY || process.env.META_API_KEY);
    const budgetAvailable = budgetSummary.budgetRemainingUsd > 0.0001;
    const userAuthenticated = Boolean(
      (userId && userId !== "demo-user") || this.isDeveloperConfirmed
    );
    const userSelected = this.userSelectedProvider === "meta_muse";

    const reasons: string[] = [];
    if (!userSelected) {
      reasons.push("Mock AI is currently selected by user");
    }
    if (!liveApiEnabled) {
      reasons.push("Live API disabled on server (ENABLE_LIVE_META_API=false)");
    }
    if (!killSwitchInactive) {
      reasons.push("Developer safety kill switch is active (META_REQUESTS_KILL_SWITCH=true)");
    }
    if (!hasApiKey) {
      reasons.push("Missing server credentials (MODEL_API_KEY or META_API_KEY)");
    }
    if (!budgetAvailable) {
      reasons.push(
        `Testing budget cap reached ($${budgetSummary.budgetCapUsd.toFixed(2)} limit, $${budgetSummary.budgetRemainingUsd.toFixed(4)} remaining)`
      );
    }
    if (!userAuthenticated) {
      reasons.push("Live inference requires authenticated account or developer confirmation");
    }

    const eligibleForLive =
      liveApiEnabled &&
      killSwitchInactive &&
      hasApiKey &&
      budgetAvailable &&
      userAuthenticated;

    const activeProvider: VisionProviderType =
      userSelected && eligibleForLive ? "meta_muse" : "mock";

    return {
      activeProvider,
      userSelectedProvider: this.userSelectedProvider,
      eligibleForLive,
      gates: {
        userSelected,
        liveApiEnabled,
        killSwitchInactive,
        hasApiKey,
        budgetAvailable,
        userAuthenticated,
      },
      reasons,
      budget: {
        spentUsd: budgetSummary.totalCostUsd,
        budgetCapUsd: budgetSummary.budgetCapUsd,
        remainingUsd: budgetSummary.budgetRemainingUsd,
      },
    };
  }

  public selectProvider(
    provider: VisionProviderType,
    options?: { userId?: string; developerConfirmed?: boolean }
  ): { success: boolean; activeProvider: VisionProviderType; error?: string } {
    if (options?.developerConfirmed !== undefined) {
      this.isDeveloperConfirmed = options.developerConfirmed;
    }

    if (provider === "mock") {
      this.userSelectedProvider = "mock";
      this.isDeveloperConfirmed = false;
      return { success: true, activeProvider: "mock" };
    }

    // Evaluate live eligibility
    this.userSelectedProvider = "meta_muse";
    const eligibility = this.getEligibility(options?.userId);

    if (!eligibility.eligibleForLive) {
      // Revert selection to mock because server gates failed
      this.userSelectedProvider = "mock";
      const blockingReasons = eligibility.reasons.filter(
        (r) => !r.includes("Mock AI is currently selected")
      );
      return {
        success: false,
        activeProvider: "mock",
        error: `Cannot activate Meta Muse: ${blockingReasons.join("; ")}`,
      };
    }

    return { success: true, activeProvider: "meta_muse" };
  }

  public getActiveProvider(userId?: string): VisionProviderType {
    return this.getEligibility(userId).activeProvider;
  }

  public setDeveloperConfirmed(confirmed: boolean): void {
    this.isDeveloperConfirmed = confirmed;
  }

  public disarm(): void {
    this.userSelectedProvider = "mock";
    this.isDeveloperConfirmed = false;
  }

  public resetForTesting(): void {
    this.userSelectedProvider = "mock";
    this.isDeveloperConfirmed = false;
  }
}

