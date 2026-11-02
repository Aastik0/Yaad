# Yaad Phase 20: Verified Fixes & Applied Changes

This document enumerates every change made during Phase 20 across the Yaad repository.

---

## 1. Scene & Component References

### File: `apps/yaad-spatial/Assets/Scenes/YaadSpatialHome.unity`
* **Issue:** Component `fileID: 302` on `[YaadSpatialApp]` pointed to a placeholder GUID (`c088924b123456789abcdef012345678`), causing Unity to report *"The referenced script (Unknown) on this Behaviour is missing!"*.
* **Fix:** Linked the exact GUID from `YaadSpatialSceneBuilder.cs.meta` (`2e08ea6c812b7448c933500055df2ab1`).
* **Result:** `[YaadSpatialApp]` in the Inspector correctly displays `Yaad Spatial Scene Builder (Script)` with 0 missing script warnings.

---

## 2. Unity 6 API Upgrades & Deprecation Remediation

### File: `apps/yaad-spatial/Assets/Scripts/YaadSpatialSceneBuilder.cs`
* **Issue:** Called deprecated `FindObjectOfType<T>()` in lines 38, 47, 56, 65, and 89, triggering `CS0618` compiler warnings.
* **Fix:** Upgraded all calls to `FindFirstObjectByType<T>()`.
* **Result:** Zero CS0618 compiler warnings in Assembly-CSharp.

### File: `apps/yaad-spatial/Assets/Scripts/Editor/RuntimePlayModeVerifier.cs`
* **Issue:** Called deprecated `FindObjectOfType<T>()` in lines 62, 88, 116, 149, 167, 187, 208, 228.
* **Fix:** Upgraded all occurrences to `FindFirstObjectByType<T>()`.
* **Result:** Zero CS0618 compiler warnings in Assembly-CSharp-Editor.
* **Feature Addition:** Added `[MenuItem("Yaad/Reload Scene (Apply Fix)", false, 1)]` to enable instantaneous scene reloading from disk in running Unity Editor instances.

---

## 3. Unity Event Cleanup & Memory Leak Safeguards

### File: `apps/yaad-spatial/Assets/Scripts/Services/YaadApiClient.cs`
* **Issue:** Duplicate check `if (Instance != null && Instance != null && Instance != this)` in `Awake()`; missing `OnDestroy()` cleanup.
* **Fix:** Cleaned condition and added `OnDestroy()` resetting `Instance = null` when destroyed.

### File: `apps/yaad-spatial/Assets/Scripts/Services/SpatialAudioService.cs`
* **Issue:** Missing `OnDestroy()` reset for static singleton instance.
* **Fix:** Added `OnDestroy()` resetting `Instance = null`.

### File: `apps/yaad-spatial/Assets/Scripts/RememberPanelController.cs`
* **Issue:** Button listeners on `captureButton`, `confirmButton`, `discardButton` were not removed when the panel was destroyed.
* **Fix:** Added `OnDestroy()` invoking `.onClick.RemoveListener(...)` on all 3 buttons.

### File: `apps/yaad-spatial/Assets/Scripts/RecallPanelController.cs`
* **Issue:** Button listeners on query and clear buttons were not cleared on destruction.
* **Fix:** Added `OnDestroy()` invoking `.onClick.RemoveAllListeners()` on all query buttons.

### File: `apps/yaad-spatial/Assets/Scripts/RecentMemoriesCarousel.cs`
* **Issue:** Button listeners on pagination and detail modal close were not removed on destruction.
* **Fix:** Added `OnDestroy()` with `.onClick.RemoveListener(...)` for all carousel buttons.

### File: `apps/yaad-spatial/Assets/Scripts/YaadSpatialPanel.cs`
* **Issue:** Event delegate `rememberController.OnItemConfirmed += OnItemConfirmedFromRemember` and UI button listeners were never unsubscribed on destruction.
* **Fix:** Added `OnDestroy()` unregistering the delegate and removing button click listeners.

---

## 4. End-to-End Automated Security & Multi-Tenant Test Suite

### File: `tests/phase20-e2e-security.test.ts`
* **Feature:** Created dedicated integration test suite covering:
  1. Multi-tenant isolation (User A vs User B data boundaries in Supabase).
  2. Malicious user ID spoofing override by verified JWT.
  3. Offline isolation of `LocalStorageRepository`.
  4. 401 Unauthorized rejection on `/api/items` and `/api/items/confirm`.
  5. Recall query length boundaries (256 chars max) and truthful phrasing.
  6. Vision provider 5-gate security checklist and $75 budget limit enforcement.
  7. Exact contract parity between Unity C# DTOs and Next.js Zod schemas.

