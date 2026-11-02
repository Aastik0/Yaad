# Phase 24B: User-Controlled Vision AI Provider Selector

**Yaad · Wearable Proactive Memory Assistant**  
**Date:** November 1, 2026  
**Status:** ✅ Fully Implemented & Verified  
**Total Test Suite:** 122/122 Tests Passing  
**Credit Balance Spend:** $0.00 / $150.00 ($150.00 Untouched Reserve)  
**Initial Testing Spend Cap:** $5.00 (Hard Server Limit)  

---

## 1. Executive Summary

Phase 24B introduces a **user-controlled AI Vision Grounding Provider selector** in Yaad, empowering developers and users to seamlessly toggle between **Mock AI (Free Mode)** and **Meta Muse (Live AI)** directly within the user interface, while enforcing strict server-side authorization gates, explicit user confirmations, and credit-protection guardrails.

Crucially, **the server never trusts a client-supplied provider parameter alone**. Live requests to the Meta Model API (`muse-spark-1.3`) are authorized **only when all 6 server-side safety gates are simultaneously satisfied**.

---

## 2. Architecture & Security Gate Enforcement

### The 6 Independent Server Gates

```
               [ User Action: Capture / Analyze Scene ]
                                  │
                                  ▼
               [ Client Confirmation Dialog (Modal) ]
                  "Consume Meta API credits? [Cancel/Confirm]"
                                  │
                                  ▼
            [ POST /api/analyze with liveConfirmed=true ]
                                  │
   ┌──────────────────────────────┴──────────────────────────────┐
   │                  6 Server-Side Safety Gates                 │
   │                                                             │
   │  Gate 1: Explicit User Selection (Live AI requested)        │
   │  Gate 2: ENABLE_LIVE_META_API === true                      │
   │  Gate 3: META_REQUESTS_KILL_SWITCH === false (Inactive)    │
   │  Gate 4: MODEL_API_KEY or META_API_KEY Present              │
   │  Gate 5: BudgetManager: Unreserved Budget > $0 (≤ $5 Cap)   │
   │  Gate 6: Authenticated User (JWT) or Confirmed Dev Session  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
           [ ALL PASS ]                      [ ANY FAILS ]
                 │                                 │
                 ▼                                 ▼
   [ MetaMuseVisionProvider ]              [ Safe Fallback ]
   - Atomic Budget Reservation             - HTTP 403 Forbidden
   - Outbound Meta Model API               - Zero External Calls
   - Token & Cost Reconciliation           - Detailed Rejection Reason
```

1. **Gate 1: Explicit Selection**  
   The user or developer must explicitly opt into Meta Muse via the UI or `POST /api/settings/vision-provider`. Mock AI remains the strict default.
2. **Gate 2: Feature Flag Activation**  
   `ENABLE_LIVE_META_API=true` must be set in server environment variables.
3. **Gate 3: Kill Switch Inactive**  
   `META_REQUESTS_KILL_SWITCH=false`. If flipped to `true`, all live inference is immediately blocked server-side with zero network calls.
4. **Gate 4: Server-Side Secret Verification**  
   A valid `MODEL_API_KEY` or `META_API_KEY` must exist in server environment variables. API keys are never transmitted to client browsers.
5. **Gate 5: Testing Spend Ceiling ($5.00 Cap)**  
   Enforced atomically by `BudgetManager`. Any request that would push total expenditure beyond $5.00 is blocked before dispatch.
6. **Gate 6: User Authentication / Developer Authorization**  
   Live inference requires a verified Supabase JWT (`Authorization: Bearer <token>`) or explicit developer session authorization. Unauthenticated anonymous users (`demo-user`) are restricted to Mock AI.

---

## 3. UI Implementation Details

### A. Developer Controls Drawer (`DeveloperDrawer.tsx`)
- **Segmented Provider Toggle:**
  - **Mock AI (Free):** Offline demo engine with instant grounded candidates and zero external network calls.
  - **Meta Muse (Live AI):** Meta Model API (`muse-spark-1.3`). Consumes credits under the $5.00 testing cap.
- **Dynamic Status & Warning Badges:**
  - Live AI Active: High-contrast amber badge with warning notice:  
    *“Live Inference Mode Active: Camera captures will query Meta Model API (`muse-spark-1.3`). Credit consumption is bounded to your $5.00 cap. Each scene analysis requires explicit one-click confirmation.”*
  - Mock AI Active: Forest green badge (*“Mock AI (Zero Cost)”*).
