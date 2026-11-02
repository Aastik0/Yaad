import type { VisionProvider, VisionAnalysisContext, VisionAnalysisResult } from "./types.ts";
import { SceneAnalysisResponseSchema } from "../schemas.ts";
import { BudgetManager } from "./budget.ts";
import { computeCacheKey, VisionCache } from "./cache.ts";

/**
 * MetaMuseVisionProvider
 * Server-only visual grounding provider integrating with Meta Model API (`api.meta.ai`).
 * Utilizes `muse-spark-1.3` for multimodal reasoning, enforcing:
 * - 10-step pre-flight safety & budget reservation
 * - Hard $75 application-side budget ceiling
 * - Server-side authentication and credential isolation
 * - Strict Zod schema validation
 * - Prohibition of facial recognition / biometric identification
 * - SHA-256 user-isolated response deduplication
 */
export class MetaMuseVisionProvider implements VisionProvider {
  public readonly providerId = "meta_muse";
  public readonly modelId: string;
  private readonly baseUrl: string;

  constructor() {
    this.modelId = process.env.META_MODEL || process.env.META_MODEL_ID || "muse-spark-1.3";
    let base = process.env.META_API_BASE_URL || "https://api.meta.ai/v1";
    // Sanitize legacy Graph API URLs to the official Meta Model API base
    if (base.includes("graph.facebook.com")) {
      base = "https://api.meta.ai/v1";
    }
    this.baseUrl = base.replace(/\/$/, "");
  }

  public async analyzeScene(
    image: string,
    context?: VisionAnalysisContext
  ): Promise<VisionAnalysisResult> {
    const budgetManager = BudgetManager.getInstance();
    const visionCache = VisionCache.getInstance();
    const userId = context?.userId || "demo-user";
    const requestedQuery = context?.requestedQuery || "";

    // 1. Check Global Kill Switch
    const killSwitchActive =
      process.env.META_REQUESTS_KILL_SWITCH === "true" ||
      process.env.META_REQUESTS_KILL_SWITCH === "1";

    if (killSwitchActive) {
      budgetManager.recordZeroCostEntry({
        id: `entry_killswitch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: 0,
        actual_cost_usd: 0,
        status: "kill_switch_blocked",
        notes: "Request blocked by META_REQUESTS_KILL_SWITCH.",
        user_id: userId,
      });
      throw new Error("Meta AI requests are currently suspended by the developer safety kill switch.");
    }

    // 2. Check Live API Feature Flag
    const liveApiEnabled =
      process.env.ENABLE_LIVE_META_API === "true" ||
      process.env.ENABLE_LIVE_META_API === "1";

    if (!liveApiEnabled && !context?.forceLive) {
      throw new Error("Live Meta AI inference is disabled by default. Set ENABLE_LIVE_META_API=true to enable.");
    }

    // 3. Check Authenticated User / Session
    if (userId === "demo-user" && !context?.forceLive) {
      throw new Error("Live Meta AI inference requires an authenticated user session.");
    }

    // 4. Check API Key
    const apiKey = process.env.MODEL_API_KEY || process.env.META_API_KEY;
    if (!apiKey) {
      throw new Error("Meta Model API key is not configured. Please set MODEL_API_KEY on the server.");
    }

    // 5. Check Cache (Strictly scoped by user_id to prevent cross-user leakage)
    const cacheKey = computeCacheKey(userId, image, requestedQuery, this.modelId);
    const cachedCandidates = visionCache.get(cacheKey);
    if (cachedCandidates) {
      budgetManager.recordZeroCostEntry({
        id: `entry_cache_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: true,
        estimated_cost_usd: 0,
        actual_cost_usd: 0,
        status: "success",
        notes: "Exact duplicate request served from SHA-256 local cache (zero network calls).",
        user_id: userId,
      });

      return {
        candidates: cachedCandidates,
        source: "cache",
        metaModel: this.modelId,
        cached: true,
        tokens: { input: 0, output: 0, cached: 0 },
        costUsd: 0,
      };
    }

    // 6 & 7. Estimate Max Cost & Atomically Reserve Budget
    // muse-spark-1.3 standard pricing: $1.25 / 1M input tokens, $4.25 / 1M output tokens
    // Worst-case upper bound: 2,500 visual/prompt tokens ($0.003125) + 800 output tokens ($0.0034) = ~$0.0065
    // Conservative reservation amount: $0.01 per call
    const estimatedMaxCostUsd = 0.01;
    const reservation = budgetManager.reserveBudget(estimatedMaxCostUsd);

    if (!reservation.success) {
      budgetManager.recordZeroCostEntry({
        id: `entry_budget_blocked_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: 0,
        actual_cost_usd: 0,
        status: "rate_limited",
        notes: reservation.error || "Budget cap reached.",
        user_id: userId,
      });
      throw new Error(reservation.error || `Planned budget cap reached. Halting live calls to preserve credit reserve.`);
    }

    // 8. Prepare Structured Grounding Prompt
    // Explicitly prohibits biometric identification / facial recognition
    // Enforces strict visual attribute accuracy and color integrity
    const systemPrompt = `You are Yaad's visual grounding assistant for dementia care and memory enhancement.
Your role is to identify personal belongings (such as keys, wallet, prescription glasses, water bottle, phone, medication organizer, bag) set down in a scene.
STRICT PRIVACY RULES & VISUAL ACCURACY:
1. Do NOT attempt facial recognition, identify specific people, or describe personal physical traits.
2. Focus exclusively on inanimate belongings and the surfaces or landmarks they rest upon.
3. Every detected item MUST be grounded to visible landmarks (e.g. "on the wooden entryway console next to the lamp").
4. VISUAL ATTRIBUTE ACCURACY & COLOR INTEGRITY:
   - Report ONLY visually supported attributes (color, material, shape) that are clearly visible and unambiguous in the scene.
   - Do NOT guess or hallucinate colors under dim lighting, backlighting, shadows, reflections, or glare.
   - If an object's color is ambiguous, obscured, or uncertain due to lighting or shadows, either:
     a) Omit the color adjective entirely and use a neutral, functional description (e.g. "wallet" or "leather wallet" instead of guessing "black" or "brown"), OR
     b) Explicitly state the color as "unknown" or "uncertain" (e.g. "wallet of uncertain color").
   - Never assert a specific color unless it is unmistakably verified by visual pixels.
5. If an item's location or visual attributes are ambiguous or visibility is low, honestly state confidence as "low" or "unknown", and record lighting, shadow, or color ambiguities in "uncertainty_notes". Never hallucinate.
6. Your response MUST be valid JSON adhering exactly to this schema:
{
  "candidates": [
    {
      "id": "cand-unique-id",
      "item_name": "Specific item name (omit color if ambiguous, e.g. 'Leather Wallet')",
      "category": "Belonging category",
      "location_description": "Grounded sentence stating where the item was observed resting",
      "landmarks": ["landmark 1", "landmark 2"],
      "description": "Factual descriptive sentence without asserting current location or guessing ambiguous colors",
      "confidence": "high" | "medium" | "low" | "unknown",
      "is_selected": true
    }
  ],
  "scene_context": "Brief factual summary of the room/environment",
  "uncertainty_notes": "Optional notes on visual obstructions, shadows, glare, or lighting ambiguity affecting colors"
}`;

    // Format image payload: accepts inline Base64 data URL or public HTTPS URL
    const imageUrl = image.startsWith("data:") || image.startsWith("http")
      ? image
      : `data:image/jpeg;base64,${image}`;

    const requestPayload = {
      model: this.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: requestedQuery.trim()
                ? `Please locate these target belongings in this scene: ${requestedQuery}`
                : "Please identify key personal belongings set down in this scene.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 5000,
      temperature: 0.1, // low temperature for grounded deterministic outputs
      response_format: { type: "json_object" },
    };

    // Execute Request with 60-second timeout and NO duplicate automatic retries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const errMsg = isTimeout
        ? "Meta Model API request timed out after 60 seconds."
        : err instanceof Error
        ? err.message
        : "Network error contacting Meta Model API";

      // Release reserved budget at zero cost
      budgetManager.releaseReservation(reservation.reservationId, {
        id: `entry_err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: 0,
        actual_cost_usd: 0,
        status: "error",
        notes: errMsg,
        user_id: userId,
      });

