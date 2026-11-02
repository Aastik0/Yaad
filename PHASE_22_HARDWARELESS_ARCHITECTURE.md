# Yaad Phase 22: Hardwareless Meta Display Architecture

**Status:** Completed Architecture Design  
**Date:** November 1, 2026  
**Project:** Yaad — Context-Aware Memory Assistant  
**Target:** Meta Ray-Ban Display Smart Glasses (Simulated 100% Hardwareless on Mac)  

---

## 1. System Architecture Overview

The Yaad Hardwareless Display Architecture enables full, interactive end-to-end development, testing, and demonstration of Yaad on Meta Ray-Ban Display smart glasses without requiring physical hardware.

```
┌────────────────────────────────────────────────────────────────────────┐
│           META RAY-BAN DISPLAY SIMULATOR (Chrome Extension)            │
│  - 600x600 Additive Display Canvas                                     │
│  - Optical Backgrounds (Dark room, Outdoor glare, Live Mac Webcam)     │
│  - Hardware D-Pad / Touchpad Keyboard Mapping (Arrows + Enter)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              YAAD DISPLAY INTERFACE (Next.js Route: /display)          │
│  - Fixed 600x600 px Viewport (Additive #000000 Background)             │
│  - Directional Focus Navigation Engine (Zero Mouse Dependency)         │
│  - Display State Machine (Idle, Capture, Confirm, Alert, Recall, Nav)  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│  VIRTUAL HARDWARE ADAPTER (Dev-Only) │  │  EXISTING YAAD BACKEND APIS  │
│  - Eye-Level POV Scene Injection     │  │  - POST /api/analyze         │
│  - Spoken Voice Command Trigger      │  │  - POST /api/recall          │
│  - Geolocation Displacement Trigger  │  │  - POST /api/items/confirm   │
│  - Touchpad Tap / Swipe Events       │  │  - GET  /api/items           │
└──────────────────────────────────────┘  └──────────────┬───────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│               VISION AI PROVIDER & MEMORY ENGINE                       │
│  - MockVisionProvider (Safe Default, Grounded Candidates, $0.00 Cost)  │
│  - MetaMuseVisionProvider (Server-Only, Behind 5 Safety Gates)         │
│  - Deterministic Voice Intent Parser (voiceIntent.ts)                  │
│  - Haversine Geofence & Anti-Jitter Buffer Engine (geo.ts)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  STORAGE & PERSISTENCE LAYER                           │
│  - Demo Mode: LocalStorageRepository (100% Offline Resilience)         │
│  - Cloud Mode: Supabase PostgreSQL + Row-Level Security (RLS)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dedicated Display Web App Route: `/display`

To simulate the exact native experience of a Meta Ray-Ban Display Web App, Yaad establishes a dedicated entry point at:
```
http://localhost:3000/display
```

### Visual & Optical Constraints:
* **Dimensions:** Fixed $600 \times 600$ CSS pixels, matching the glasses' monocular waveguide.
* **Additive Optical Model:**
  * Background: Strictly `#000000`. In additive waveguide displays, black pixels emit zero light, rendering as completely transparent to the user's eye.
  * Primary Elements: High-contrast luminescent colors:
    * Pure White (`#FFFFFF`) for primary headings, values, and bounding box labels.
    * Emerald Green (`#34D399`) for active GPS, confirmed status, and low-latency cues.
    * Warm Amber (`#FBBF24`) for unconfirmed belongings and proactive departure alerts.
    * Cyan / Sky Blue (`#38BDF8`) for navigation arrows and search badges.
* **Typography:** Large, legibility-first sans-serif system fonts with generous letter-spacing to prevent optical fringing on optical micro-LED displays.

---

## 3. Directional Focus Navigation Engine

Display Web Apps do not possess mouse cursors, touch gestures, or standard browser scrollbars. The `/display` interface incorporates a **Directional Focus State Machine**:
* Captures standard keyboard events dispatched by the Meta Simulator:
  * `ArrowUp` / `ArrowDown`: Moves focus vertically between interactive cards and menu actions.
  * `ArrowLeft` / `ArrowRight`: Moves focus horizontally across carousel items or candidate checkboxes.
  * `Enter`: Activates the currently focused element (e.g. Select candidate, trigger photo snap, dismiss alert).
  * `Escape` / `Backspace`: Navigates to the parent view or returns to the idle HUD.
* Every interactive component displays an unambiguous high-contrast **Focus Reticle** (`ring-2 ring-emerald-400 bg-white/10`) indicating where the user's attention is currently directed.

---

## 4. Virtual Hardware Adapter Specification

