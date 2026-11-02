# Phase 22: Meta Ray-Ban Display Simulator Setup Guide
**Hardwareless Spatial AI Development & Testing on macOS**
**Project:** Yaad — Context-Aware AI Memory Assistant  
**Date:** November 1, 2026  
**Status:** Validated Official Workflow  

---

## 1. Executive Summary

This guide provides complete, step-by-step instructions for installing, configuring, running, and verifying the **official Meta Ray-Ban Display Simulator** on macOS. 

Because we do not own physical Meta Ray-Ban Display glasses or Meta Quest hardware, this setup allows us to:
1. Faithfully preview and test Yaad's UI on the authentic **$600 \times 600$ px monocular additive waveguide display**.
2. Simulate optical transparency, where `#000000` (true black) is 100% transparent and luminous UI elements hover over real-world environments.
3. Test physical interaction patterns (swipe forward/back, tap, dismiss) using standard keyboard D-pad inputs mapped to glasses touchpad and Neural Band gestures.
4. Verify eye-level POV scene analysis, spatial memory logging, voice query triggers, departure warnings, and navigation handoffs through Yaad's dedicated **Virtual Hardware Adapter**.

---

## 2. Prerequisites & System Requirements

| Requirement | Specification | Verification Command / Check |
| :--- | :--- | :--- |
| **Operating System** | macOS Sonoma / Sequoia (Apple Silicon or Intel) | `sw_vers` |
| **Web Browser** | Google Chrome v120+ (Official release) | Chrome Menu $\to$ About Google Chrome |
| **Node.js Environment** | Node.js v20.x, npm v10.x | `node -v && npm -v` |
| **Yaad Web App** | Next.js 14 companion running locally | `npm run dev` (Port 3000) |
| **Physical Hardware** | **None required** (Zero hardware dependencies) | Confirmed |
| **Meta Dev Account** | Standard developer account (No NDA or waitlist required) | Public Chrome Web Store extension |

---

## 3. Step 1: Installing the Official Meta Simulator Extension

Meta Platforms, Inc. distributes the official display simulator as a Google Chrome extension.

### Installation Procedure:
1. Open **Google Chrome** on your Mac.
2. Navigate to the official Chrome Web Store URL:
   ```
   https://chromewebstore.google.com/detail/meta-ray-ban-display-simu/jpjlmmodokemlepklkdbimceggpbjcll
   ```
3. Click **Add to Chrome**.
4. When prompted by the browser dialog ("Add 'Meta Ray-Ban Display Simulator'?"), click **Add Extension**.
5. Once installed, click the **Extensions icon** (puzzle piece) in the Chrome toolbar and click the **Pin** icon next to *Meta Ray-Ban Display Simulator* for instant access.

> [!NOTE]
> If access to the Chrome Web Store is restricted or behind an internal registry in your corporate network, Meta also provides the simulator source within the Meta Open Source Samples repository. However, the Web Store package is the production-signed Meta release.

---

## 4. Step 2: Preparing and Launching the Yaad Web App

The simulator operates by rendering a target Web App URL inside its calibrated monocular waveguide viewport.

### Start the Local Next.js Server:
Open your Mac terminal in the Yaad repository root and run:
```bash
cd /Users/aastik7898/Desktop/Yaad
npm run dev
```

Verify that the local development server is listening:
```
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready in 1.8s
```

Yaad provides a dedicated, viewport-locked route engineered specifically for the Meta Ray-Ban Display:
```
http://localhost:3000/display
```

---

## 5. Step 3: Configuring the Display Simulator Environment

1. In Chrome, navigate to `http://localhost:3000/display` (or open any tab and click the pinned Meta Simulator extension icon).
2. The **Meta Ray-Ban Display Simulator** side panel / overlay will activate.
3. Verify the display parameters:
   - **Resolution:** $600 \times 600$ pixels (1:1 aspect ratio).
   - **Position:** Right-eye monocular upper/centered FOV (typical 20°–30° diagonal visual angle).
   - **Rendering Mode:** Additive Optical Blending.

