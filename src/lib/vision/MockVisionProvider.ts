import type { VisionProvider, VisionAnalysisContext, VisionAnalysisResult } from "./types.ts";
import { analyzeSceneWithMock } from "../mockVision.ts";
import { BudgetManager } from "./budget.ts";

/**
 * MockVisionProvider
 * Offline-first visual grounding provider for Yaad Demo Mode and safe fallback.
 * Generates deterministic, grounded candidate items matching user query keywords
 * with realistic simulated latency and zero external network calls.
 */
export class MockVisionProvider implements VisionProvider {
  public readonly providerId = "mock";
  public readonly modelId = "mock-fixture-engine";

  public async analyzeScene(
    _image: string,
    context?: VisionAnalysisContext
  ): Promise<VisionAnalysisResult> {
    const rawCandidates = await analyzeSceneWithMock({
      requestedQuery: context?.requestedQuery,
      source: context?.source,
    });

    const candidates = rawCandidates.map((c) => ({
      id: c.id,
      item_name: c.item_name,
      category: c.category,
      location_description: c.location_description,
      landmarks: c.landmarks,
      description: c.description,
      confidence: c.confidence,
      is_selected: c.is_selected,
    }));

    // Record zero-cost entry in the usage ledger
    BudgetManager.getInstance().recordZeroCostEntry({
      id: `entry_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      model: this.modelId,
      input_tokens: 0,
      output_tokens: 0,
      cached: false,
      estimated_cost_usd: 0,
      actual_cost_usd: 0,
      status: "success",
      notes: "Mock provider execution: 0 external network requests.",
      user_id: context?.userId || "demo-user",
    });

    return {
      candidates,
      source: "mock",
      metaModel: this.modelId,
      cached: false,
      tokens: { input: 0, output: 0 },
      costUsd: 0,
    };
  }
}

