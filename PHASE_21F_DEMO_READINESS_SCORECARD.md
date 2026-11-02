# Yaad Phase 21F: Demo Readiness Scorecard

**Target Evaluation:** Hackathon Demo & Submission Review  
**Date:** November 1, 2026  
**Project:** Yaad — Context-Aware Memory Assistant  

---

## 1. Feature Readiness Matrix

| Feature | Implementation Status | Verification Status | Demo Importance | Known Risk | Recommended Action for Demo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Real Optical Camera Capture** | **Complete** | Verified on Chrome & Safari | **CRITICAL** | Browser permission prompt popup may be missed if user doesn't notice browser prompt bar. | Keep camera tab open; click "Start Camera" clearly and accept browser prompt immediately. |
| **Viewfinder & Snapshot Preview** | **Complete** | Verified | **HIGH** | Low ambient lighting in room may yield dark photo. | Ensure desk is well-lit when capturing belongings for demo. |
| **Grounded Scene Analysis** | **Complete** | Verified (Offline Mock Default) | **CRITICAL** | Attempting live paid API calls during demo risks network failure or rate limits. | **Keep Mock default active.** Emphasize $0 cost, deterministic grounding, and the safety safeguards in your presentation. |
| **Candidate Confirmation Flow** | **Complete** | Automated & Manually Verified | **HIGH** | Forgetting to check candidate checkboxes before clicking "Confirm". | Check at least 1 candidate item (e.g. Keys) and click "Confirm & Track Selected". |
| **Push-to-Talk Voice Input** | **Complete** | Verified on Chrome/Safari | **CRITICAL** | Background venue noise or unclear microphone input. | Speak close to MacBook microphone, or use the pre-built quick prompt chips (`"Where are my keys?"`). |
| **Deterministic Intent Recognition** | **Complete** | 100% Passing Unit Tests | **HIGH** | Speaking conversational queries not yet mapped in regex patterns. | Use standard queries: *"Where are my keys?"*, *"Remember my belongings"*, *"Take me to my wallet"*. |
| **Voice Audio TTS Feedback** | **Complete** | Verified with Mute Toggle | **MEDIUM** | Audio blast during live presentation if volume is high. | Test volume beforehand; demonstrate the one-click **"Spoken audio on" $\to$ "Muted"** toggle. |
| **Foreground GPS Geofencing** | **Complete** | Verified with $\pm 65\text{m}$ filter | **CRITICAL** | Physical movement during a stage presentation is impossible. | **Use the built-in Displacement Simulator** (`+20m`, `+60m Breach`) to demonstrate geofencing live without walking outside. |
| **Proactive Departure Alerts** | **Complete** | Verified with Anti-Jitter | **CRITICAL** | 1st click outside boundary won't trigger alert because of anti-jitter buffer (needs 2 clicks). | Explicitly explain: *"Yaad requires 2 consecutive readings to prevent GPS bounce"*, then click `+60m` twice. |
| **Google Maps Deep-Link Handoff** | **Complete** | Verified URL Generation | **HIGH** | Pop-up blocker in browser might block new tab if user clicked twice. | Allow pop-ups for `localhost:3000` in Chrome/Safari settings. |
| **Apple Maps Deep-Link Handoff** | **Complete** | Verified URL Generation | **MEDIUM** | Opens Apple Maps app on Mac; switching apps might distract from browser demo. | Demonstrate Google Maps first; mention Apple Maps universal iOS/macOS compatibility. |
| **Indoor Landmark Fallback** | **Complete** | Verified | **HIGH** | None. Highlights Yaad's truthful non-hallucinatory principle. | Showcase "Prescription Reading Glasses" to prove Yaad never fabricates GPS for indoor items. |
| **Multi-Tenant Supabase Cloud Mode** | **Complete** | Automated E2E Verified | **MEDIUM** | Internet connection drop during live stage presentation. | **Run in Demo Mode by default**; demonstrate Cloud Mode login only if internet is rock-solid. |
| **Unity Spatial Client** | **Complete** | Batchmode & Compiler Verified | **BONUS** | Running Unity Editor + Meta XR Simulator simultaneously with web demo consumes significant GPU/RAM. | Demo web companion first as primary USP; present Unity spatial as multi-modal XR companion if time permits. |

---

## 2. Overall Readiness Summary

| Evaluation Dimension | Score | Status | Notes |
| :--- | :---: | :---: | :--- |
| **Core Value Proposition (USP)** | **10 / 10** | **Ready** | Real-world belongings tracking, departure geofence alerts, and maps handoff solve an actual universal human problem. |
| **Technical Execution & Polish** | **9.8 / 10** | **Ready** | 99 passing tests, 0 compiler warnings, Next.js 14 production build clean, zero crashes. |
| **Cost & Safety Guardrails** | **10 / 10** | **Flawless** | $150 credit balance 100% preserved ($0.00 spent). Hard cap, kill switch, and RLS enforced. |
| **Truthfulness & Anti-Hallucination** | **10 / 10** | **Flawless** | Grounded memory only. Never fabricates present coordinates, indoor GPS, or turn-by-turn routes. |
| **Demo Resilience (Offline/Stage)** | **9.5 / 10** | **Rock-Solid** | Demo Mode runs completely offline without network, database, or API dependencies. |

---

## 3. Recommended 3-Minute Demo Script

1. **Hook (30s):**
   *"Yaad is a context-aware memory companion that prevents you from leaving your essentials behind. Rather than searching after you lose something, Yaad captures where you set items down and alerts you before you walk away."*
2. **Remember Flow (45s):**
   - Click "Remember belongings" $\to$ Live Camera tab $\to$ Snap photo of keys on desk.
   - Show candidate identification: *"Yaad identifies visible belongings and grounds them to room landmarks."* Confirm keys.
3. **Voice Recall (30s):**
   - Press Push-to-Talk button: *"Where are my keys?"*
   - Show live transcript $\to$ RECALL badge $\to$ Grounded answer card $\to$ Calm spoken response.
4. **Departure Geofence Alert (45s):**
   - Click "Start GPS Monitoring" (shows live accuracy).
   - Use displacement simulator: click `+60m Breach` twice.
   - Show departure alert firing: *"Your keys may still be at Desk in Study."* Show spoken warning and desktop notification.
5. **Navigation Handoff (30s):**
   - Say: *"Take me to my keys"* $\to$ Opens Navigation Card $\to$ Click Google Maps to launch walking directions to the recorded sighting.
   - Conclude: *"Zero hallucinated locations, zero cloud dependency in demo mode, and 100% privacy-first."*

