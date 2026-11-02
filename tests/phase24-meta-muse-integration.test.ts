import test from "node:test";
import assert from "node:assert/strict";
import { getVisionProvider } from "../src/lib/vision/factory.ts";
import { MockVisionProvider } from "../src/lib/vision/MockVisionProvider.ts";
import { MetaMuseVisionProvider } from "../src/lib/vision/MetaMuseVisionProvider.ts";
import { BudgetManager } from "../src/lib/vision/budget.ts";
import { VisionCache } from "../src/lib/vision/cache.ts";
import { analyzeScene } from "../src/lib/meta.ts";

// Helper to save and restore environment variables asynchronously
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const original: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    original[k] = process.env[k];
    if (vars[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = vars[k];
    }
  }
  try {
    await fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (original[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = original[k];
      }
    }
  }
}

test("Phase 24: Provider selection - MockVisionProvider remains strict default across all fallback conditions", async () => {
  // Condition 1: Demo Mode selects MockVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "demo",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: true, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
      assert.equal(provider.providerId, "mock");
    }
  );

  // Condition 2: Cloud Mode with ENABLE_LIVE_META_API=false selects MockVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "false",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // Condition 3: Kill switch active selects MockVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "true",
      MODEL_API_KEY: "test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // Condition 4: Missing API key selects MockVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: undefined,
      META_API_KEY: undefined,
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // Condition 5: Unauthenticated user (demo-user) selects MockVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "demo-user" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // Explicit opt-in with all 5 conditions met selects MetaMuseVisionProvider
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "test_valid_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "authenticated-user-01" });
      assert.ok(provider instanceof MetaMuseVisionProvider);
      assert.equal(provider.providerId, "meta_muse");
    }
  );
});

