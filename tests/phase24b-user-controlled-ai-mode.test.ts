import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { VisionProviderState } from "../src/lib/vision/providerState.ts";
import { getVisionProvider } from "../src/lib/vision/factory.ts";
import { MockVisionProvider } from "../src/lib/vision/MockVisionProvider.ts";
import { MetaMuseVisionProvider } from "../src/lib/vision/MetaMuseVisionProvider.ts";
import { BudgetManager } from "../src/lib/vision/budget.ts";
import { GET as getSettingsRoute, POST as postSettingsRoute } from "../src/app/api/settings/vision-provider/route.ts";
import { POST as postAnalyzeRoute } from "../src/app/api/analyze/route.ts";

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

test("Phase 24B: Default provider is Mock AI (Free Mode) with zero network calls", async () => {
  const state = VisionProviderState.getInstance();
  state.resetForTesting();

  assert.equal(state.getActiveProvider(), "mock");
  const eligibility = state.getEligibility();
  assert.equal(eligibility.activeProvider, "mock");
  assert.equal(eligibility.userSelectedProvider, "mock");

  // Verify getVisionProvider returns MockVisionProvider by default
  const provider = getVisionProvider();
  assert.ok(provider instanceof MockVisionProvider);
  assert.equal(provider.providerId, "mock");
});

test("Phase 24B: GET /api/settings/vision-provider returns current eligibility and testing budget", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  const req = new NextRequest("http://localhost:3000/api/settings/vision-provider");
  const res = await getSettingsRoute(req);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.activeProvider, "mock");
  assert.equal(data.budget.budgetCapUsd, 5.0);
  assert.ok(typeof data.budget.remainingUsd === "number");
  assert.ok(data.gates);
  assert.equal(data.gates.userSelected, false);
});

