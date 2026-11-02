# Yaad Phase 21A: Real-World Capability & Integration Audit

**Date:** November 1, 2026  
**Auditor:** Antigravity AI Pair Programmer (DeepMind)  
**Project:** Yaad — Context-Aware Memory Assistant  
**Objective:** Comprehensive audit of physical hardware, browser APIs, platform limitations, and SDK capabilities to ground the real-world memory pipeline before implementation.

---

## 1. Executive Summary

Phase 21 marks the transition from purely simulated mock experiences to genuine physical device capabilities:
1. **Camera Capture:** The web companion already possesses a working `getUserMedia` browser capture pipeline; Unity spatial client can immediately access the host Mac's FaceTime HD / USB webcam via `UnityEngine.WebCamTexture`.
2. **Voice Interaction:** Web Speech API provides robust Text-to-Speech (TTS) and Speech-to-Text (STT) on modern browsers; **Push-to-Talk** is the only reliable, power-efficient, and permission-compliant pattern (continuous always-listening wake words are blocked or suspended by browsers).
3. **Real Location Capture:** Browser Geolocation API provides `latitude`, `longitude`, and `accuracy`. Database schemas (`GeoCoordinatesSchema` and Supabase JSONB) already support full accuracy metrics without schema migrations.
4. **Departure Detection:** Foreground movement monitoring via `navigator.geolocation.watchPosition` with configurable geofence radii (50m, 100m, 200m) is feasible immediately while the browser tab is active. Background monitoring is strictly limited by mobile operating systems and requires native companion service architecture.
5. **Navigation Feasibility:** External map handoff via universal Google Maps / Apple Maps deep links (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`) provides immediate real-world guidance to recorded coordinates, coupled with landmark-based textual instructions.

---

## 2. Area 1: Camera Capture Capability Audit

### Web Companion
* **Current State:** `src/components/CaptureModal.tsx` implements live camera streaming via `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` and canvas frame capture (`canvas.toDataURL("image/jpeg", 0.9)`), as well as file upload.
* **Testability:** 100% testable and operational in modern desktop and mobile browsers (Chrome, Safari, Edge, Firefox).
* **Limitations:** Requires HTTPS or `localhost` origin; requires user permission click.

### Unity Spatial Application (`apps/yaad-spatial/`)
* **Current State:** `RememberPanelController.cs` uses a static synthetic 1x1 base64 string to simulate camera input.
* **macOS Editor Capability:** Unity's built-in `UnityEngine.WebCamTexture` can directly query `WebCamTexture.devices` and stream video from the Mac's built-in FaceTime HD Camera or external USB camera inside Unity Editor Play Mode.
* **Meta XR Simulator:** The desktop Meta XR Simulator emulates head/hand tracking, synthetic rooms, and input, but **does not stream real physical camera feeds**.
* **Meta Quest 3 Passthrough:** Standard developers **cannot access raw RGB camera pixels** from Meta Quest passthrough due to Meta privacy boundaries (passthrough is composited at the OS compositor level via OpenXR `XR_FB_passthrough`).
* **Ray-Ban Meta Smart Glasses:** Ray-Ban Meta glasses are camera-only smart glasses without a screen. They do not run Unity or OpenXR. They interface via the **Meta Wearables Device Access Toolkit (DAT)** over Bluetooth/Wi-Fi to an iOS or Android host app.
* **Immediate Recommendation:** Implement `UnityEngine.WebCamTexture` in `RememberPanelController.cs` for macOS desktop testing, while preserving the synthetic frame fallback when running headless or when no webcam is present.

---

## 3. Area 2: Voice Interaction Audit

### Web Speech API Status
* **Speech Synthesis (TTS):** Implemented in `src/lib/speech.ts` using `window.speechSynthesis` and `SpeechSynthesisUtterance`. Tested and verified working.
* **Speech Recognition (STT):** Can be implemented via `window.SpeechRecognition || window.webkitSpeechRecognition`.
* **Push-to-Talk vs Always-Listening Wake Word:**
  > [!WARNING]
  > **Platform Constraint on Always-Listening Wake Words:**
  > Modern browsers (Chrome, Safari, Firefox) aggressively restrict background microphone access. Continuous listening without user interaction causes heavy battery drain, high CPU utilization, and automatic browser suspension.
  > On Meta Ray-Ban glasses, voice triggers ("Hey Meta") are handled natively by Meta's on-device DSP firmware, not accessible to web apps.
* **Immediate Recommendation:** Implement **Push-to-Talk** (Hold or Click to Speak).
  * Microphone permission requested only on first interaction.
  * Deterministic regex and token-based intent parser:
    1. `"Remember my items"` $\to$ Trigger Camera Capture Modal.
    2. `"Where are my [item]?"` / `"Where did I last see my [item]?"` $\to$ Trigger Grounded Recall query.
    3. `"Take me to my [item]"` $\to$ Trigger Navigation Handoff.
  * Instant visual transcript and calm spoken response via `speechSynthesis`.

---

## 4. Area 3: Real Location Capture Audit

### Coordinate Storage & Accuracy
* **Current Schema:** `GeoCoordinatesSchema` in `src/lib/schemas.ts` and `types/index.ts` defines:
  ```typescript
  export interface GeoLocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number; // meters radius of 95% confidence
    place_name?: string;
  }
  ```
* **Database Compatibility:** Supabase tables `items` and `observations` store coordinates as `JSONB`, which accommodates `accuracy` and `timestamp` without database migrations.
* **Indoor GPS Reality:** Indoor GPS accuracy typically degrades to $\pm 15\text{m} - 50\text{m}$ or fails entirely. The system must never claim indoor pinpoint accuracy; coordinates provide building/neighborhood orientation, while **landmarks** provide localized room-level grounding.

---

## 5. Area 4: Departure Detection Feasibility Audit

### Browser & Platform Execution Boundaries
* **Active Browser Tab (Foreground):** Fully supported via `navigator.geolocation.watchPosition(success, error, { enableHighAccuracy: true, maximumAge: 5000 })`. Calculates Haversine distance from item origin in real time.
* **Background Execution Limitations:**
  * Desktop browsers throttle background tabs to 1 timer check per minute.
  * Mobile iOS Safari and Android Chrome completely freeze or terminate geolocation timers when the browser is minimized or the screen is locked.
  * True background geofencing requires a native iOS (`CoreLocation.CLCircularGeofenceRegion`) or Android (`GeofencingClient`) background service.
* **Immediate Recommendation:**
  * Implement a robust **Foreground Movement Monitor** in the web companion.
  * Configurable radius slider: 50m (Home/Cafe), 100m (Office/Campus), 200m (Transit Hub).
  * Web Notification API (`Notification.requestPermission()`) for audio/visual alerts when exiting the boundary.
  * Idempotency safeguard: notify once per departure event; avoid repeated spam.
  * Explicit UI toggle to start and stop monitoring.

---

## 6. Area 5: Navigation Feasibility Audit

### External Map Handoff Design
* When a user asks *"Take me to my wallet"*:
  1. Retrieve last confirmed observation coordinates.
  2. If coordinates are present:
     * **Universal Google Maps URL:** `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
     * **Apple Maps URL (iOS/macOS):** `https://maps.apple.com/?daddr=${lat},${lng}`
  3. Accompany the link with grounded context:
     * *"Last seen at Oak Desk near MacBook (Recorded 10:15 AM · Accuracy: $\pm 12\text{m}$). External maps will guide you to the location."*
  4. If coordinates are missing or GPS was denied:
     * Display textual landmark instructions only.
     * State clearly: *"GPS coordinates were not recorded for this observation. Use the recorded landmarks above to find your item."*
     * Never hallucinate or substitute random coordinates.

---

## 7. Recommended Implementation Order

To maintain stability and verify each capability incrementally, we propose the following phased implementation sequence:

1. **Phase 21B — Real Camera Capture:**
   * Web: Integrate live camera snap directly into the Remember flow with clear permission explanation.
   * Unity: Implement `WebCamTexture` for macOS desktop camera capture with synthetic fallback.
2. **Phase 21C — Voice-Driven Memory Prototype:**
   * Web: Add Push-to-Talk microphone button with `webkitSpeechRecognition` / `SpeechRecognition`.
   * Intent parser routing "Remember", "Where is my [item]", and "Take me to [item]".
   * Visual transcript feedback and calm spoken TTS reply.
3. **Phase 21D — Real Location & Departure Detection:**
   * Web: Foreground movement monitor using `watchPosition`.
   * Configurable radius selector (50m, 100m, 200m).
   * Web Notification API alerts with debouncing.
4. **Phase 21E — Navigation Handoff Prototype:**
   * Web: "Take me to my item" action generating external Google/Apple Maps deep links.
   * Landmark fallback when indoor GPS is unavailable.
5. **Phase 21F — Full Regression & Verification:**
   * Automated tests, TypeScript check, Next.js build, Unity compilation, and documentation.