test("Phase 24: Real Meta Muse request building and structured response parsing", async () => {
  const budget = BudgetManager.getInstance();
  const cache = VisionCache.getInstance();
  budget.resetForTesting(5.0);
  cache.clear();

  const originalFetch = global.fetch;
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};
  let capturedPayload: any = null;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input.toString();
    capturedHeaders = (init?.headers as Record<string, string>) || {};
    capturedPayload = JSON.parse(init?.body as string);

    const mockApiResponse = {
      id: "chatcmpl-muse-test-01",
      object: "chat.completion",
      model: "muse-spark-1.3",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              candidates: [
                {
                  id: "cand-muse-keys-01",
                  item_name: "Apartment Keys with Carabiner",
                  category: "Keys",
                  location_description: "Observed resting on the oak coffee table near the ceramic mug",
                  landmarks: ["oak coffee table", "ceramic mug"],
                  description: "Brass carabiner with house and mailbox keys",
                  confidence: "high",
                  is_selected: true,
                },
              ],
              scene_context: "Living room coffee table area",
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 180,
        total_tokens: 1380,
      },
    };

    return new Response(JSON.stringify(mockApiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "meta_test_secret_key_123",
        META_MODEL: "muse-spark-1.3",
        META_API_BASE_URL: "https://api.meta.ai/v1",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();
        const result = await provider.analyzeScene("data:image/jpeg;base64,mockImageData", {
          userId: "test-user-verified",
          requestedQuery: "keys",
          forceLive: true,
        });

        // 1. Verify endpoint and headers
        assert.equal(capturedUrl, "https://api.meta.ai/v1/chat/completions");
        assert.equal(capturedHeaders["Authorization"], "Bearer meta_test_secret_key_123");
        assert.equal(capturedHeaders["Content-Type"], "application/json");

        // 2. Verify request format
        assert.equal(capturedPayload.model, "muse-spark-1.3");
        assert.equal(capturedPayload.response_format?.type, "json_object");
        assert.ok(capturedPayload.messages.length === 2);
        assert.equal(capturedPayload.messages[0].role, "system");
        assert.ok(capturedPayload.messages[0].content.includes("STRICT PRIVACY RULES"));
        assert.equal(capturedPayload.messages[1].role, "user");
        assert.equal(capturedPayload.messages[1].content[1].type, "image_url");

        // 3. Verify parsed candidates
        assert.equal(result.candidates.length, 1);
        assert.equal(result.candidates[0].item_name, "Apartment Keys with Carabiner");
        assert.equal(result.candidates[0].confidence, "high");
        assert.equal(result.source, "live_meta_api");
        assert.equal(result.metaModel, "muse-spark-1.3");
        assert.ok(result.costUsd > 0);

        // 4. Verify token accounting in budget manager
        const summary = budget.getSummary();
        assert.ok(summary.totalCostUsd > 0);
        assert.equal(summary.totalRequests, 1);
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Error handling - Invalid API key (HTTP 401) fails closed and releases budget reservation", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;
  global.fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Invalid authentication token provided" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "invalid_key",
        META_API_BASE_URL: "https://api.meta.ai/v1",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,test", {
            userId: "test-user-auth",
            forceLive: true,
          }),
          {
            message: /authentication failed/i,
          }
        );

        // Budget reservation must be released at $0.00 spend
        const summary = budget.getSummary();
        assert.equal(summary.totalCostUsd, 0, "No funds charged on 401 error");
        assert.equal(summary.reservedUsd, 0, "Reservation released");
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Error handling - Rate limits (HTTP 429) and timeouts release budget reservation", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;

  // 1. Test 429 Rate Limit
  global.fetch = async () => {
    return new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,test", {
            userId: "test-user-429",
            forceLive: true,
          }),
          {
            message: /rate limit reached/i,
          }
        );

        assert.equal(budget.getSummary().totalCostUsd, 0);
        assert.equal(budget.getSummary().reservedUsd, 0);
      }
    );

    // 2. Test Abort / Timeout
    global.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,test", {
            userId: "test-user-timeout",
            forceLive: true,
          }),
          {
            message: /timed out/i,
          }
        );

        assert.equal(budget.getSummary().totalCostUsd, 0);
        assert.equal(budget.getSummary().reservedUsd, 0);
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Strict Cost Protection - Enforces $5.00 MAX initial testing budget ceiling", async () => {
  const budget = BudgetManager.getInstance();
  // Set budget cap to exactly $5.00
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
      META_MAX_SPEND_USD: "5.00",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();

      // Simulate that accumulated spend has reached $5.00
      const initialRes = budget.reserveBudget(5.0);
      budget.reconcileBudget(initialRes.reservationId, 5.0, {
        id: "entry_fill_budget",
        timestamp: new Date().toISOString(),
        model: "muse-spark-1.3",
        input_tokens: 0,
        output_tokens: 0,
        cached: false,
        estimated_cost_usd: 5.0,
        actual_cost_usd: 5.0,
        status: "success",
        user_id: "test-user-budget",
      });

      // Next request must be rejected before any network call
      await assert.rejects(
        provider.analyzeScene("data:image/jpeg;base64,test", {
          userId: "test-user-budget",
          forceLive: true,
        }),
        {
          message: /budget cap \(\$5\.00\) reached/i,
        }
      );
    }
  );

  budget.resetForTesting(75.0);
});