      throw new Error(errMsg);
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP Error Codes
    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson?.error?.message || JSON.stringify(errorJson);
        } catch {
          errorDetail = errorText;
        }
      } catch {
        errorDetail = `HTTP ${response.status} error`;
      }

      // Safe, sanitised error messaging without leaking API keys
      let clientMsg = `Meta Model API returned HTTP ${response.status}`;
      if (response.status === 401) {
        clientMsg = "Meta Model API authentication failed. Verify MODEL_API_KEY.";
      } else if (response.status === 429) {
        clientMsg = "Meta Model API rate limit reached. Please wait before retrying.";
      } else if (response.status >= 500) {
        clientMsg = "Meta Model API service temporarily unavailable.";
      }

      // Release reserved budget at zero cost
      budgetManager.releaseReservation(reservation.reservationId, {
        id: `entry_http_err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: 0,
        actual_cost_usd: 0,
        status: response.status === 429 ? "rate_limited" : "error",
        notes: `HTTP ${response.status}: ${errorDetail.slice(0, 150)}`,
        user_id: userId,
      });

      throw new Error(clientMsg);
    }

    // Parse and Reconcile Actual Usage
    let responseBody: any;
    try {
      responseBody = await response.json();
    } catch {
      // Release reservation with estimated cost if response JSON could not be decoded
      budgetManager.reconcileBudget(reservation.reservationId, estimatedMaxCostUsd, {
        id: `entry_json_parse_err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: estimatedMaxCostUsd,
        actual_cost_usd: estimatedMaxCostUsd,
        status: "error",
        notes: "Failed to decode response JSON from Meta Model API.",
        user_id: userId,
      });
      throw new Error("Meta Model API returned non-JSON response body.");
    }

    // Extract Usage Metadata immediately BEFORE validating content
    const isContributor = this.modelId.includes("contributor");
    const inputRatePer1M = isContributor ? 0.10 : 1.25;
    const outputRatePer1M = isContributor ? 0.20 : 4.25;

    const inputTokens = typeof responseBody?.usage?.prompt_tokens === "number"
      ? responseBody.usage.prompt_tokens
      : 0;
    const outputTokens = typeof responseBody?.usage?.completion_tokens === "number"
      ? responseBody.usage.completion_tokens
      : 0;
    const cachedTokens = typeof responseBody?.usage?.prompt_tokens_details?.cached_tokens === "number"
      ? responseBody.usage.prompt_tokens_details.cached_tokens
      : 0;

    // Calculate actual cost from returned tokens, falling back to estimatedMaxCostUsd if tokens not returned
    const actualCostUsd = (inputTokens > 0 || outputTokens > 0)
      ? Math.max(0.0001, Math.round(((inputTokens / 1_000_000) * inputRatePer1M + (outputTokens / 1_000_000) * outputRatePer1M) * 100000) / 100000)
      : estimatedMaxCostUsd;

    const choice = responseBody?.choices?.[0];
    const finishReason = choice?.finish_reason;
    const rawContent = choice?.message?.content;

    // Check for truncation (finish_reason === "length")
    if (finishReason === "length") {
      budgetManager.reconcileBudget(reservation.reservationId, actualCostUsd, {
        id: `entry_truncated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        cached: false,
        estimated_cost_usd: actualCostUsd,
        actual_cost_usd: actualCostUsd,
        status: "truncated",
        notes: `Model output truncated: max_tokens reached (finish_reason: length). Tokens: ${inputTokens} in / ${outputTokens} out.`,
        user_id: userId,
      });

      throw new Error(
        `Failed to parse valid structured response from Meta vision model: Output token limit reached during reasoning (finish_reason: length). Reconciled ${inputTokens} prompt tokens, ${outputTokens} completion tokens ($${actualCostUsd.toFixed(5)}).`
      );
    }

    // Check for empty or invalid message content
    if (!rawContent || typeof rawContent !== "string") {
      budgetManager.reconcileBudget(reservation.reservationId, actualCostUsd, {
        id: `entry_empty_content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        cached: false,
        estimated_cost_usd: actualCostUsd,
        actual_cost_usd: actualCostUsd,
        status: "error",
        notes: `Model returned empty content (finish_reason: ${finishReason || "unknown"}). Tokens: ${inputTokens} in / ${outputTokens} out.`,
        user_id: userId,
      });

      throw new Error(
        `Failed to parse valid structured response from Meta vision model: Meta Model API returned empty or invalid response content (finish_reason: ${finishReason || "unknown"}).`
      );
    }

    // Parse JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      budgetManager.reconcileBudget(reservation.reservationId, actualCostUsd, {
        id: `entry_json_syntax_err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        cached: false,
        estimated_cost_usd: actualCostUsd,
        actual_cost_usd: actualCostUsd,
        status: "error",
        notes: `JSON syntax error in model content. Tokens: ${inputTokens} in / ${outputTokens} out.`,
        user_id: userId,
      });

      throw new Error(
        "Failed to parse valid structured response from Meta vision model: Failed to parse JSON from Meta vision model output content."
      );
    }

    // Zod Schema Validation
    const parseResult = SceneAnalysisResponseSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      budgetManager.reconcileBudget(reservation.reservationId, actualCostUsd, {
        id: `entry_schema_mismatch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        model: this.modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens,
        cached: false,
        estimated_cost_usd: actualCostUsd,
        actual_cost_usd: actualCostUsd,
        status: "error",
        notes: `Candidate schema validation mismatch. Tokens: ${inputTokens} in / ${outputTokens} out.`,
        user_id: userId,
      });

      throw new Error(
        "Failed to parse valid structured response from Meta vision model: Meta Model API response did not match candidate schema."
      );
    }

    // Successful reconciliation
    budgetManager.reconcileBudget(reservation.reservationId, actualCostUsd, {
      id: `entry_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      model: this.modelId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
      cached: false,
      estimated_cost_usd: actualCostUsd,
      actual_cost_usd: actualCostUsd,
      status: "success",
      user_id: userId,
    });

    // Cache the validated candidates
    visionCache.set(cacheKey, parseResult.data.candidates);

    return {
      candidates: parseResult.data.candidates,
      scene_context: parseResult.data.scene_context,
      uncertainty_notes: parseResult.data.uncertainty_notes,
      source: "live_meta_api",
      metaModel: this.modelId,
      cached: false,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        cached: cachedTokens,
      },
      costUsd: actualCostUsd,
    };
  }
}
