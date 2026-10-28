# Yaad — AI Memory Companion
> **Web-first AI memory assistant for belongings tracking and proactive departure reminders.**
> Built for the Meta AI Developer Hackathon.

---

## 1. Product Overview

Yaad is designed to solve a universal everyday friction: leaving essential belongings (keys, wallet, glasses, water bottles) behind.

* **Primary USP:** Belongings tracking, grounded visual memory, and proactive departure reminders.
* **Secondary Capability:** Opt-in People Memory for user-entered notes (strictly no facial recognition, no bystander profiling).
* **Architecture:** Web-first modular design. Running by default in **Demo Mode** with realistic local fixtures and **zero external billable calls**.

> **Note on Hardware & Sensors:**
> Real smart glasses and background geofencing are explicitly **not** claimed. The departure check is an honest, clearly labelled web simulator.

---

## 2. Tech Stack

* **Framework:** Next.js 14 (App Router) + TypeScript
* **Styling:** Tailwind CSS (Calm ivory surfaces, deep forest green actions, sage accents)
* **Icons:** Lucide React
* **Validation:** Zod
* **AI Engine:** Meta Model API adapter (server-only, disabled by default until configured and approved)

---

## 3. Getting Started

### Prerequisites
* Node.js v18.17+ (v20+ recommended)
* npm or pnpm

### Installation

```bash
# Clone and enter directory
cd Yaad

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 4. Verification & Testing

```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

---

## 5. Environment Configuration

Copy `.env.example` to `.env.local` to customize settings:

```bash
cp .env.example .env.local
```

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_MODE` | `demo` | Runs local mock provider with zero external API calls |
| `META_API_KEY` | *(empty)* | Server-only API key for Meta Model API |
| `META_MONTHLY_BUDGET_CAP_USD` | `75` | Hard limit protection for credit budget |
| `META_REQUESTS_KILL_SWITCH` | `false` | Emergency kill switch to halt all live model calls |

---

## 6. Hackathon Demo Script

1. **The Problem:** People frequently misplace belongings when shifting locations (café, office, library).
2. **Remember Belongings:** Click "Remember belongings", select a scene image, and request tracking for "keys and wallet".
3. **Grounded Review:** Review the AI-suggested candidate items with specific landmarks and confidence levels; confirm tracking.
4. **Item State:** Show items in the dashboard with "Tracked · Unconfirmed" status and "Last recorded at" wording.
5. **Simulated Departure:** Click "Demo: Simulate leaving". Notice Yaad calmly flags only the unconfirmed items.
6. **Resolution:** Confirm collection or mark left behind. Search "Where did I last see my wallet?" for grounded recall.
7. **People Memory (Secondary):** Show the opt-in manual notes tab for remembering context about people met, respecting privacy without facial recognition.

---

## 7. Known Limitations & Integrity Disclosures

* **Departure Simulator:** The departure check runs in-browser on user trigger. No background OS geofencing is implemented.
* **Camera Capture:** Uses standard browser `navigator.mediaDevices.getUserMedia` when supported.
* **Vision Model:** Live Meta Model API requests are guarded by a server-side adapter, strict request caps, and require developer credit approval.

