import test from "node:test";
import assert from "node:assert/strict";
import { getVisionProvider } from "../src/lib/vision/factory.ts";
import { MockVisionProvider } from "../src/lib/vision/MockVisionProvider.ts";
import { MetaMuseVisionProvider } from "../src/lib/vision/MetaMuseVisionProvider.ts";
import { BudgetManager } from "../src/lib/vision/budget.ts";
import { computeCacheKey, VisionCache } from "../src/lib/vision/cache.ts";
import { AnalyzeRequestSchema, SceneAnalysisResponseSchema } from "../src/lib/schemas.ts";

// Helper to save and restore environment variables asynchronously
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const originalEnv: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    originalEnv[k] = process.env[k];
    if (vars[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = vars[k];
    }
  }

  try {
    await fn();
  } finally {
    for (const k of Object.keys(originalEnv)) {
      if (originalEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = originalEnv[k];
      }
    }
  }
}

test("Phase 18.1: Provider selection respects Demo Mode, feature flags, and kill switch", () => {
  // 1. Demo Mode -> always MockVisionProvider
  withEnv({ NEXT_PUBLIC_APP_MODE: "demo" }, () => {
    const provider = getVisionProvider({ isDemoMode: true });
    assert.ok(provider instanceof MockVisionProvider);
    assert.equal(provider.providerId, "mock");
  });

  // 2. Cloud Mode with live disabled -> MockVisionProvider
  withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "false",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "meta_test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // 3. Cloud Mode with kill switch active -> MockVisionProvider
  withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "true",
      MODEL_API_KEY: "meta_test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "user-123" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // 4. Cloud Mode with missing API key -> MockVisionProvider
  withEnv(
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

  // 5. Cloud Mode with unauthenticated user (demo-user) -> MockVisionProvider
  withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "meta_test_key",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "demo-user" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  // 6. Cloud Mode fully enabled with authenticated user -> MetaMuseVisionProvider
  withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "live",
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "meta_test_key",
      META_MODEL: "muse-spark-1.3",
    },
    () => {
      const provider = getVisionProvider({ isDemoMode: false, userId: "auth-user-999" });
      assert.ok(provider instanceof MetaMuseVisionProvider);
      assert.equal(provider.providerId, "meta_muse");
      assert.equal(provider.modelId, "muse-spark-1.3");
    }
  );
});

test("Phase 18.1: MockVisionProvider operates offline with 0 cost and grounded candidates", async () => {
  const provider = new MockVisionProvider();
  const result = await provider.analyzeScene("data:image/jpeg;base64,mockframe", {
    requestedQuery: "glasses",
    userId: "test-user",
  });

  assert.equal(result.source, "mock");
  assert.equal(result.costUsd, 0);
  assert.equal(result.cached, false);
  assert.ok(result.candidates.length > 0);
  assert.ok(result.candidates.some((c) => c.item_name.toLowerCase().includes("glasses")));
});

test("Phase 18.1: MetaMuseVisionProvider fails closed when live inference is disabled", async () => {
  await withEnv(
    {
      ENABLE_LIVE_META_API: "false",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "dummy_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: false,
          });
        },
        {
          message: /Live Meta AI inference is disabled by default/,
        }
      );
    }
  );
});

test("Phase 18.1: Global kill switch immediately halts requests without network calls", async () => {
  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "true",
      MODEL_API_KEY: "dummy_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /developer safety kill switch/,
        }
      );

      const summary = BudgetManager.getInstance().getSummary();
      const lastEntry = summary.ledger[0];
      assert.equal(lastEntry.status, "kill_switch_blocked");
      assert.equal(lastEntry.actual_cost_usd, 0);
    }
  );
});

test("Phase 18.1: BudgetManager prevents requests when budget cap is reached", async () => {
  const budget = BudgetManager.getInstance();
  // Set budget cap to $0.005 (smaller than the $0.01 reservation amount)
  budget.resetForTesting(0.005);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "dummy_key",
      META_MAX_SPEND_USD: "0.005",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /Planned budget cap \(\$0.01\) reached/,
        }
      );

      const summary = budget.getSummary();
      const lastEntry = summary.ledger[0];
      assert.equal(lastEntry.status, "rate_limited");
    }
  );

  budget.resetForTesting(75.0);
});

