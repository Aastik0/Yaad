import crypto from "node:crypto";
import type { AnalyzeRequest, CandidateItemOutput } from "./schemas.ts";
import { SceneAnalysisResponseSchema } from "./schemas.ts";
import { analyzeSceneWithMock } from "./mockVision.ts";
import type { UsageLedgerEntry } from "../types/index.ts";

/**
 * Server-only Meta Model API Adapter for Yaad
 * Encapsulates model communication, Zod schema validation, caching, budget guards, and mock fallbacks.
 */

// In-memory request cache (SHA-256 hash -> CandidateItemOutput[])
const requestCache = new Map<string, { candidates: CandidateItemOutput[]; timestamp: number }>();

// In-memory usage ledger for tracking developer spend and tokens
const usageLedger: UsageLedgerEntry[] = [];

// Estimated pricing for Llama 3.2 11B Vision: ~$0.18 per 1M input tokens, ~$0.18 per 1M output tokens
const COST_PER_1K_TOKENS_USD = 0.00018;

// Safety & Cost Configuration
const BUDGET_CAP_USD = parseFloat(process.env.META_MONTHLY_BUDGET_CAP_USD || "75");
const KILL_SWITCH = process.env.META_REQUESTS_KILL_SWITCH === "true";
const MODEL_ID = process.env.META_MODEL_ID || "llama-3.2-11b-vision-instruct";

export function getUsageLedger(): {
  ledger: UsageLedgerEntry[];
  totalCostUsd: number;
  totalRequests: number;
  cacheHits: number;
  budgetRemainingUsd: number;
  killSwitchActive: boolean;
} {
  const totalCostUsd = usageLedger.reduce((sum, entry) => sum + entry.estimated_cost_usd, 0);
  const cacheHits = usageLedger.filter((e) => e.cached).length;

  return {
    ledger: [...usageLedger].reverse(), // newest first
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalRequests: usageLedger.length,
    cacheHits,
    budgetRemainingUsd: Math.max(0, Math.round((BUDGET_CAP_USD - totalCostUsd) * 100) / 100),
    killSwitchActive: KILL_SWITCH,
  };
}

/**
 * Computes safe SHA-256 cache key without logging sensitive image contents
 */
function computeCacheKey(imageStr: string, query: string, model: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(model);
  hash.update(query.trim().toLowerCase());
  hash.update(imageStr.slice(0, 1024) + imageStr.slice(-1024)); // representative prefix+suffix
  return hash.digest("hex");
}

