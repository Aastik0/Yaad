# Phase 9: Meta Ray-Ban Virtual Simulator Investigation
> **Wearables Device Access Toolkit (DAT) & Meta Ray-Ban Display Simulation Analysis**  
> *Meta AI Developer Hackathon | Official Documentation & Architecture Review*

---

## 1. Official Documentation & Tooling Identification

Based on official documentation from the **Meta Wearables Developer Center** (`developers.facebook.com/wearables`), Meta provides simulation and developer tools across two distinct ecosystems for developers without physical hardware:

1. **Meta Wearables Device Access Toolkit (DAT SDK):**
   * **Component:** `MWDATMockDevice` (iOS / Android Mock Device Kit).
   * **Purpose:** Native testing framework for pairing, device lifecycle events (power, don, doff), and stream injection without physical smart glasses.
   * **Test Server Concept:** Allows spinning up a local test server (e.g. port `9000`) to pipe mock device events and camera captures into the companion application.
2. **Meta Ray-Ban Display Simulator (Chrome Extension):**
   * **Component:** Chrome Web Store Extension for Meta Ray-Ban Display Glasses.
   * **Viewport Specifications:** Fixed **600 × 600 pixel** square display surface rendered into the wearer's right eye field of view.
   * **Interaction Paradigm:** Head gaze / focus navigation, continuous swipe/pinch gestures, and directional D-pad controls.
3. **UI Toolkit for Meta Ray-Ban Display:**
   * **Framework:** React-based UI component library designed for the 600×600 micro-display layout constraints.

---

## 2. Official Capability Matrix

The following matrix documents the exact technical capabilities based on official documentation:

| Capability | Physical Meta Ray-Ban | Official Virtual Simulator Status | State | Yaad Implementation Approach |
| :--- | :--- | :--- | :--- | :--- |
| **Point-of-View (POV) Still Image Capture** | 12MP ultrawide camera sensor | Supported via Mock Device Kit injection & mock frame capture | **Supported** | Thin capture adapter passes 600×600 / HD POV frame with GPS coordinates to `/api/analyze` (`source: "glasses_sdk"`). |
| **Continuous Video Analysis** | Prohibited / restricted due to battery and thermal limits | Unsupported by official toolkits | **Unsupported** | Deliberate single-frame capture only upon user trigger ("Hey Meta, map my belongings"). |
| **Open-Ear Directional Audio Output** | Custom open-ear 2-microphone/speaker array | Routes via host OS audio output | **Supported** | Web Speech API (`window.speechSynthesis`) with calm cadence and visible fallback text. |
| **Display HUD Surface (600×600)** | Micro-display in Ray-Ban Display models | Rendered via Chrome Extension or 600×600 preview canvas | **Supported** | Dedicated 600×600 Heads-Up Display (HUD) simulator preview panel in Yaad. |
| **Device Lifecycle Events (Don/Doff)** | Capacitive wear sensor | Supported in `MWDATMockDevice` (`mockGlasses.don()`, `mockGlasses.doff()`) | **Supported** | Simulated don/doff state tracking in Yaad simulator panel. |
| **Background Geofencing from Pure Web Browser** | Dependent on companion smartphone OS (iOS CoreLocation / Android LocationServices) | Unsupported in pure standalone browser without native companion app | **Unsupported** | Transparent interactive radius slider (0–150m) modeling departure from mapped table origin. |
| **Voice Command ("Hey Meta")** | On-device Meta AI acoustic model | Not exposed as public third-party web speech hook | **Simulated** | One-tap voice shortcut simulator triggering capture without touching camera buttons. |

---

## 3. Architecture of the Thin Simulator Adapter

To maintain engineering integrity, the virtual simulator is implemented as a **thin capture-source adapter** (`src/lib/glassesSimulator.ts`):
* **Single Responsibility:** Transforms simulated glasses events (POV frame, don/doff state, voice trigger) into standard Yaad payloads.
* **Preserves Core Memory Pipeline:** Passes into the exact same `/api/analyze` server route, Zod schema validation, and storage layer without duplicate code.
* **Zero Credit Consumption:** Strictly runs against the local mock vision engine during testing, ensuring zero spend of hackathon credits.
* **Feature Flagged:** Controlled via `NEXT_PUBLIC_ENABLE_GLASSES_SIMULATOR`. If disabled or unavailable, Yaad works seamlessly via browser upload and camera.

---

## 4. Integrity Disclosures for Judges
* **No Physical Glasses Claimed:** Hardware integration is not claimed as physical glasses; all smart-glasses capabilities are explicitly labelled as a software simulation adhering to official Meta Ray-Ban design specs.
* **No Background Web Geofencing Claimed:** The browser environment sandbox cannot run persistent background location services; the 50m radius departure engine is an interactive simulation.

