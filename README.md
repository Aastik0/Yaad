# Yaad 🧠 — AI Memory Companion
> **Wearable-First AI Memory Assistant for Belongings & People**  
> *Designed for Meta Smart Glasses | Built for the Meta AI Developer Hackathon*  
> *“No one deserves to forget. Everyone deserves to remember.”*

---

## 🌟 1. Executive Summary & Core Mission

Every day, millions of people experience the distress of leaving essential belongings behind: keys on a coffee table, a wallet on a café bistro table, prescription reading glasses by an entrance, or a water bottle in a classroom.

For individuals living with **dementia, mild cognitive impairment (MCI), early Alzheimer's, or ADHD**, this is not just an inconvenience—it causes severe disorientation, distress, and a loss of personal autonomy.

**Yaad** turns smart glasses into a gentle, proactive memory companion:
1. **Scene Grounding:** With an eye-level POV snapshot or voice command (*"Hey Meta, map my belongings"*), Yaad identifies what you set down and grounds it against real visual landmarks and exact GPS coordinates.
2. **Proactive Radius Geofence:** When you step away beyond a safe radius (e.g., 50 meters), Yaad checks for unconfirmed items and announces a calm reminder through directional open-ear speakers.
3. **Grounded Recall:** Ask *"Where did I last leave my keys?"* and receive a truthful historical observation with timestamps and landmarks.
4. **People Memory (Secondary · Opt-in):** Privately record and recall notes about people you meet (names, where you met, conversation notes) with strict privacy, edit/delete controls, and zero facial recognition.

---

## 🚀 2. Live Demo & Key Capabilities