export async function analyzeScene(input: AnalyzeRequest): Promise<{
  candidates: CandidateItemOutput[];
  source: "mock" | "cache" | "live_meta_api";
  metaModel?: string;
  cached?: boolean;
}> {
  const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === "demo" || !process.env.META_API_KEY;

  // 1. Check Kill Switch
  if (KILL_SWITCH) {
    const entry: UsageLedgerEntry = {
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: MODEL_ID,
      input_tokens: 0,
      output_tokens: 0,
      cached: false,
      estimated_cost_usd: 0,
      status: "kill_switch_blocked",
      notes: "Request blocked by META_REQUESTS_KILL_SWITCH.",
    };
    usageLedger.push(entry);
    throw new Error("Meta AI requests are currently suspended by the developer safety kill switch.");
  }

  // 2. Fall back to Mock Provider if in Demo Mode or API key missing
  if (isDemoMode && !input.forceLive) {
    const mockCandidates = await analyzeSceneWithMock({
      requestedQuery: input.requestedQuery,
      source: input.source,
    });

    usageLedger.push({
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: "mock-fixture-engine",
      input_tokens: 0,
      output_tokens: 0,
      cached: false,
      estimated_cost_usd: 0,
      status: "success",
      notes: "Demo mode execution: zero external network requests.",
    });

    return {
      candidates: mockCandidates,
      source: "mock",
      metaModel: "mock-fixture-engine",
    };
  }

  // 3. Cache lookup
  const cacheKey = computeCacheKey(input.image, input.requestedQuery || "", MODEL_ID);
  const cachedHit = requestCache.get(cacheKey);
  if (cachedHit) {
    usageLedger.push({
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: MODEL_ID,
      input_tokens: 0,
      output_tokens: 0,
      cached: true,
      estimated_cost_usd: 0,
      status: "success",
      notes: "Exact duplicate request served from SHA-256 local cache.",
    });

    return {
      candidates: cachedHit.candidates,
      source: "cache",
      metaModel: MODEL_ID,
      cached: true,
    };
  }

  // 4. Budget check
  const currentTotal = usageLedger.reduce((sum, e) => sum + e.estimated_cost_usd, 0);
  if (currentTotal >= BUDGET_CAP_USD) {
    usageLedger.push({
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: MODEL_ID,
      input_tokens: 0,
      output_tokens: 0,
      cached: false,
      estimated_cost_usd: 0,
      status: "rate_limited",
      notes: `Planned budget cap ($${BUDGET_CAP_USD}) reached. Halting live calls.`,
    });
    throw new Error(
      `Planned budget cap ($${BUDGET_CAP_USD}) reached. To protect credits, live calls are paused.`
    );
  }

  // 5. Prepare Live Meta Model API Call
  // Structured prompt requiring schema conformity
  const systemPrompt = `You are Yaad's visual grounding assistant. You analyze images to detect personal belongings (keys, wallet, glasses, water bottle, bag) set down in a scene.
Your response MUST be strict valid JSON matching this schema:
{
  "candidates": [
    {
      "id": "string",
      "item_name": "string",
      "category": "string",
      "location_description": "grounded description stating where the item was seen resting",
      "landmarks": ["nearby landmark 1", "nearby landmark 2"],
      "description": "grounded factual sentence without speculating current status",
      "confidence": "high" | "medium" | "low" | "unknown",
      "is_selected": true
    }
  ]
}
Ground every item to visible landmarks. If an item is not visible or location is ambiguous, set confidence to "low" or "unknown" and describe uncertainty honestly. Never hallucinate presence.`;

  const apiKey = process.env.META_API_KEY;
  const baseUrl = process.env.META_API_BASE_URL || "https://graph.facebook.com/v21.0";

  // When live API credentials are configured, we send one bounded request
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: input.requestedQuery
                ? `Please locate these target belongings in this scene: ${input.requestedQuery}`
                : "Please identify key personal belongings set down in this scene.",
            },
            {
              type: "image_url",
              image_url: { url: input.image },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1, // low temperature for grounded deterministic output
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    usageLedger.push({
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: MODEL_ID,
      input_tokens: 0,
      output_tokens: 0,
      cached: false,
      estimated_cost_usd: 0,
      status: "error",
      notes: `Meta API call failed with status ${response.status}.`,
    });
    throw new Error(`Meta API returned HTTP ${response.status}: ${errorBody.slice(0, 120)}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Meta API returned empty response content.");
  }

  // Parse and validate with Zod
  const parsedJson = JSON.parse(rawContent);
  const validated = SceneAnalysisResponseSchema.parse(parsedJson);

  // Track usage
  const inputTokens = data.usage?.prompt_tokens || 350;
  const outputTokens = data.usage?.completion_tokens || 120;
  const estimatedCost = ((inputTokens + outputTokens) / 1000) * COST_PER_1K_TOKENS_USD;

  usageLedger.push({
    id: `entry-${Date.now()}`,
    timestamp: new Date().toISOString(),
    model: MODEL_ID,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached: false,
    estimated_cost_usd: Math.round(estimatedCost * 100000) / 100000,
    status: "success",
  });

  // Store in cache
  requestCache.set(cacheKey, {
    candidates: validated.candidates,
    timestamp: Date.now(),
  });

  return {
    candidates: validated.candidates,
    source: "live_meta_api",
    metaModel: MODEL_ID,
    cached: false,
  };
}