test("Phase 24: Kill Switch immediately halts execution with zero network calls and zero cost", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "true", // Kill switch activated
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,test", {
            userId: "test-user-kill",
            forceLive: true,
          }),
          {
            message: /suspended by the developer safety kill switch/i,
          }
        );

        assert.equal(fetchCalled, false, "Network call must NEVER occur when kill switch is active");
        const summary = budget.getSummary();
        assert.equal(summary.totalCostUsd, 0);
        assert.equal(summary.ledger[0].status, "kill_switch_blocked");
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Zero accidental API calls - analyzeScene runs completely offline in default configuration", async () => {
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  };

  try {
    // Run with standard default config (demo mode)
    const result = await analyzeScene({
      image: "data:image/jpeg;base64,mockImage",
      requestedQuery: "keys",
      source: "browser_camera",
      userId: "demo-user",
    });

    assert.equal(fetchCalled, false, "fetch() must NEVER be called in default configuration");
    assert.equal(result.source, "mock");
    assert.ok(result.candidates.length > 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Phase 24: Diagnostics - Handles finish_reason === 'length' explicitly and reconciles returned usage", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;
  let fetchCallCount = 0;

  global.fetch = async () => {
    fetchCallCount++;
    const truncatedResponse = {
      id: "chatcmpl-trunc-test",
      object: "chat.completion",
      model: "muse-spark-1.3",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "",
          },
          finish_reason: "length",
        },
      ],
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 800,
        total_tokens: 2000,
      },
    };

    return new Response(JSON.stringify(truncatedResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,sampleImg", {
            userId: "test-user-length",
            forceLive: true,
          }),
          {
            message: /Output token limit reached during reasoning \(finish_reason: length\)/i,
          }
        );

        // 1. Exactly 1 fetch call: NO automatic retries
        assert.equal(fetchCallCount, 1, "Must never automatically retry after token truncation");

        // 2. Budget reconciliation uses actual usage tokens (not dummy 0s)
        const summary = budget.getSummary();
        assert.equal(summary.ledger.length, 1);
        assert.equal(summary.ledger[0].status, "truncated");
        assert.equal(summary.ledger[0].input_tokens, 1200);
        assert.equal(summary.ledger[0].output_tokens, 800);
        assert.ok(summary.ledger[0].actual_cost_usd! > 0);

        // 3. Outstanding reservation cleanly cleared
        assert.equal(summary.reservedUsd, 0);
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Diagnostics - Handles empty message content with usage metadata extraction before validation", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;
  let fetchCallCount = 0;

  global.fetch = async () => {
    fetchCallCount++;
    const emptyContentResponse = {
      id: "chatcmpl-empty-test",
      object: "chat.completion",
      model: "muse-spark-1.3",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 950,
        completion_tokens: 40,
        total_tokens: 990,
      },
    };

    return new Response(JSON.stringify(emptyContentResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,sampleImg", {
            userId: "test-user-empty",
            forceLive: true,
          }),
          {
            message: /returned empty or invalid response content/i,
          }
        );

        assert.equal(fetchCallCount, 1, "Must never retry on empty response");
        const summary = budget.getSummary();
        assert.equal(summary.ledger.length, 1);
        assert.equal(summary.ledger[0].input_tokens, 950);
        assert.equal(summary.ledger[0].output_tokens, 40);
        assert.ok(summary.ledger[0].actual_cost_usd! > 0);
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Safety - Payload sends max_tokens: 5000 and strictly excludes max_completion_tokens and reasoning_effort", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;
  let capturedBody: any = null;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                candidates: [
                  {
                    id: "c1",
                    item_name: "Wallet",
                    location_description: "Desk next to monitor",
                    landmarks: ["desk", "monitor"],
                    description: "Brown leather wallet",
                    confidence: "high",
                    is_selected: true,
                  },
                ],
              }),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 150 },
      }),
      { status: 200 }
    );
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();
        await provider.analyzeScene("data:image/jpeg;base64,sampleImg", {
          userId: "test-user-safe-params",
          forceLive: true,
        });

        // Assert max_tokens is exactly 5000
        assert.equal(capturedBody.max_tokens, 5000);

        // Assert mutual-exclusivity violations and unsupported params are completely excluded
        assert.equal(
          capturedBody.max_completion_tokens,
          undefined,
          "max_completion_tokens must NOT be present in payload"
        );
        assert.equal(
          capturedBody.reasoning_effort,
          undefined,
          "reasoning_effort must NOT be present in payload"
        );

        // Assert all other standard fields are present
        assert.equal(capturedBody.model, "muse-spark-1.3");
        assert.equal(capturedBody.temperature, 0.1);
        assert.equal(capturedBody.response_format?.type, "json_object");
        assert.ok(Array.isArray(capturedBody.messages));
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Timeout - AbortError explicitly reports 60-second ceiling and releases budget reservation", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(5.0);

  const originalFetch = global.fetch;
  global.fetch = async () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "valid_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();

        await assert.rejects(
          provider.analyzeScene("data:image/jpeg;base64,test", {
            userId: "test-user-timeout-60",
            forceLive: true,
          }),
          {
            message: /Meta Model API request timed out after 60 seconds\./,
          }
        );

        // Budget reservation must be cleanly released at $0 cost
        assert.equal(budget.getSummary().totalCostUsd, 0);
        assert.equal(budget.getSummary().reservedUsd, 0);
        assert.equal(
          budget.getSummary().ledger[0].notes,
          "Meta Model API request timed out after 60 seconds."
        );
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24: Server Runtime - Route declares maxDuration = 60", async () => {
  const { maxDuration } = await import("../src/app/api/analyze/route.ts");
  assert.equal(maxDuration, 60, "Route maxDuration must be configured to 60 seconds");
});