test("Phase 24B: Provider switching - activates Meta Muse when all 6 server gates pass", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_test_key",
      META_MAX_SPEND_USD: "5.0",
    },
    async () => {
      // Switch via state manager with developer confirmation
      const switchResult = state.selectProvider("meta_muse", {
        developerConfirmed: true,
      });

      assert.equal(switchResult.success, true);
      assert.equal(switchResult.activeProvider, "meta_muse");
      assert.equal(state.getActiveProvider(), "meta_muse");

      // Verify factory returns MetaMuseVisionProvider
      const provider = getVisionProvider();
      assert.ok(provider instanceof MetaMuseVisionProvider);
      assert.equal(provider.providerId, "meta_muse");
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Server-Side Validation: Blocks Meta Muse when Safety Kill Switch is active", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "true", // Kill switch activated
      MODEL_API_KEY: "valid_test_key",
    },
    async () => {
      // 1. Attempt to select meta_muse via POST endpoint
      const postReq = new NextRequest("http://localhost:3000/api/settings/vision-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "meta_muse",
          developerConfirmed: true,
        }),
      });

      const postRes = await postSettingsRoute(postReq);
      const postData = await postRes.json();

      assert.equal(postRes.status, 400);
      assert.equal(postData.success, false);
      assert.match(postData.error, /kill switch is active/i);
      assert.equal(postData.activeProvider, "mock");
      assert.equal(state.getActiveProvider(), "mock");

      // 2. Direct call to /api/analyze with requestedProvider="meta_muse"
      const analyzeReq = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "data:image/jpeg;base64,sampleImageData",
          requestedProvider: "meta_muse",
          liveConfirmed: true,
        }),
      });

      const analyzeRes = await postAnalyzeRoute(analyzeReq);
      const analyzeData = await analyzeRes.json();

      assert.equal(analyzeRes.status, 403);
      assert.equal(analyzeData.success, false);
      assert.match(analyzeData.error, /kill switch is active/i);
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Server-Side Validation: Blocks Meta Muse when API credentials are missing", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: undefined,
      META_API_KEY: undefined,
    },
    async () => {
      const switchResult = state.selectProvider("meta_muse", {
        developerConfirmed: true,
      });

      assert.equal(switchResult.success, false);
      assert.match(switchResult.error || "", /missing server credentials/i);
      assert.equal(state.getActiveProvider(), "mock");

      // Factory safely defaults to MockVisionProvider
      const provider = getVisionProvider({ requestedProvider: "meta_muse" });
      assert.ok(provider instanceof MockVisionProvider);
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Server-Side Validation: Blocks Meta Muse when $5.00 testing budget is exhausted", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
      META_MAX_SPEND_USD: "5.0",
    },
    async () => {
      // Simulate that total spend has reached $5.00 cap
      const res = budget.reserveBudget(5.0);
      budget.reconcileBudget(res.reservationId, 5.0, {
        id: "cap_fill",
        timestamp: new Date().toISOString(),
        model: "muse-spark-1.3",
        input_tokens: 100,
        output_tokens: 50,
        cached: false,
        estimated_cost_usd: 5.0,
        actual_cost_usd: 5.0,
        status: "success",
        user_id: "test-user",
      });

      assert.equal(budget.getSummary().budgetRemainingUsd, 0);

      const switchResult = state.selectProvider("meta_muse", {
        developerConfirmed: true,
      });

      assert.equal(switchResult.success, false);
      assert.match(switchResult.error || "", /testing budget cap reached/i);
      assert.equal(state.getActiveProvider(), "mock");
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Confirmation Requirement: Rejects live analysis without explicit user confirmation", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  await withEnv(
    {
      ENABLE_LIVE_META_API: "true",
      META_REQUESTS_KILL_SWITCH: "false",
      MODEL_API_KEY: "valid_key",
    },
    async () => {
      state.selectProvider("meta_muse", { developerConfirmed: true });

      // Live request with liveConfirmed: false
      const unconfirmedReq = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "data:image/jpeg;base64,mockImage",
          requestedProvider: "meta_muse",
          liveConfirmed: false, // NOT confirmed
        }),
      });

      const res = await postAnalyzeRoute(unconfirmedReq);
      const data = await res.json();

      assert.equal(res.status, 400);
      assert.equal(data.success, false);
      assert.match(data.error, /requires explicit user confirmation/i);
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Client cannot force live inference by setting requestedProvider='meta_muse' alone", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  // In default demo mode with kill switch active
  await withEnv(
    {
      NEXT_PUBLIC_APP_MODE: "demo",
      ENABLE_LIVE_META_API: "false",
      META_REQUESTS_KILL_SWITCH: "true",
    },
    async () => {
      const spoofedReq = new NextRequest("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "data:image/jpeg;base64,spoofedImage",
          requestedProvider: "meta_muse",
          liveConfirmed: true,
        }),
      });

      const res = await postAnalyzeRoute(spoofedReq);
      const data = await res.json();

      assert.equal(res.status, 403);
      assert.equal(data.success, false);
      assert.match(data.error, /Live Meta Muse inference blocked/i);
    }
  );

  state.resetForTesting();
  budget.resetForTesting(75.0);
});

test("Phase 24B: Switching back to Mock AI executes completely offline with zero cost", async () => {
  const state = VisionProviderState.getInstance();
  const budget = BudgetManager.getInstance();
  state.resetForTesting();
  budget.resetForTesting(5.0);

  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  };

  try {
    // Switch to mock
    state.selectProvider("mock");
    assert.equal(state.getActiveProvider(), "mock");

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: "data:image/jpeg;base64,mockImageOffline",
        requestedProvider: "mock",
        liveConfirmed: false,
      }),
    });

    const res = await postAnalyzeRoute(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.source, "mock");
    assert.equal(fetchCalled, false, "External fetch must NEVER be invoked in Mock AI mode");
    assert.equal(budget.getSummary().totalCostUsd, 0, "Cost must remain strictly $0.00");
  } finally {
    global.fetch = originalFetch;
    state.resetForTesting();
    budget.resetForTesting(75.0);
  }
});

