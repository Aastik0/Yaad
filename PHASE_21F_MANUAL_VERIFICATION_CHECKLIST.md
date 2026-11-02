# Yaad Phase 21F: Manual Verification Checklist (15–20 Minutes)

**Target Environment:** MacBook (Google Chrome / Apple Safari)  
**Prerequisites:** Node.js 20+, terminal access, built-in FaceTime HD camera / USB webcam, built-in microphone.

---

## Quick-Start Commands

```bash
cd /Users/aastik7898/Desktop/Yaad
npm run dev
# Open http://localhost:3000 in Google Chrome or Apple Safari
```

---

## 1. Camera & Viewfinder Test (3 mins)

* [ ] Click **"Remember belongings"** in the top navigation or hero CTA.
* [ ] Switch to the **"Live Camera"** tab in the capture modal.
* [ ] Review the privacy banner: *"Single photo snapshot only. No background video or audio is ever streamed or stored."*
* [ ] Click **"Start Camera"** and allow browser permissions.
* [ ] **Verify:** The live video feed appears with the green **"LIVE FEED"** badge and optical crosshair reticle.
* [ ] Point your camera at belongings on your desk (keys, wallet, water bottle).
* [ ] Click **"Capture Photo"**.
* [ ] **Verify:** The stream stops, your hardware camera indicator light turns off, and the captured image frame appears in the preview.
* [ ] Click **"Retake"**: Confirm the camera re-initializes smoothly.
* [ ] Capture again and proceed to AI Analysis.

---

## 2. AI Identification vs Mock Inspection (2 mins)

* [ ] In the capture preview, click **"Analyze Scene"**.
* [ ] **Verify:** An analyzing spinner appears with *"Grounded scene analysis..."*.
* [ ] **Verify:** Candidate cards appear (e.g., Keys, Wallet, Water Bottle) with confidence scores, category tags, and bounding box landmarks.
* [ ] Check developer console or terminal: confirm zero external requests to Meta paid endpoints ($0.00 spend).
* [ ] Notice the source badge: `Source: Offline Grounded Mock` (default safe mode).

---

## 3. Candidate Confirmation & Persistence (2 mins)

* [ ] Select one or more candidate items by checking their checkboxes.
* [ ] Click **"Confirm & Track Selected"**.
* [ ] **Verify:** The modal closes and the newly confirmed item appears immediately at the top of the **Tracked Belongings** list.
* [ ] Notice the status badge: `Tracked (Unconfirmed)`.
* [ ] Refresh the page (`Cmd + R`):
* [ ] **Verify:** The confirmed item persists cleanly across page reloads (stored in LocalStorage in Demo Mode).

---

## 4. Voice Push-to-Talk & Intent Recognition (3 mins)

* [ ] Scroll down to the **Voice Memory Assistant** card below the hero section.
* [ ] Click the green **Microphone** button and allow microphone access.
* [ ] **Verify:** The button pulses with an amber ring, displays **"MIC ACTIVE"**, and shows *"Listening to voice..."*.
* [ ] Speak clearly: *"Where are my keys?"*
* [ ] **Verify:** The live transcription box displays your words in real time.
* [ ] Stop speaking:
* [ ] **Verify:** A blue badge appears: **"RECALL: KEYS"**.
* [ ] **Verify:** The search query automatically updates to "keys".
* [ ] **Verify:** The grounded `RecallAnswerCard` appears displaying the recorded location.
* [ ] **Verify:** The assistant speaks the calm reminder: *"Your Apartment Keys was last recorded at..."*.

---

## 5. Voice Audio Mute Toggle Test (1 min)

* [ ] In the Voice Memory Assistant card, click **"Spoken audio on"**.
* [ ] **Verify:** It toggles to **"Muted"** with the `VolumeX` icon.
* [ ] Click the quick prompt: `“Where are my keys?”`.
* [ ] **Verify:** The recall card appears visually on screen, but **zero audio is played**.
* [ ] Click **"Muted"** again to restore spoken responses.

---

## 6. Foreground GPS Geofence & Departure Alert (3 mins)

* [ ] Locate the **Foreground Departure Geofence** card.
* [ ] Click **"Start GPS Monitoring"** and accept browser location permissions.
* [ ] **Verify:** The status badge turns green: **"ACTIVE (±Xm)"** showing live GPS uncertainty.
* [ ] Click the settings icon (`Sliders`): observe the 50m radius and 2-reading jitter buffer.
* [ ] **Test Geofence Breach:**
  * [ ] Click **"+20m"** in the displacement simulator: verify **no departure alert fires** (within 50m).
  * [ ] Click **"+60m (Breach Geofence)"**: reading 1 registers outside boundary (jitter filter holds alert).
  * [ ] Click **"+60m (Breach Geofence)"** again (2nd consecutive reading).
  * [ ] **Verify:** The amber **Departure Alert Triggered** card appears: *"Your [item] may still be at [location]"*.
  * [ ] **Verify:** The assistant speaks the calm warning.
* [ ] Click **"I have my [item]"**:
  * [ ] **Verify:** The alert dismisses and the item status transitions to `collected`.
* [ ] Click **"Stop GPS"**: verify status returns to `Inactive`.

---

## 7. Grounded Navigation Handoff Test (2 mins)

* [ ] In the Voice Assistant, click the prompt: `“Take me to my wallet”` (or speak *"Take me to my wallet"*).
* [ ] **Verify:** The purple badge appears: **"NAVIGATE: WALLET"**.
* [ ] **Verify:** The **Grounded Navigation Handoff Card** opens with the green badge **"GPS RECORDED"**.
* [ ] **Verify:** Destination coordinates are displayed: `37.7749, -122.4194 (±8m)` at `Mission District Artisan Cafe`.
* [ ] Click **"Google Maps"**:
  * [ ] **Verify:** A new tab opens to Google Maps walking directions to `37.7749,-122.4194`.
* [ ] Click **"Apple Maps"**:
  * [ ] **Verify:** Apple Maps opens directions to the destination.
* [ ] Review the truthful disclaimer: *"Notice: Navigation directs you to where your item was last observed. Yaad cannot guarantee the item has not been moved."*
* [ ] Click **"I found my Brown Leather Cardholder Wallet"**: confirm the card closes.

---

## 8. Indoor Landmark Fallback & Failure Handling (2 mins)

* [ ] Click on the **"Prescription Reading Glasses"** card to open its detail modal.
* [ ] **Verify:** Notice the visual landmarks listed: `hall console table`, `ceramic key dish`, `mail stack`.
* [ ] Notice the truthful indoor disclaimer: *"Indoor Landmark Fallback: GPS coordinates were not recorded for this indoor sighting."*
* [ ] In the Voice Assistant, speak an unrecorded item: *"Take me to my umbrella"*.
* [ ] **Verify:** The neutral **Navigation Sighting Not Found** card appears:
  * *"No historical sighting recorded for 'umbrella'"*.
  * *"Cannot provide navigation directions. Yaad records historical sightings only."*
  * Zero hallucinated routes or broken map links.

---

## 9. Authentication & Cloud Isolation Test (Optional, 2 mins)

* [ ] Click **"Sign In / Cloud Mode"** in the top header.
* [ ] Observe the login dialog.
* [ ] Sign in with test credentials (or cancel to remain in offline Demo Mode).
* [ ] Notice the banner when authenticated: *"Cloud Persistence Active: Connected to private Supabase tenant"*.
* [ ] Click **"Import Demo Items"** to transfer demo records to your cloud database.