test("Phase 24D: System prompt enforces visual attribute integrity and forbids color hallucination", async () => {
  const budget = BudgetManager.getInstance();
  const cache = VisionCache.getInstance();
  budget.resetForTesting(5.0);
  cache.clear();

  const originalFetch = global.fetch;
  let capturedPayload: any = null;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedPayload = JSON.parse(init?.body as string);
    return new Response(
      JSON.stringify({
        id: "chatcmpl-attr-test",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({
                candidates: [
                  {
                    id: "cand-1",
                    item_name: "Prescription Glasses",
                    location_description: "On side table next to lamp",
                    landmarks: ["side table", "lamp"],
                    description: "Frames on side table",
                    confidence: "high",
                    is_selected: true,
                  },
                ],
                scene_context: "Living room",
              }),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "test_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();
        await provider.analyzeScene("data:image/jpeg;base64,abc", {
          userId: "user-attr-test",
          forceLive: true,
        });

        assert.ok(capturedPayload, "Request payload must be captured");
        const systemMessage = capturedPayload.messages.find(
          (m: { role: string }) => m.role === "system"
        );
        assert.ok(systemMessage, "Must include system message");
        const promptText = systemMessage.content;

        // Verify explicit anti-hallucination color rules
        assert.ok(
          promptText.includes("VISUAL ATTRIBUTE ACCURACY & COLOR INTEGRITY"),
          "System prompt must have explicit visual attribute accuracy section"
        );
        assert.ok(
          promptText.includes("Do NOT guess or hallucinate colors"),
          "Must explicitly forbid color guessing"
        );
        assert.ok(
          promptText.includes("Omit the color adjective entirely") ||
          promptText.includes("neutral, functional description"),
          "Must instruct omitting color when ambiguous"
        );
        assert.ok(
          promptText.includes("unknown") && promptText.includes("uncertain"),
          "Must permit 'unknown' or 'uncertain' for ambiguous attributes"
        );
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});

test("Phase 24D: MetaMuseVisionProvider parses candidate with unknown/uncertain color and neutral item name", async () => {
  const budget = BudgetManager.getInstance();
  const cache = VisionCache.getInstance();
  budget.resetForTesting(5.0);
  cache.clear();

  const originalFetch = global.fetch;

  global.fetch = async () => {
    const mockApiResponse = {
      id: "chatcmpl-uncertain-color-test",
      object: "chat.completion",
      model: "muse-spark-1.3",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              candidates: [
                {
                  id: "cand-wallet-shadow",
                  item_name: "Leather Wallet",
                  category: "Wallet",
                  location_description: "Observed resting on the oak coffee table in shadow beside ceramic mug",
                  landmarks: ["oak coffee table", "ceramic mug"],
                  description: "Bi-fold wallet resting in deep shadow; color uncertain due to backlighting",
                  confidence: "unknown",
                  is_selected: true,
                },
                {
                  id: "cand-keys-clear",
                  item_name: "Silver Keychain",
                  category: "Keys",
                  location_description: "Observed on entryway console table",
                  landmarks: ["entryway console table"],
                  description: "Metallic keychain with house keys",
                  confidence: "high",
                  is_selected: true,
                },
              ],
              scene_context: "Living room with backlit window casting harsh shadows across coffee table",
              uncertainty_notes: "Deep shadow obscuring coffee table renders wallet color uncertain (could be dark brown or black)",
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 1100,
        completion_tokens: 220,
        total_tokens: 1320,
      },
    };

    return new Response(JSON.stringify(mockApiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        ENABLE_LIVE_META_API: "true",
        META_REQUESTS_KILL_SWITCH: "false",
        MODEL_API_KEY: "test_key",
      },
      async () => {
        const provider = new MetaMuseVisionProvider();
        const result = await provider.analyzeScene("data:image/jpeg;base64,test_img", {
          userId: "user-uncertain-color",
          forceLive: true,
        });

        assert.equal(result.candidates.length, 2);
        const wallet = result.candidates.find((c) => c.id === "cand-wallet-shadow");
        assert.ok(wallet, "Must find wallet candidate");
        assert.equal(wallet.item_name, "Leather Wallet", "Item name must be neutral when color is ambiguous");
        assert.equal(wallet.confidence, "unknown", "Confidence must accept 'unknown'");
        assert.ok(wallet.description.includes("color uncertain"), "Description accurately records color uncertainty");
        assert.ok(
          result.uncertainty_notes?.includes("shadow obscuring coffee table"),
          "Uncertainty notes must capture lighting condition"
        );
      }
    );
  } finally {
    global.fetch = originalFetch;
    budget.resetForTesting(75.0);
  }
});
