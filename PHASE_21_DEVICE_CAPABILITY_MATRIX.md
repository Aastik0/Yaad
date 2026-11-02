# Yaad: Device Capability & Hardware Feasibility Matrix

This matrix maps out Yaad's memory assistance capabilities across current and future target hardware platforms.

---

| Capability | Web Companion (Desktop / Mobile Browser) | Unity 6 Editor (macOS Desktop Testing) | Meta Quest 3 / Horizon OS (Standalone VR/MR) | Ray-Ban Meta Smart Glasses (Camera-Only Audio) |
| :--- | :--- | :--- | :--- | :--- |
| **Real Camera Feed** | **FULL** (`navigator.mediaDevices.getUserMedia`) | **FULL** (`UnityEngine.WebCamTexture` on Mac webcam) | **RESTRICTED** (Passthrough rendered at compositor level; raw pixels blocked by Meta privacy) | **PLANNED** (Via Meta Wearables Device Access Toolkit / DAT mobile companion SDK) |
| **Simulated Camera Input** | **SUPPORTED** (File upload & test frames) | **SUPPORTED** (Synthetic test frame fallback) | **SUPPORTED** (Spatial simulated viewfinder) | **N/A** (Physical capture only) |
| **Speech-to-Text (Voice Input)** | **FULL** (Web Speech API `SpeechRecognition`) | **PROTOTYPE** (Unity `Microphone` class or companion bridge) | **SUPPORTED** (Meta Voice SDK / Whisper) | **HARDWARE NATIVE** (Multi-mic array via Bluetooth handsfree profile) |
| **Voice Activation** | **PUSH-TO-TALK** (Always-listening blocked by browsers) | **PUSH-TO-TALK** (Keybind / Reticle click) | **PUSH-TO-TALK** (Controller trigger / micro-pinch) | **NATIVE WAKE-WORD** ("Hey Meta" processed on-chip DSP) |
| **Speech Synthesis (Voice Output)** | **FULL** (`window.speechSynthesis`) | **FULL** (Procedural audio chimes / TTS bridge) | **FULL** (Spatial audio rendering) | **NATIVE** (Open-ear directional speakers) |
| **Real GPS Coordinates** | **FULL** (`navigator.geolocation`) | **SIMULATED** (Desktop Wi-Fi geolocation / mock coordinates) | **COARSE** (Wi-Fi positioning only; no native GPS chip on Quest 3) | **RELAYED** (Provided by paired mobile phone's GPS) |
| **Foreground Departure Geofencing** | **FULL** (`watchPosition` while active tab) | **SIMULATED** (Radius math testable via script) | **LIMITED** (No native GPS chip; requires Wi-Fi SSID change detection) | **FULL** (Handled by iOS/Android companion app background services) |
| **Background Departure Geofencing** | **RESTRICTED** (Mobile browsers freeze timers when backgrounded) | **N/A** | **N/A** | **FULL** (Via native iOS `CoreLocation` / Android `GeofencingClient`) |
| **External Map Navigation** | **FULL** (Deep links to Google / Apple Maps) | **FULL** (`Application.OpenURL`) | **WEBVIEW ONLY** (Browser panel handoff) | **AUDIO NAVIGATION** (Spoken turn-by-turn prompts) |
| **Spatial 3D Overlay Guidance** | **N/A** (2D screen only) | **FULL** (3D floating UI panel in Simulator) | **FULL** (6DoF world-anchored directional arrows & landmarks) | **N/A** (Audio only; no display optical waveguide) |