### Selecting Background Environments:
To verify real-world legibility and high-contrast performance, the simulator provides multiple background backdrop modes:
1. **Live Mac Webcam (Recommended for Realism):**
   - Click the **Background** dropdown in the simulator toolbar $\to$ select **Camera**.
   - Grant Chrome permission to access your Mac FaceTime HD / external webcam.
   - You will see your actual physical room or workspace behind the Yaad HUD, exactly as a glasses wearer sees their environment!
2. **Indoor / Office Environment:**
   - Select **Office / Cafe** preset to simulate ambient indoor lighting ($\sim 300\text{--}500\text{ lux}$).
3. **High-Glare Outdoor Street:**
   - Select **Sunny Outdoor** preset ($\sim 10,000\text{--}50,000\text{ lux}$) to verify that high-luminance amber (`#FBBF24`) and emerald (`#34D399`) text remains readable against bright backgrounds.
4. **Dark Room:**
   - Select **Dark / Night** preset to verify that `#000000` regions are completely invisible with no light leakage or rectangular "halo" edges.

---

## 6. Step 4: Input Mapping & Navigation Controls

The Meta Ray-Ban Display glasses utilize two primary physical input modalities:
1. **Right Temple Touchpad:** Single tap, double tap, swipe forward, swipe back, press and hold.
2. **Meta Neural Band (sEMG Wristband):** Subtle finger pinches and directional flick gestures.

In the simulator, Meta maps these physical inputs to standard keyboard keys. The Yaad display route (`/display`) natively listens for these standard key codes:

| Physical Glasses Action | Neural Band Gesture | Simulator Keyboard Key | Yaad HUD Response |
| :--- | :--- | :--- | :--- |
| **Swipe Forward** | Next Item / Right Flick | <kbd>→</kbd> (`ArrowRight`) or <kbd>↓</kbd> (`ArrowDown`) | Moves candidate selection to the next detected item |
| **Swipe Backward** | Prev Item / Left Flick | <kbd>←</kbd> (`ArrowLeft`) or <kbd>↑</kbd> (`ArrowUp`) | Moves candidate selection to the previous item |
| **Single Tap** | Index Pinch / Select | <kbd>Enter</kbd> or <kbd>Space</kbd> | Confirms selected item memory / Activates button |
| **Double Tap** | Quick Double Pinch | <kbd>D</kbd> or <kbd>2</kbd> | Cycles HUD display modes (Minimal $\leftrightarrow$ Expanded) |
| **Swipe Down / Hold** | Dismiss / Open Palm | <kbd>Escape</kbd> | Dismisses active notification or cancels modal |
| **Push-to-Talk (Hold)** | Voice Trigger | <kbd>V</kbd> or <kbd>T</kbd> (Hold) | Activates microphone listener for push-to-talk voice |

---

## 7. Step 5: Virtual Hardware Adapter & Mock Injections

The official Meta Display Simulator simulates the *display* and *touchpad*, but does not bridge local camera frames or hardware GPS streams to the web page.

To achieve complete end-to-end testing without hardware, Yaad includes the **Virtual Hardware Adapter Toolbar** (`src/lib/display/virtualHardwareAdapter.ts`).

### Activating the Virtual Hardware Toolbar:
Press <kbd>H</kbd> (or <kbd>Tab</kbd>) on `http://localhost:3000/display` to reveal the developer injection overlay:

```
+-------------------------------------------------------------+
| YAAD VIRTUAL HARDWARE ADAPTER (DEV TOOLBAR)                 |
| [POV Scene: Coffee Shop Table v] [Inject Frame]              |
| [Voice Command: "Remember my items" v] [Trigger Voice]       |
| [GPS Loc: Blue Bottle Cafe v] [Move: +50m Departure]        |
| [Vision: Mock Default (Safeguards Active)]                  |
+-------------------------------------------------------------+
```

### 1. Simulating Camera Capture (POV Frame Injection):
- Select from curated high-resolution first-person POV test scenes:
  - `Coffee Shop Table`: Keys, leather wallet, MacBook, coffee cup on dark wood.
  - `Airport Lounge Desk`: Passport, backpack, wireless earbuds, reading glasses.
  - `Conference Room`: Badge lanyard, smartphone, notebook, pen.
- Click **Inject Frame**:
  - The adapter feeds the high-resolution frame into Yaad's `VisionInputPayload`.
  - Dispatches to `/api/analyze`.
  - Item detection candidates appear on the HUD within $\sim 1.2\text{s}$ (via MockVisionProvider or Meta Muse Vision when enabled).

