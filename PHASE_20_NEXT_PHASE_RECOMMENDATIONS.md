# Yaad Phase 20: Next Phase Recommendations & Roadmap

With Phase 20 complete, Yaad's web application, Supabase persistence layer, vision provider abstraction, and Unity spatial client are fully stabilized, tested, and aligned.

---

## 1. Status Summary Ahead of Phase 21

* **Core Functionality:** Belongings capture, explicit confirmation, grounded recall, recent memories carousel, and spatial audio are verified working in both code and Meta XR Simulator Play Mode.
* **Security & Auth:** JWT server-side verification, tenant isolation, and RLS policies are completely verified.
* **Budget & Credits:** \$0.00 spent. All \$150 in Meta API credits are intact, with a hard \$75 cap strictly enforced in code.
* **Compilation & Tests:**
  * Web backend: **74/74 passing tests** (`npm test`).
  * TypeScript & Lint: **0 errors** (`npx tsc --noEmit`, `npm run lint`).
  * Next.js build: **Clean production build** (`npm run build`).
  * Unity C# Assemblies: **0 errors, 0 warnings** (`Assembly-CSharp.dll`, `Assembly-CSharp-Editor.dll`).

---

## 2. Recommended Phase 21: Hardware Deployment & Live Vision Pilot

We recommend splitting the next phase into two controlled tracks:

### Track A: Meta Horizon OS / Quest Standalone Package (Physical XR Build)
1. **Android Build Target Configuration:**
   * Switch Unity build platform to Android / Meta Quest in Unity Build Settings.
   * Configure Minimum API level 32, Target API level 34, ARM64 architecture, and IL2CPP scripting backend.
2. **Meta XR Interaction SDK Gestures:**
   * Add direct micro-pinch and hand tracking ray interactors for controllers and bare hands on Meta Quest 3 and upcoming Meta smart glasses.
3. **APK Generation & Sidequest / ADB Deployment:**
   * Generate signed standalone APK: `apps/yaad-spatial/Builds/YaadSpatial.apk`.
   * Verify on physical Quest 3 headset via `adb install`.

### Track B: Opt-In Live Meta Muse API Pilot (Controlled $5 Budget Window)
1. **Pilot Objective:**
   * Perform the first live visual grounding inference call using `muse-spark-1.3` against a real captured image.
2. **Safe Pilot Protocol:**
   * Set temporary test spend limit: `META_MAX_SPEND_USD=5` (preserving $145 of the $150 credit pool).
   * Set `ENABLE_LIVE_META_API=true` and `META_REQUESTS_KILL_SWITCH=false` in `.env.local`.
   * Run 1 single live capture in Cloud Mode.
   * Verify that the live response returns valid JSON, populates `usage_ledger.json`, reconciles actual token usage, and produces grounded item candidates.
   * Immediately re-engage `META_REQUESTS_KILL_SWITCH=true` upon pilot completion.

---

## 3. Required User Actions for Phase 21

To proceed to Phase 21, the user will only need to:
1. Provide authorization to proceed to Phase 21.
2. Decide whether to pursue **Track A** (Standalone Android/Quest APK build) or **Track B** (Live Meta Muse pilot with a $5 safety cap).

