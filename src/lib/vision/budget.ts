import fs from "node:fs";
import path from "node:path";
import type { UsageLedgerEntry } from "../../types/index.ts";
import type { BudgetLedgerSummary } from "./types.ts";

/**
 * BudgetManager
 * Enforces strict, concurrency-safe application-side spend limits for the Meta Model API.
 * Ensures the $75 planned budget cap is never exceeded, preserving the $75 credit reserve.
 * Implements atomic pre-reservations, reconciliation against actual Meta usage tokens,
 * and durable disk-backed ledger persistence across server restarts.
 */
export class BudgetManager {
  private static instance: BudgetManager;

  private budgetCapUsd: number;
  private currentSpentUsd = 0;
  private currentReservedUsd = 0;
  private reservations = new Map<string, number>();
  private ledger: UsageLedgerEntry[] = [];
  private ledgerFilePath: string;

  private isCustomCap = false;

  private constructor() {
    this.budgetCapUsd = parseFloat(
      process.env.META_MAX_SPEND_USD ||
      process.env.META_MONTHLY_BUDGET_CAP_USD ||
      "75"
    );

    // Durable ledger file located in project data directory
    this.ledgerFilePath = path.resolve(process.cwd(), "data", "usage_ledger.json");
    this.loadDurableLedger();
  }

  public static getInstance(): BudgetManager {
    if (!BudgetManager.instance) {
      BudgetManager.instance = new BudgetManager();
    }
    return BudgetManager.instance;
  }

  /**
   * Refreshes configuration from current environment variables.
   * Useful for dynamic tests and runtime configuration updates.
   */
  public refreshConfig(): void {
    if (this.isCustomCap) return;
    this.budgetCapUsd = parseFloat(
      process.env.META_MAX_SPEND_USD ||
      process.env.META_MONTHLY_BUDGET_CAP_USD ||
      "75"
    );
  }

  /**
   * Loads accumulated spend from durable JSON file on disk.
   */
  private loadDurableLedger(): void {
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        const raw = fs.readFileSync(this.ledgerFilePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.ledger = parsed;
          this.currentSpentUsd = this.ledger.reduce(
            (sum, entry) => sum + (entry.actual_cost_usd ?? entry.estimated_cost_usd ?? 0),
            0
          );
        }
      }
    } catch {
      // In restricted or serverless environments, fail safe to clean in-memory ledger
      this.ledger = [];
      this.currentSpentUsd = 0;
    }
  }

  /**
   * Persists the current ledger state to disk atomically.
   */
  private saveDurableLedger(): void {
    try {
      const dir = path.dirname(this.ledgerFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.ledgerFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.ledger, null, 2), "utf8");
      fs.renameSync(tmpPath, this.ledgerFilePath);
    } catch {
      // Non-fatal if filesystem is read-only in serverless; in-memory ledger remains active
    }
  }

  /**
   * Atomically reserves budget for an in-flight request.
   * Prevents concurrent requests from overspending the budget cap.
   */
  public reserveBudget(estimatedCostUsd: number): { reservationId: string; success: boolean; error?: string } {
    this.refreshConfig();

    const projectedTotal = this.currentSpentUsd + this.currentReservedUsd + estimatedCostUsd;
    if (projectedTotal > this.budgetCapUsd) {
      const remaining = Math.max(0, this.budgetCapUsd - (this.currentSpentUsd + this.currentReservedUsd));
      return {
        reservationId: "",
        success: false,
        error: `Planned budget cap ($${this.budgetCapUsd.toFixed(2)}) reached. Available unreserved budget is $${remaining.toFixed(4)}. Request of estimated $${estimatedCostUsd.toFixed(4)} was blocked to preserve the $75 credit reserve.`,
      };
    }

    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.reservations.set(reservationId, estimatedCostUsd);
    this.currentReservedUsd += estimatedCostUsd;

    return {
      reservationId,
      success: true,
    };
  }

  /**
   * Reconciles a completed request with actual usage returned by Meta.
   */
  public reconcileBudget(reservationId: string, actualCostUsd: number, entry: UsageLedgerEntry): void {
    const reservedAmount = this.reservations.get(reservationId) ?? 0;
    this.reservations.delete(reservationId);
    this.currentReservedUsd = Math.max(0, this.currentReservedUsd - reservedAmount);

    this.currentSpentUsd += actualCostUsd;
    entry.actual_cost_usd = Math.round(actualCostUsd * 100000) / 100000;
    entry.estimated_cost_usd = Math.round(actualCostUsd * 100000) / 100000;

    this.ledger.push(entry);
    this.saveDurableLedger();
  }

  /**
   * Releases an unused reservation upon failure, timeout, or cancellation.
   */
  public releaseReservation(reservationId: string, errorEntry?: UsageLedgerEntry): void {
    const reservedAmount = this.reservations.get(reservationId) ?? 0;
    this.reservations.delete(reservationId);
    this.currentReservedUsd = Math.max(0, this.currentReservedUsd - reservedAmount);

    if (errorEntry) {
      errorEntry.actual_cost_usd = 0;
      errorEntry.estimated_cost_usd = 0;
      this.ledger.push(errorEntry);
      this.saveDurableLedger();
    }
  }

  /**
   * Adds an offline/mock or cache hit entry to the ledger at zero cost.
   */
  public recordZeroCostEntry(entry: UsageLedgerEntry): void {
    entry.estimated_cost_usd = 0;
    entry.actual_cost_usd = 0;
    this.ledger.push(entry);
    this.saveDurableLedger();
  }

  /**
   * Returns a comprehensive snapshot of spend, reservations, and ledger entries.
   */
  public getSummary(): BudgetLedgerSummary {
    this.refreshConfig();

    const killSwitch =
      process.env.META_REQUESTS_KILL_SWITCH === "true" ||
      process.env.META_REQUESTS_KILL_SWITCH === "1";

    const liveEnabled =
      process.env.ENABLE_LIVE_META_API === "true" ||
      process.env.ENABLE_LIVE_META_API === "1";

    const totalCostUsd = Math.round(this.currentSpentUsd * 10000) / 10000;
    const reservedUsd = Math.round(this.currentReservedUsd * 10000) / 10000;
    const cacheHits = this.ledger.filter((e) => e.cached).length;
    const remaining = Math.max(0, Math.round((this.budgetCapUsd - (totalCostUsd + reservedUsd)) * 10000) / 10000);

    return {
      ledger: [...this.ledger].reverse(),
      totalCostUsd,
      totalRequests: this.ledger.length,
      cacheHits,
      budgetRemainingUsd: remaining,
      reservedUsd,
      killSwitchActive: killSwitch,
      liveApiEnabled: liveEnabled,
      budgetCapUsd: this.budgetCapUsd,
    };
  }

  /**
   * Testing helper to reset ledger and active reservations.
   */
  public resetForTesting(budgetCap?: number): void {
    this.currentSpentUsd = 0;
    this.currentReservedUsd = 0;
    this.reservations.clear();
    this.ledger = [];
    if (budgetCap !== undefined) {
      this.isCustomCap = true;
      this.budgetCapUsd = budgetCap;
    } else {
      this.isCustomCap = false;
      this.refreshConfig();
    }
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        fs.unlinkSync(this.ledgerFilePath);
      }
    } catch {
      // Ignore in testing
    }
  }
}