- **Disabled State & Explanation:**
  - When live conditions are not met (e.g. kill switch active, API key missing, or budget exhausted), the Live AI button is disabled and displays an inline rejection reason (e.g., `Blocked: Developer safety kill switch is active`).
- **Telemetry & Budget Progress:**
  - Displays actual spend: `$0.0000 / $5.00 testing cap ($5.0000 remaining)`.
  - Untouched Reserve display: `$145.00 reserved` from $150 credit pool.

### B. Capture Modal (`CaptureModal.tsx`)
- **Active Engine Indicator:**
  - Displays `Engine: Mock AI (Free)` or `Engine: Meta Muse (Live AI)` above the analyze action.
- **Explicit Confirmation Modal:**
  - When Meta Muse is active and the user clicks **Analyze Scene**, a modal appears:  
    *“Confirm Live Meta AI Scene Analysis: You are about to submit this image frame to Meta Model API (muse-spark-1.3). This will consume API credits under your $5.00 testing allowance. Proceed?”*
  - **Actions:**
    - `Cancel`: Closes modal, aborts immediately; **zero external calls**.
    - `Confirm & Analyze`: Sends `/api/analyze` request with `liveConfirmed: true` and Supabase bearer token.
- **Error Handling Without Retries:**
  - In case of budget breach or server rejection, displays a high-visibility terracotta error banner without automatic retries.

---

## 4. Modified & Created Files

| File | Type | Purpose |
|---|---|---|
| `src/lib/vision/providerState.ts` | **New** | Centralized, server-validated state manager for AI Vision provider selection, gate evaluation, and testing resets. |
| `src/app/api/settings/vision-provider/route.ts` | **New** | `GET` (reads provider eligibility & budget) and `POST` (updates provider selection with server validation). |
| `src/lib/vision/factory.ts` | **Updated** | Updated `getVisionProvider()` to integrate `VisionProviderState` and user-selected provider requests. |
| `src/lib/vision/index.ts` | **Updated** | Exported `VisionProviderState`. |
| `src/lib/schemas.ts` | **Updated** | Added `requestedProvider` and `liveConfirmed` to `AnalyzeRequestSchema`. |
| `src/lib/meta.ts` | **Updated** | Added `budgetCapUsd` and `liveApiEnabled` to `getUsageLedger()`; added provider passthrough to `analyzeScene()`. |
| `src/app/api/analyze/route.ts` | **Updated** | Implemented server-side gate validation, mandatory `liveConfirmed` check, and HTTP 400/403 fail-closed responses. |
| `src/components/DeveloperDrawer.tsx` | **Updated** | Added Vision AI Provider selector, amber live warning, confirmation modal, and dynamic budget display. |
| `src/components/CaptureModal.tsx` | **Updated** | Added active provider badge, explicit pre-inference confirmation modal, and JWT bearer authentication. |
| `tests/phase24b-user-controlled-ai-mode.test.ts` | **New** | Comprehensive 9-test automated test suite covering all gates, switching, confirmation, and budget limits. |

---

## 5. Verification & Test Results

### Automated Test Suite: 122/122 Passing

```bash
$ npm test
✔ Phase 24B: Default provider is Mock AI (Free Mode) with zero network calls (0.539ms)
✔ Phase 24B: GET /api/settings/vision-provider returns current eligibility and testing budget (2.264ms)
✔ Phase 24B: Provider switching - activates Meta Muse when all 6 server gates pass (0.174ms)
✔ Phase 24B: Server-Side Validation: Blocks Meta Muse when Safety Kill Switch is active (1.280ms)
✔ Phase 24B: Server-Side Validation: Blocks Meta Muse when API credentials are missing (0.104ms)
✔ Phase 24B: Server-Side Validation: Blocks Meta Muse when $5.00 testing budget is exhausted (0.786ms)
✔ Phase 24B: Confirmation Requirement: Rejects live analysis without explicit user confirmation (0.422ms)
✔ Phase 24B: Client cannot force live inference by setting requestedProvider='meta_muse' alone (0.427ms)
✔ Phase 24B: Switching back to Mock AI executes completely offline with zero cost (753.361ms)
...
ℹ tests 122
ℹ pass 122
ℹ fail 0
```

### Static Analysis & Production Build
- **ESLint:** Clean (0 warnings, 0 errors).
- **TypeScript:** Strict typecheck passed.
- **Next.js Production Build:** `next build` compiled 11 routes successfully in 8.2 seconds.
- **Credit Spend Verification:** Total actual expenditure across all testing: **$0.00**.