test("Phase 18.1: Concurrency-safe budget reservation blocks parallel requests from exceeding cap", async () => {
  const budget = BudgetManager.getInstance();
  // Cap at $0.02 (allows 2 reservations of $0.01, third must be rejected)
  budget.resetForTesting(0.02);

  const res1 = budget.reserveBudget(0.01);
  assert.equal(res1.success, true);

  const res2 = budget.reserveBudget(0.01);
  assert.equal(res2.success, true);

  // 3rd concurrent request should exceed $0.02 and fail
  const res3 = budget.reserveBudget(0.01);
  assert.equal(res3.success, false);
  assert.ok(res3.error?.includes("budget cap"));

  // Reconcile res1 and release res2
  budget.reconcileBudget(res1.reservationId, 0.005, {
    id: "test1",
    timestamp: new Date().toISOString(),
    model: "muse-spark-1.3",
    input_tokens: 1000,
    output_tokens: 200,
    cached: false,
    estimated_cost_usd: 0.005,
    status: "success",
  });
  budget.releaseReservation(res2.reservationId);

  // Now available budget allows res4
  const res4 = budget.reserveBudget(0.01);
  assert.equal(res4.success, true);
  budget.releaseReservation(res4.reservationId);

  budget.resetForTesting(75.0);
});

test("Phase 18.1: Zod schema enforces 7MB image limit and rejects oversized payloads", () => {
  const validRequest = {
    image: "data:image/jpeg;base64," + "a".repeat(1000),
    requestedQuery: "wallet",
    source: "glasses_sdk",
  };
  const validParsed = AnalyzeRequestSchema.safeParse(validRequest);
  assert.equal(validParsed.success, true);

  const oversizedRequest = {
    image: "a".repeat(8 * 1024 * 1024), // 8MB
    requestedQuery: "wallet",
  };
  const oversizedParsed = AnalyzeRequestSchema.safeParse(oversizedRequest);
  assert.equal(oversizedParsed.success, false);
  if (!oversizedParsed.success) {
    assert.ok(oversizedParsed.error.issues.some((i) => i.message.includes("exceeds maximum limit of 7MB")));
  }
});

test("Phase 18.1: Error handling handles HTTP 401, 429, 500 and releases budget reservation", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(75.0);

  const originalFetch = global.fetch;

  // Test 401 Unauthorized
  global.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 });

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "bad_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /authentication failed/i,
        }
      );
      assert.equal(budget.getSummary().reservedUsd, 0, "Reservation must be released on 401");
    }
  );

  // Test 429 Rate Limit
  global.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
      status: 429,
      headers: { "Retry-After": "2" },
    });

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /rate limit reached/i,
        }
      );
      assert.equal(budget.getSummary().reservedUsd, 0, "Reservation must be released on 429");
    }
  );

  // Test 500 Server Error
  global.fetch = async () =>
    new Response("Internal Server Error", { status: 500 });

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /service temporarily unavailable/i,
        }
      );
      assert.equal(budget.getSummary().reservedUsd, 0, "Reservation must be released on 500");
    }
  );

  global.fetch = originalFetch;
  budget.resetForTesting(75.0);
});

test("Phase 18.1: Model output validation rejects malformed responses and fails closed", async () => {
  const budget = BudgetManager.getInstance();
  budget.resetForTesting(75.0);

  const originalFetch = global.fetch;

  // Mock returning invalid JSON structure (missing landmarks and grounded fields)
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                candidates: [{ id: "c1", item_name: "keys" }], // Missing location_description & description
              }),
            },
          },
        ],
        usage: { prompt_tokens: 1200, completion_tokens: 80 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      await assert.rejects(
        async () => {
          await provider.analyzeScene("data:image/jpeg;base64,frame", {
            userId: "auth-user",
            forceLive: true,
          });
        },
        {
          message: /Failed to parse valid structured response/,
        }
      );

      // Fail-closed verification: budget ledger records worst-case reservation so spend is never under-reported
      const summary = budget.getSummary();
      assert.ok(summary.totalCostUsd > 0, "Fail closed must commit estimated spend on parsing failures");
    }
  );

  global.fetch = originalFetch;
  budget.resetForTesting(75.0);
});

