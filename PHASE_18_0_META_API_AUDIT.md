# Phase 18.0 — Meta Muse API Compatibility Audit & Integration Planning

**Project Root:** `/Users/aastik7898/Desktop/Yaad`  
**Phase:** 18.0 (Audit, Compatibility Verification & Architectural Planning)  
**Status:** Audit Complete · **Zero Paid API Calls Made** · All Work Verified Against First-Party Documentation  
**Date:** November 1, 2026  

---

## 1. Executive Summary & Verification Safeguards

Phase 18.0 establishes the verified technical foundation for integrating Meta's generative vision models into Yaad's existing Next.js backend, Supabase persistence layer, and Unity spatial client.

> **Zero Paid API Calls Confirmation:**  
> During this audit phase, **zero HTTP requests** were sent to Meta's paid inference endpoints (`https://api.meta.ai/v1/responses` or `https://api.meta.ai/v1/chat/completions`). **Zero API credits were consumed** from the developer credit pool. No production code was modified, and mock vision remains the active operational provider across both web and Unity spatial clients.

---

## 2. Official Meta Model API Specification & Capability Verification

All findings below were verified against official Meta Model API developer documentation (`api.meta.ai` / `developer.meta.ai/ai`):

### 2.1 API Base URLs and Endpoints
* **Base URL:** `https://api.meta.ai/v1`
* **Primary Modern Endpoint (Meta Native):** `POST https://api.meta.ai/v1/responses`
* **OpenAI-Compatible Endpoint:** `POST https://api.meta.ai/v1/chat/completions`

### 2.2 Authentication
* **Header:** `Authorization: Bearer <MODEL_API_KEY>`
* Keys are generated via the Meta Developer Portal (`developer.meta.ai/ai`).
* All requests require standard TLS 1.3 encryption and `Content-Type: application/json`.

### 2.3 Available Muse Family Models
* **`muse-spark-1.3` (Flagship):** Primary agentic reasoning and multimodal model. 1,048,576 tokens (1M token context window). Optimized for complex multi-step reasoning, tool-calling, and vision tasks.
* **`muse-spark-1.3-contributor`:** Same weights and capabilities as `muse-spark-1.3`, but operating under the Contributor data-sharing agreement at an 85–95% price discount.
* **`muse-spark-1.1`:** Previous iteration; maintained for backward compatibility.
* **`muse-wonder-1.0` / `muse-wonder`:** Frontier long-context reasoning series for deep memory synthesis.
* **`muse-fast-1.0`:** Ultra-low latency variant for rapid routing and lightweight text parsing.
* **`muse-image`:** Dedicated image generation and instruction-based editing model ($0.01 flat fee per generated image).

### 2.4 Multimodal & Visual Understanding Capabilities (`muse-spark-1.3`)
* **Visual Understanding Support:** **CONFIRMED**. `muse-spark-1.3` natively accepts image inputs alongside text for visual grounding, object detection, landmark identification, and scene understanding.
* **Input Mechanisms:**
  1. **Inline Base64 Data URL:** Accepts `data:image/<mime>;base64,<encoded_bytes>` directly in the request payload.
  2. **Public Image URL:** Accepts fully qualified HTTP/HTTPS image URLs.
  3. **Files API:** Large or repeatedly referenced assets can be pre-uploaded via `POST /v1/files` to obtain a `file_id`.
* **Supported MIME Types:** `image/jpeg` (and `image/jpg`), `image/png`, `image/webp`, `image/gif`, `image/x-icon`.
* **Payload & Size Constraints:**
  * Inline Base64/URL limit: **50 MB** per request payload.
  * Files API limit: Up to **1 GiB** per file.
  * Image quantity: Up to **50 images** per individual request.
  * Context footprint: Visual inputs are converted into visual patch tokens (dynamically mapped according to image dimensions) and counted against the 1M token context window.

### 2.5 Pricing, Credit & Token Economics