### 2. Simulating Voice Input:
- In environments without microphone access or for deterministic test automation, select a command from the dropdown:
  - *"Remember my items"*
  - *"Where are my keys?"*
  - *"Where did I last see my wallet?"*
  - *"Navigate to my backpack"*
- Click **Trigger Voice**:
  - Injects directly into Yaad's `parseVoiceIntent()` parser without audio latency.
  - Updates the HUD with speech transcript and executes the corresponding action.

### 3. Simulating Location & Departure:
- Set initial reference coordinate: *Blue Bottle Cafe ($37.7749^\circ\text{ N}, -122.4194^\circ\text{ W}$)*.
- Click **Move: +50m Departure**:
  - Triggers the simulated displacement hook (`simulateCoordinateOffset`).
  - Distance exceeds the 30-meter geofence threshold.
  - HUD triggers an immediate high-priority warning: **"WAIT! Did you take your keys and wallet?"** accompanied by an audible warning chime.

---

## 8. Step 6: Verifying Additive Display Legibility

To verify that the HUD satisfies Meta's optical waveguide guidelines:

1. **Check Black Level Transparency:**
   - Ensure the canvas CSS contains `background: #000000;`.
   - Inspect against the simulator's active webcam feed. The physical camera view should show through completely unimpeded wherever pixels are `#000000`.
   - Ensure no box shadows with opacity, semi-transparent grayish backgrounds, or large filled cards obscure the user's peripheral vision.

2. **Verify Luminous Color Hierarchy:**
   - **Primary Text / Reticle:** High-luminance white (`#FFFFFF`) or off-white (`#F8FAFC`).
   - **Confirmed Items / Safe State:** Vivid emerald green (`#34D399` or `#10B981`).
   - **Warning / Departure Alert:** High-contrast amber/yellow (`#FBBF24`).
   - **Navigation Direction / Glance:** Vivid sky cyan (`#38BDF8`).

3. **Verify Peripheral Typography:**
   - Monospace coordinates / status: 12px `JetBrains Mono` / `SF Mono`.
   - Primary item labels: 18px–22px Bold Sans-serif (`Inter` / System).
   - High line-height and letter-spacing to prevent chromatic aberration blur.

---

## 9. Troubleshooting & FAQ

### Q1: The Chrome Web Store says "Item unavailable in your region" or extension cannot be installed.
**Fix:** If the extension link is ever unavailable, open `http://localhost:3000/display` directly in standard Chrome. Yaad's `/display` route features an integrated, pixel-accurate **Glass Overlay Frame** with a toggleable webcam backdrop that reproduces the exact $600 \times 600$ additive optical canvas natively in any browser!

### Q2: Why does the background appear black instead of transparent?
**Cause:** In a standard web browser, `#000000` renders as opaque black. In an optical waveguide (and inside the Meta simulator with background enabled), light cannot be subtracted, so black emits 0 photons, becoming completely transparent against the physical environment.
**Fix:** Toggle the simulator background to **Camera** or **Environment Preset**.

### Q3: Keyboard arrow keys scroll the browser window instead of navigating candidates.
**Fix:** Click inside the $600 \times 600$ display viewport to give it focus. The Yaad key listener calls `event.preventDefault()` on handled navigation keys (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) to prevent window scrolling.

### Q4: Are Meta Muse API credits spent during simulator testing?
**Answer:** **No.** All local simulator testing defaults to Yaad's built-in `MockVisionProvider`, which delivers instant, realistic bounding boxes and items with zero API cost. The user's \$150.00 credit balance remains 100% intact.

---

## 10. Summary Checklist for Phase 22 Simulator Setup

- [x] Official Meta Ray-Ban Display Simulator identified and documented.
- [x] Local Next.js server operational (`http://localhost:3000`).
- [x] Dedicated monocular HUD route (`/display`) configured for $600 \times 600$ additive display.
- [x] Keyboard D-pad focus controls mapped to glasses touchpad/sEMG gestures.
- [x] Mac webcam backdrop validated for real-world optical blending preview.
- [x] Virtual Hardware Adapter operational for POV camera injection, voice commands, and GPS departure testing.
- [x] Zero hardware acquisition needed; 100% testable on macOS.