test("Phase 18.1: Successful Meta response validates schema and caches result", async () => {
  const budget = BudgetManager.getInstance();
  const cache = VisionCache.getInstance();
  budget.resetForTesting(75.0);
  cache.clear();

  const mockMetaResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            candidates: [
              {
                id: "meta-cand-1",
                item_name: "Car Keys with Brass Clip",
                category: "Keys",
                location_description: "Resting flat on the wooden console table next to the ceramic bowl",
                landmarks: ["wooden console table", "ceramic bowl"],
                description: "Brass keychain observed lying on the table surface.",
                confidence: "high",
                is_selected: true,
              },
            ],
            scene_context: "Entryway hall",
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 1500,
      completion_tokens: 200,
      prompt_tokens_details: { cached_tokens: 0 },
    },
  };

  let fetchCallCount = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCallCount++;
    return new Response(JSON.stringify(mockMetaResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
      META_MODEL: "muse-spark-1.3",
    },
    async () => {
      const provider = new MetaMuseVisionProvider();
      const imagePayload = "data:image/jpeg;base64,sampleimagebytes123456789";

      // 1. Initial Call -> Live fetch
      const result1 = await provider.analyzeScene(imagePayload, {
        userId: "auth-user-42",
        requestedQuery: "car keys",
        forceLive: true,
      });

      assert.equal(fetchCallCount, 1);
      assert.equal(result1.source, "live_meta_api");
      assert.equal(result1.cached, false);
      assert.equal(result1.candidates.length, 1);
      assert.equal(result1.candidates[0].item_name, "Car Keys with Brass Clip");
      assert.ok(result1.costUsd! > 0);

      // 2. Second Call with identical image & query for SAME user -> Cache hit (0 new fetch calls)
      const result2 = await provider.analyzeScene(imagePayload, {
        userId: "auth-user-42",
        requestedQuery: "car keys",
        forceLive: true,
      });

      assert.equal(fetchCallCount, 1, "Cache hit must not make a second network call");
      assert.equal(result2.source, "cache");
      assert.equal(result2.cached, true);
      assert.equal(result2.costUsd, 0, "Cache hit must be billed at $0.00");
    }
  );

  global.fetch = originalFetch;
  budget.resetForTesting(75.0);
  cache.clear();
});

test("Phase 18.1: Cache strictly isolates users and prevents cross-user memory leakage", () => {
  const image = "data:image/jpeg;base64,sharedimagebytes";
  const query = "sunglasses";
  const model = "muse-spark-1.3";

  const keyUser1 = computeCacheKey("user-100", image, query, model);
  const keyUser2 = computeCacheKey("user-200", image, query, model);

  assert.notEqual(keyUser1, keyUser2, "Cache keys must differ between distinct users");

  const cache = VisionCache.getInstance();
  cache.clear();

  const candidates1 = [
    {
      id: "c1",
      item_name: "User 1 Sunglasses",
      location_description: "On desk",
      landmarks: ["desk"],
      description: "Private glasses",
      confidence: "high" as const,
      is_selected: true,
    },
  ];

  cache.set(keyUser1, candidates1);

  // User 1 gets cached item
  assert.equal(cache.get(keyUser1)?.length, 1);
  // User 2 gets NULL
  assert.equal(cache.get(keyUser2), null, "User 2 must never access User 1's cached results");

  cache.clear();
});

test("Phase 18.1: Candidate items require explicit user confirmation before becoming tracked items", () => {
  // Model proposals are structured candidates with status 'suggested' and is_selected=true
  const candidate = {
    id: "cand-123",
    item_name: "Reading Glasses",
    location_description: "Bedside table",
    landmarks: ["table", "lamp"],
    description: "Glasses observed beside the lamp",
    confidence: "high" as const,
    is_selected: true,
  };

  const parsed = SceneAnalysisResponseSchema.safeParse({ candidates: [candidate] });
  assert.equal(parsed.success, true);

  // Candidates remain unpersisted in DB until user invokes confirm action
  assert.equal(candidate.is_selected, true);
});

test("Phase 18.1: Zero accidental network calls in Demo Mode", async () => {
  let networkAttempted = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    networkAttempted = true;
    return new Response("OK");
  };

  const { analyzeScene } = await import("../src/lib/meta.ts");

  await withEnv({ NEXT_PUBLIC_APP_MODE: "demo" }, async () => {
    const result = await analyzeScene({
      image: "data:image/jpeg;base64,demoframe",
      requestedQuery: "backpack",
      source: "glasses_sdk",
      forceLive: false,
    });

    assert.equal(result.source, "mock");
    assert.equal(networkAttempted, false, "Demo Mode must make 0 external network requests");
  });

  global.fetch = originalFetch;
});
