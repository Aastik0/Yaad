# Yaad Spatial (Unity 6 + Meta XR Project Foundation)

**Target Ecosystem:** Meta Horizon OS / Meta Quest 3 & Meta VR Glasses Profile  
**Engine:** Unity 6000.0.85f1 LTS (Apple Silicon native)  
**XR Runtime:** OpenXR (v1.15.1+) & Meta XR Simulator (v81+)  
**Phase Status:** Phase 17: Spatial UX, Audio & Interaction Polish Complete  

---

## 1. Architecture Overview

Yaad Spatial is an isolated, lightweight spatial frontend designed to deliver hands-free memory recall in 3D space while sharing the exact same memory models, database schemas, and REST endpoints as Yaad Web.

```
apps/yaad-spatial/
├── .gitignore                         # Comprehensive Unity binary & cache exclusion
├── Packages/
│   └── manifest.json                  # Meta XR scoped registry & OpenXR packages
├── ProjectSettings/
│   └── ProjectVersion.txt             # Locked to Unity 6000.0.85f1 LTS
├── Assets/
│   ├── Scenes/
│   │   └── YaadSpatialHome.unity      # Primary spatial scene with [YaadSpatialApp]
│   └── Scripts/
│       ├── Models/
│       │   └── SpatialMemoryModels.cs # Domain models (Items, Candidates, Recall Results)
│       ├── Services/
│       │   ├── YaadApiClient.cs       # UnityWebRequest HTTP Client bridging Next.js REST API
│       │   └── SpatialAudioService.cs # Procedural audio synthesizer (hover, click, chime, alert)
│       ├── Tests/
│       │   └── YaadSpatialBackendTests.cs # C# test suite for DTOs, mappers, audio, and guards
│       ├── YaadSpatialPanel.cs        # Floating UI panel controller (Tabs, Gaze Follow, Lock)
│       ├── YaadSpatialSceneBuilder.cs # Procedural UI generator (guarantees out-of-the-box run)
│       ├── RememberPanelController.cs # Viewfinder POV simulation & candidate confirmation
│       ├── RecallPanelController.cs   # Grounded recall search & "last recorded" card
│       ├── RecentMemoriesCarousel.cs  # Spatial carousel of remembered belongings + detail modal
│       └── LookAndPinchInteraction.cs # Gaze reticle + pinch gesture simulation & key fallbacks
└── README.md                          # Setup, launch, and simulation guide
```

---

## 2. Spatial UX & Interaction Polish (Phase 17)

### A. Gaze Reticle & Visual Feedback
* **Smooth Scaling:** Reticle smoothly expands from resting scale (`1.0x`) to hover scale (`1.35x`) on gaze contact, and contracts to (`0.85x`) on pinch trigger.
* **Color Transitions:** Dynamic lerp from resting translucent white (`rgba(235, 242, 255, 0.55)`) to Yaad brand blue (`rgba(38, 191, 255, 0.95)`) on hover, and emerald (`rgba(25, 217, 128, 1.0)`) on pinch.
* **Button Hover Emphasis:** Hovered buttons smoothly scale up by 3.5% (`1.035x`) with high-contrast borders for spatial depth.

### B. Procedural Spatial Audio (`SpatialAudioService.cs`)
* **100% In-Memory Synthesis:** Generates lightweight PCM waveforms at runtime via `AudioClip.Create` — zero external asset downloads or copyright concerns.
* **Subtle Audio Cues:**
  - **Hover:** 45ms soft sine tick at 480Hz.
  - **Click / Pinch:** 60ms confirmation click at 720Hz.
  - **Success / Confirm:** 320ms gentle ascending triad (C5 -> E5 -> G5 chime).
  - **Discard:** 70ms quiet neutral tap at 310Hz.
  - **Tab Switch:** 75ms airy transition tone.
  - **Alert:** Restrained dual-pulse low-key alert.
* **Debounced & Non-Intrusive:** Hover sounds are debounced (min 80ms interval) and fire only once upon hover enter.
* **Master Audio Toggle:** Click the **`🔊 Audio: On`** button or press **`A`** to mute/unmute at any time.

### C. Ergonomics & Comfort
* **Deadzoned Head-Follow:** Panel maintains 1.35m viewing distance with a 0.06m / 3° deadzone, eliminating jitter from micro-head tremors.
* **World-Locking:** Press **`L`** or click **`👀 Floating Gaze`** to pin the panel in 3D world space.

---

## 3. Keyboard Fallbacks & Simulator Controls (macOS Apple Silicon)

| Action | Control / Shortcut | Description |
|---|---|---|
| **Look / Orient Gaze** | Mouse Move / Right Click Drag | Points center reticle at buttons in 3D space |
| **Simulated Pinch / Select** | `Spacebar` or `Left Mouse Click` | Triggers look-and-pinch click on hovered button |
| **Switch to Remember Tab** | Key `1` | Opens viewfinder and candidate detection view |
| **Switch to Recall Tab** | Key `2` | Opens grounded search and answer card |
| **Switch to Recent Memories** | Key `3` | Opens horizontal carousel of tracked items |
| **Trigger Glasses Capture** | Key `C` | Captures simulated 600x600 POV snapshot |
| **Pin / World-Lock Panel** | Key `L` | Toggles between floating follow and world-locked pin |
| **Toggle Cloud vs Demo Mode** | Key `M` | Toggles between Next.js REST API and Local Demo |
| **Toggle Audio Mute** | Key `A` | Toggles spatial audio chimes ON/OFF |
| **Dismiss Modal / Clear** | `Escape` | Closes memory detail view or clears recall search |

---

## 4. How to Open and Run in Unity 6 & Meta XR Simulator

1. **Start the Yaad Next.js Web Backend:**
   ```bash
   npm run dev
   ```
2. **Open Project in Unity Hub:**
   Open Unity Hub > select `/Users/aastik7898/Desktop/Yaad/apps/yaad-spatial`.
3. **Launch Meta XR Simulator:**
   In Unity Editor's top menu, select **Meta XR > Meta XR Simulator > Launch Simulator**.
   Choose **Meta VR Glasses** or **Meta Quest 3** device profile.
4. **Enter Play Mode:**
   Press **Play** in Unity. The scene will automatically synthesize procedural audio clips, wire the spatial canvas, and initialize gaze reticle tracking.

---

## 5. Technical Boundaries & Security Guarantees

* **Zero Leaked Secrets:** No Supabase service-role keys or Meta paid API keys in Unity code or assets.
* **RLS Ownership:** Every authenticated cloud query attaches the user's JWT bearer token (`auth.uid() = user_id`).
* **Zero Copyright / Asset Dependencies:** All audio waveforms are generated purely via mathematical synthesis in C#.
* **Web Regression Suite:** All 54 web tests, TypeScript compiler checks, ESLint, and Next.js production builds pass without errors.