| Model Tier | Data Policy | Input Tokens (per 1M) | Cached Input (per 1M) | Output Tokens (per 1M) |
| :--- | :--- | :--- | :--- | :--- |
| **`muse-spark-1.3` (Standard)** | **Private / Zero Training** (Customer data is never used to train Meta models; ZDR compatible) | **$1.25** | **$0.15** | **$4.25** |
| **`muse-spark-1.3-contributor`** | **Contributor** (Prompts, images, and completions may be used to improve Meta models) | **$0.10** | **$0.002** | **$0.20** |

* **Image Token Pricing:** There is **no separate image token surcharge**. Image patch tokens are billed at standard input token rates ($1.25/M standard, $0.10/M contributor).
* **Credit Pool Allocation ($150 Total):**
  * **Allocated Budget Cap:** **$75.00**
  * **Protected Reserve:** **$75.00** (guaranteed unspent)
  * On the standard tier (`muse-spark-1.3`), an average scene analysis consuming ~1,500 visual input tokens and ~250 structured output tokens costs approximately **$0.0029** per query. A $75 budget accommodates **~25,000 live scene analyses**.
  * On the contributor tier, the same query costs **$0.0002**, accommodating **~350,000 queries**.

### 2.6 Rate Limits & Error Handling
* **Default Team Quotas:** 3,000 Requests Per Minute (RPM); 4,000,000 Tokens Per Minute (TPM).
* **Rate Limit Status:** HTTP `429 Too Many Requests` with a `Retry-After` header. Requires exponential backoff with randomized jitter (initial delay ~500ms).
* **Error Format:**
  ```json
  {
    "error": {
      "message": "Human-readable description of rejection",
      "type": "invalid_request_error | rate_limit_error | authentication_error | server_error",
      "param": "field_name_or_null",
      "code": "specific_code_or_null"
    }
  }
  ```

---

## 3. Request & Response Schema Comparison

Meta supports two API formats for multimodal scene analysis:

### Option A: Native Responses API (`POST /v1/responses`)
```json
{
  "model": "muse-spark-1.3",
  "input": [
    {
      "type": "message",
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Detect personal belongings set down in this scene. Output strict JSON matching the requested schema."
        },
        {
          "type": "input_image",
          "image_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
        }
      ]
    }
  ]
}
```

### Option B: OpenAI-Compatible Chat Completions (`POST /v1/chat/completions`)
```json
{
  "model": "muse-spark-1.3",
  "messages": [
    {
      "role": "system",
      "content": "You are Yaad's visual grounding assistant. You detect personal belongings (keys, wallet, glasses, water bottle, bag) set down in a scene. Always return valid JSON matching the schema."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Identify personal belongings set down in this scene."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
          }
        }
      ]
    }
  ],
  "max_tokens": 800,
  "temperature": 0.1,
  "response_format": { "type": "json_object" }
}
```

**Recommendation:** Option B (`/v1/chat/completions`) is recommended for Phase 18.1 because it directly conforms to Yaad's existing `src/lib/meta.ts` client architecture and standard JSON mode enforcement (`response_format: { type: "json_object" }`).

---

## 4. Audit of Existing Yaad Architecture

The codebase was inspected across 10 critical dimensions:

1. **`src/app/api/analyze/route.ts`:**
   - Validates incoming payloads via `AnalyzeRequestSchema`. Rejects malformed JSON with HTTP 400.
   - Derives user identity exclusively from verified Supabase JWT Bearer tokens via `getSupabaseServerClient(token)`. Defaults to `"demo-user"` when unauthenticated.
   - Dispatches safely to `analyzeScene(payload)`.
2. **`src/lib/mockVision.ts`:**
   - Provides deterministic, grounded mock candidate generation (`keys`, `wallet`, `glasses`, `bottle`, `bag`, or fallback).
   - Operates with zero network calls and simulated 750ms latency.
3. **`src/lib/meta.ts`:**
   - Implements in-memory `requestCache` using SHA-256 keys scoped by `userId`.
   - Implements `usageLedger` tracking tokens, costs, and cache hits.
   - Implements kill switch (`META_REQUESTS_KILL_SWITCH`) and budget cap ($75).
   - Currently contains a placeholder endpoint (`https://graph.facebook.com/v21.0/chat/completions` and `llama-3.2-11b-vision-instruct`) that needs to be updated to `https://api.meta.ai/v1` and `muse-spark-1.3`.