The project is running live locally at **[http://localhost:3001](http://localhost:3001)** (or `3000`).

| Feature | Implementation | Integrity Status |
| :--- | :--- | :--- |
| **Scene Capture** | Browser camera (`getUserMedia`) + File upload + POV simulator (`glasses_sdk`) | **Active (Web MVP)** |
| **AI Scene Grounding** | Meta Model API (`llama-3.2-11b-vision-instruct`) with Zod schema validation & fallback to zero-cost mock engine | **Active & Guarded** |
| **GPS Geolocation Stamping** | Real device GPS coordinates via `navigator.geolocation` stored with every observation | **Active (Real GPS)** |
| **Radius & Departure Simulator** | Haversine distance engine with 0–150m walking slider and 50m geofence trigger | **Active Simulator** |
| **Spoken Voice Reminders** | Web Speech API synthesis (`window.speechSynthesis`) with visual text fallback | **Active** |
| **People Memory** | Full manual note CRUD & natural-language search with user isolation (no face recognition, no bystander profiling) | **Active (Opt-in)** |
| **Credit & Spend Protection** | $75 budget ceiling, SHA-256 duplicate cache, emergency kill switch, usage ledger | **Active & Enforced** |

> **Integrity Disclosure:**
> In this Web MVP, hardware capture and background geofencing are simulated within the browser. The data models and server-side endpoints are designed so physical Meta smart glasses hardware can be connected directly without rewriting core memory logic.

---

## 🛠️ 3. Quickstart & Installation

### Prerequisites
* Node.js v18.17+ (v24.7.0 tested)
* npm v10+

### Setup & Run

```bash
# 1. Clone repository and navigate into project
cd Yaad

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Open [**http://localhost:3001**](http://localhost:3001) in your browser.

---

## 🧪 4. Automated Testing & Verification

Yaad includes comprehensive automated unit tests running with Node's native test runner (`node:test`):

```bash
# Run full unit test suite (21 / 21 tests passing)
npm test

# Run TypeScript typechecker (0 errors)
npx tsc --noEmit

# Run ESLint (0 warnings or errors)
npm run lint

# Run optimized production build
npm run build
```

### Test Coverage Highlights
* **Departure Transitions (`tests/departure-transitions.test.ts`):** Filters only unconfirmed items, excludes collected/resolved items, speech format validation.
* **Geofence Distance (`tests/geo-distance.test.ts`):** Haversine distance calculation and coordinate breach simulation.
* **Meta Model Adapter Schemas (`tests/meta-adapter-schemas.test.ts`):** Schema validation, empty field rejection, response parsing, and usage ledger queries.
* **People Memory (`tests/people-memory.test.ts`):** Manual creation, user confirmation enforcement, cross-user isolation, editing, deletion, and natural language search matching.
* **Edge Cases & QA (`tests/edge-cases-and-qa.test.ts`):** Valid file extensions, MIME checking, >10MB rejection, candidate confirmation/rejection isolation, truthful recall phrasing, and demo mode zero-cost verification.

---

## ⚙️ 5. Environment Configuration & Cost Controls

Copy `.env.example` to `.env.local` to configure:

```bash
cp .env.example .env.local
```

| Environment Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_MODE` | `demo` | Runs local mock provider with **zero billable calls** |
| `META_API_KEY` | *(empty)* | Server-only API key for Meta Model API |
| `META_MODEL_ID` | `llama-3.2-11b-vision-instruct` | Verified vision-capable Meta model |
| `META_MONTHLY_BUDGET_CAP_USD` | `75` | Hard limit protection (preserving $75 reserve from $150 allocation) |
| `META_REQUESTS_KILL_SWITCH` | `false` | Emergency kill switch to halt all live model calls immediately |

---

## 🕶️ 6. Virtual Simulator & Hardware Investigation (Phase 9)

### Capability & Hardware Matrix

| Capability | Physical Meta Ray-Ban | Official Virtual Simulator Status | Yaad Implementation Approach |
| :--- | :--- | :--- | :--- |
| **Eye-Level Still Capture** | On-device 12MP camera | No public third-party raw video Web API | Simulated POV capture via browser camera & `"glasses_sdk"` source adapter |
| **Voice Shortcut ("Hey Meta")** | Meta AI native voice triggers | Not publicly exposed to 3P web apps | One-click voice shortcut simulation in capture modal |
| **Open-Ear Audio Reminders** | Built-in directional speakers | Audio output routed via host OS | Web Speech API (`window.speechSynthesis`) with visual text fallback |
| **Background Geofencing** | Companion phone app (iOS/Android) | Browser security sandbox limits background geofencing | Interactive 0–150m walking distance slider with 50m threshold trigger |
| **Continuous Video Streaming** | Unsupported (battery/heat constraints) | Unsupported | Explicitly out of scope: single on-demand frames only |

---

## 🎬 7. Hackathon Demo Walkthrough (2 Minutes)

1. **The Problem & Assistive Mission:**
   * Explain how everyday forgetfulness impacts independence, especially for those with cognitive impairment or dementia.
2. **Map Belongings ("Hey Meta, map my belongings"):**
   * Click **"Remember belongings"**.
   * Click the top button: **"Simulate 'Hey Meta'"** or snap a photo.
   * Observe the captured GPS location: `📍 GPS Radius Origin: 37.7749° N, 122.4194° W`.
   * Review the AI suggestions: keys on the coffee table, wallet on the cafe bistro table. Confirm both.
3. **Dashboard State:**
   * Notice both items appear with green GPS coordinates, timestamps, and `"Tracked · Unconfirmed"` status chips.
4. **Simulate Walking Away (Radius Geofence):**
   * Click **"Demo: Simulate leaving"**.
   * Drag the distance slider from **0m** past the **50m radius** to **75m**.
   * Listen to the calm spoken voice announcement through your speakers:
     > *"Meta notice: You have stepped 75 meters away from your mapped belongings... Did you remember to pick them up?"*
5. **Resolution & Recall:**
   * Mark the keys collected, leaving the wallet unconfirmed.
   * Type in the search bar: *"Where did I last leave my wallet?"*.
   * View the grounded recall card with exact timestamp, cafe table description, and GPS coordinates.
6. **People Memory (Secondary):**
   * Switch to the **People** tab.
   * Search *"Where did I meet Priya?"* to see the grounded recall answer.
   * Click **Edit** to update conversation notes, or add a new person memory with confirmation.
7. **Developer Controls:**
   * Click the **"Demo Mode · Zero External Calls"** badge in the top right to open the Developer Drawer, showing the real-time spend ledger, SHA-256 cache hits, and budget reserve.

---

## 🔒 8. Privacy, Safety & Dignity

* **No Facial Recognition:** People Memory is strictly manual notes entered by the user. Yaad never profiles bystanders or identifies strangers from images.
* **Grounded Memory:** Observations are stamped as *"last recorded at [time]"*, never asserting absolute certainty that an item is still there.
* **Data Deletion:** Every memory, image reference, and person note can be deleted instantly by the user.
* **Local Storage / No Leaked Data:** In Demo Mode, zero data leaves the user's browser.

---

## 📄 License
MIT License. Built for the Meta AI Developer Hackathon.