Because the Meta Display Simulator does not inject simulated outward camera frames, speech recognition transcripts, or GPS coordinate shifts directly into standard web APIs, the **Virtual Hardware Adapter** (`src/lib/display/virtualHardwareAdapter.ts`) acts as an isolated development bridge:

### A. Simulated Camera Input
* Provides pre-grounded eye-level Point-of-View (POV) scenes (e.g. Cafe table with apartment keys, leather wallet, water bottle).
* Formatted as authentic base64 JPEG data URLs compliant with `AnalyzeRequestSchema`.
* Injected directly into the `/api/analyze` request payload with source identifier `glasses_sdk`.

### B. Simulated Voice Commands
* Dispatches simulated speech transcripts into `parseVoiceIntent()`:
  * *"Remember my belongings"* $\to$ dispatches `REMEMBER` intent.
  * *"Where are my keys?"* $\to$ dispatches `RECALL` intent.
  * *"Take me to my wallet"* $\to$ dispatches `NAVIGATE` intent.
* Automatically triggers audio playback of spoken responses using browser `speechSynthesis` through Mac speakers.

### C. Simulated Geolocation Displacement
* Provides single-click displacement shifts (`+20m`, `+60m Breach`, `Reset`) to test Haversine geofence boundaries and the 2-reading anti-jitter buffer live on the glasses display.

### D. Isolation & Safety Rules
* **Environment Guard:** The adapter is accessible **only** when `process.env.NODE_ENV !== "production"` or when explicitly running on `/display`.
* **Zero Fabrication:** The adapter clearly displays a `SIMULATED HARDWARE ADAPTER` badge on the bottom bar, transparently distinguishing simulated input from real backend execution.

---

## 5. Existing Codebase Reuse Matrix

| Existing Module | Code Path | Reused For Display Web App |
| :--- | :--- | :--- |
| **Scene Analysis Route** | `src/app/api/analyze/route.ts` | Processes POV frame snapshots from the glasses display; enforces 7MB ceiling. |
| **Vision Provider Abstraction** | `src/lib/vision/factory.ts` | Automatically routes to `MockVisionProvider` (0 cost) while supporting `MetaMuseVisionProvider`. |
| **Deterministic Intent Parser** | `src/lib/voiceIntent.ts` | Parses voice commands into `REMEMBER`, `RECALL`, and `NAVIGATE` intents. |
| **Grounded Recall Route** | `src/app/api/recall/route.ts` | Resolves item sightings from Supabase Cloud or LocalStorage without hallucination. |
| **Haversine Geofence Engine** | `src/lib/geo.ts` | Evaluates departure distance, accuracy filtering ($\pm 65\text{m}$), and anti-jitter buffer. |
| **Navigation URL Generator** | `src/lib/geo.ts` | Generates Google Maps and Apple Maps deep links with walking mode directions. |
| **Calm Speech Synthesis** | `src/lib/speech.ts` | Speaks audio confirmations through the glasses' simulated open-ear speakers. |
| **Supabase Repositories** | `src/lib/repository/` | Persists confirmed belongings to cloud PostgreSQL with active RLS policies. |

---

## 6. End-to-End Display State Machine

```
   ┌─────────────────────────────────────────────────────────┐
   │                    1. IDLE HUD VIEW                     │
   │  - Minimal status bar (Time, Battery, Active Belongs)   │
   │  - D-Pad Focus: [Remember Scene] [Recall] [Status]      │
   └────────────┬─────────────────────────────┬──────────────┘
                │ (Enter on Remember)         │ (Enter on Recall)
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │   2. CAPTURE & ANALYZE    │ │      5. RECALL VIEW       │
   │  - Eye-level POV reticle  │ │  - Grounded sighting card │
   │  - Submits to /api/analyze│ │  - Room location & context│
   └────────────┬──────────────┘ └────────────┬──────────────┘
                │                             │
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │ 3. CONFIRM CANDIDATES     │ │     6. NAVIGATION VIEW    │
   │  - Checkbox candidate list│ │  - Direction arrow & dist │
   │  - Persists to repository │ │  - Map handoff QR / links │
   └────────────┬──────────────┘ └───────────────────────────┘
                │
                ▼
   ┌───────────────────────────┐
   │ 4. PROACTIVE DEPARTURE    │
   │  - Geofence breach alert  │
   │  - "Keys may still be at" │
   │  - Spoken audio warning   │
   └───────────────────────────┘
```

---

## 7. Architecture Summary & Security Invariant

This architecture ensures that **100% of the real application logic runs against real Next.js APIs, real Supabase databases, real Haversine algorithms, and real intent parsers**. Only the physical hardware sensors (camera lens, physical temple arm touchpad, physical walking movement) are bridged via the adapter, preserving $0.00 API cost, zero cloud credential leakage, and full hackathon demo repeatability on our Mac.