4. **`src/app/api/usage/route.ts`:**
   - Exposes `GET /api/usage` delivering real-time spend, tokens, and budget remaining.
5. **Authentication & Authorization:**
   - Supabase RLS policies and server-side JWT verification ensure multi-tenant isolation.
6. **Zod Validation (`src/lib/schemas.ts`):**
   - Enforces a 7MB ceiling on incoming image payloads.
   - Enforces `CandidateItemSchema` with required grounded fields (`location_description`, `landmarks`, `confidence`).
7. **Image Storage (`src/lib/storage.ts`):**
   - Stores confirmed snapshots in private Supabase Storage (`yaad-memories-private`).
8. **Demo Mode vs Cloud Mode Separation:**
   - Demo Mode: Entirely local, uses `LocalStorageRepository`, zero external network calls.
   - Cloud Mode: Uses Supabase DB + Storage, authenticated requests.
9. **Unity Client (`YaadApiClient.cs`):**
   - `AnalyzeFrame` sends `glasses_sdk` source frames to `/api/analyze`.
   - Never communicates with Meta directly; never stores Meta credentials.
10. **Test Coverage:**
    - 54 web unit tests pass cleanly; 11 Unity C# backend tests pass cleanly.

---

## 5. Proposed Integration Architecture: AI Provider Abstraction

To cleanly isolate Meta's API without tight coupling or breaking changes, we propose introducing a `VisionProvider` interface in `src/lib/vision/`:

```
Client (Web UI / Unity Spatial)
         │
         ▼
Next.js Route: /api/analyze
         │
         ▼
Server-Side JWT Auth & Mode Check
         │
         ▼
VisionProviderFactory.getProvider()
  ├── [Demo Mode OR Kill Switch Active] ──► MockVisionProvider (Offline / Fixtures)
  └── [Cloud Mode & Verified Token & Feature Flag ON] ──► MetaMuseVisionProvider (api.meta.ai)
                                                                 │
                                                                 ▼
                                                       SHA-256 Request Cache
                                                                 │ (miss)
                                                                 ▼
                                                       Budget Guard (Cap $75)
                                                                 │ (approved)
                                                                 ▼
                                                       POST https://api.meta.ai/v1/chat/completions (muse-spark-1.3)
                                                                 │
                                                                 ▼
                                                       Zod Schema Validator (SceneAnalysisResponseSchema)
                                                                 │
                                                                 ▼
                                                       Usage Ledger (Track Spend & Tokens)
                                                                 │
                                                                 ▼
                                                       Return Grounded Candidate Items (Unconfirmed)
```

### Provider Contract
```typescript
export interface VisionProvider {
  readonly providerId: string;
  readonly modelId: string;
  analyzeScene(
    image: string,
    context?: { query?: string; userId?: string; forceLive?: boolean }
  ): Promise<{
    candidates: CandidateItemOutput[];
    source: "mock" | "cache" | "live_meta_api";
    metaModel: string;
    cached?: boolean;
  }>;
}
```

---

## 6. Cost, Privacy & Safety Safeguards

### Budget & Spending Guardrails
1. **Developer Credit Ceiling ($75 Limit / $75 Reserve):**
   - In-memory and persistent environment variable: `META_MONTHLY_BUDGET_CAP_USD=75`.
   - Hard check before dispatching: if `currentSpend >= BUDGET_CAP_USD`, request is aborted immediately with `status: "rate_limited"`.
2. **Global Instant Kill Switch:**
   - `META_REQUESTS_KILL_SWITCH=true` immediately diverts or halts all requests without making network calls.
3. **Explicit Server-Side Feature Flag:**
   - `ENABLE_LIVE_META_API=false` by default. Must be explicitly set to `true` to enable outbound traffic.
4. **SHA-256 Deduplication Cache:**
   - Hashes `userId + model + query + image_fingerprint`. Exact duplicates within a session are served at $0.00.
5. **Request Concurrency & Rate Limiting:**
   - Single in-flight request per user to prevent concurrent duplicate spending.

### Privacy & Ethical Boundaries
1. **Model Selection for Privacy:**
   - Production must use `muse-spark-1.3` (Standard Tier) to guarantee Zero Data Training.
   - `muse-spark-1.3-contributor` is strictly reserved for developer test fixtures with synthetic images if cost optimization is needed.
2. **Zero Facial Recognition / Biometrics:**
   - The system prompt explicitly commands: *"Never attempt facial recognition, identify specific persons, or extract biometric markers. Detect only personal belongings."*
3. **Separation of People Memory:**
   - People Memory remains a user-authored contextual notebook; it is never auto-populated by computer vision.
4. **Zero Credential or Image Logging:**
   - Image base64 payloads, full data URLs, and API tokens are never written to `console.log`, file logs, or error traces.

---

## 7. Belonging Memory Pipeline: Candidate-First Architecture

The lifecycle of an observed item strictly enforces human-in-the-loop confirmation:

```
[Camera / Viewfinder Capture]
         │
         ▼
[Vision Analysis (api.meta.ai)]
         │
         ▼
[Grounded Candidates Generated] ─── (status: 'suggested', NOT in DB)
         │
         ▼
[Explicit User Review]
     ├── Discard ──► [Memory Dropped Immediately]
     └── Confirm ──► [Persist to Supabase DB via /api/items/confirm]
                           │
                           ▼
             [Available in Grounded Recall]
```

* **No Speculative Current Locations:** Responses specify the last grounded sighting only ("Observed on the kitchen counter at 10:15 AM"), never asserting where the object currently is.

---

## 8. Files to Modify in Phase 18.1

No code was modified in Phase 18.0. In Phase 18.1, modifications will be isolated to:

1. **`src/lib/meta.ts`:**
   - Update `META_API_BASE_URL` to default to `https://api.meta.ai/v1`.
   - Update `MODEL_ID` to default to `muse-spark-1.3`.
   - Implement OpenAI-compatible payload structure matching `muse-spark-1.3` multimodal specifications.
   - Align token pricing with verified Meta rates ($1.25/M in, $4.25/M out).
2. **`src/lib/vision/` (New Provider Directory):**
   - Create `types.ts`, `MockVisionProvider.ts`, `MetaMuseVisionProvider.ts`, and `factory.ts`.
3. **`.env.example`:**
   - Add documentation for `MODEL_API_KEY`, `META_API_BASE_URL=https://api.meta.ai/v1`, `META_MODEL_ID=muse-spark-1.3`, `ENABLE_LIVE_META_API=false`, and `META_MONTHLY_BUDGET_CAP_USD=75`.
4. **`tests/phase18-meta-api.test.ts` (New Test Suite):**
   - Add unit tests for budget capping, kill switch activation, payload formatting, error handling, and mock fallback.

---

## 9. Phase 18.1 Implementation Plan

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 18.1 EXECUTION SEQUENCE                                         │
├────────┬───────────────────────────────────────────────────────────────┤
│ Step 1 │ Create VisionProvider abstraction & unit test suite           │
│ Step 2 │ Refactor src/lib/meta.ts with verified api.meta.ai contracts  │
│ Step 3 │ Implement strict budget guard ($75) & kill switch checks     │
│ Step 4 │ Validate offline Demo Mode isolation (zero calls verified)    │
│ Step 5 │ Run full regression suite (54 web tests + 11 Unity tests)    │
│ Step 6 │ Await explicit user approval before configuring live API keys │
└────────┴───────────────────────────────────────────────────────────────┘
```

---

## 10. Recommendation

**Recommendation: PROCEED TO PHASE 18.1.**

### Rationale:
1. **Verified Toolchain:** The Meta Model API specifications (`api.meta.ai/v1`, `muse-spark-1.3`, base64 image formats, pricing, and error envelopes) are verified from first-party documentation.
2. **Clean Abstraction:** The proposed `VisionProvider` interface isolates the live Meta API call without touching existing Supabase database schemas, Next.js routing structures, or Unity client code.
3. **Ironclad Guardrails:** The $75 budget cap, instant kill switch, SHA-256 request cache, and candidate confirmation pipeline protect both the developer's credit balance and user privacy.
4. **Non-Breaking:** All 54 existing web tests and 11 Unity spatial tests remain completely unaffected.

