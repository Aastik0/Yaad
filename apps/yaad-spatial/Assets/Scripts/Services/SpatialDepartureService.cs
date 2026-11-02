using System;
using System.Collections.Generic;
using UnityEngine;
using Yaad.Spatial.Models;

namespace Yaad.Spatial.Services
{
    /// <summary>
    /// SpatialDepartureService
    /// Proactive spatial departure intelligence service for Yaad Spatial.
    /// Evaluates genuine tracked belongings and triggers calm, dementia-friendly departure reminders
    /// before a user exits a room or home geofence without their essential belongings.
    /// Enforces deduplication, cooldown periods, and truthful grounding.
    /// </summary>
    public class SpatialDepartureService : MonoBehaviour
    {
        public static SpatialDepartureService Instance { get; private set; }

        [Header("Departure Settings")]
        [SerializeField] private float alertCooldownSeconds = 45f;
        [SerializeField] private DepartureBoundaryType activeBoundaryType = DepartureBoundaryType.RoomLevel;

        private List<SpatialTrackedItem> trackedItems = new List<SpatialTrackedItem>();
        private DepartureEventState currentState = DepartureEventState.Inside;
        private SpatialDepartureReminder activeReminder = null;
        private Dictionary<string, long> itemCooldownTimestamps = new Dictionary<string, long>();

        public event Action<SpatialDepartureReminder> OnDepartureAlertTriggered;
        public event Action<DepartureEventState> OnDepartureStateChanged;
        public event Action OnReminderDismissed;
        public event Action OnReturnedInside;

        public DepartureEventState CurrentState => currentState;
        public SpatialDepartureReminder ActiveReminder => activeReminder;
        public SpatialDepartureReminder CurrentReminder => activeReminder;
        public bool IsReminderActive => activeReminder != null && currentState == DepartureEventState.CrossedBoundary;
        public bool HasActiveReminder => activeReminder != null;
        public List<SpatialTrackedItem> TrackedItems => trackedItems;

        private void Awake()
        {
            EnsureInitialized();
        }

        public void EnsureInitialized()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            // Fetch or load initial belongings
            RefreshBelongingsList();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void SetTrackedItems(List<SpatialTrackedItem> items)
        {
            trackedItems = items != null ? new List<SpatialTrackedItem>(items) : new List<SpatialTrackedItem>();
            Debug.Log($"[SpatialDepartureService] Updated tracked belongings count: {trackedItems.Count}");
        }

        public void ClearCooldowns()
        {
            itemCooldownTimestamps.Clear();
        }

        public void RefreshBelongingsList()
        {
            if (YaadApiClient.Instance != null)
            {
                YaadApiClient.Instance.FetchItems((success, items, err) =>
                {
                    if (success && items != null)
                    {
                        SetTrackedItems(items);
                    }
                });
            }
        }

        /// <summary>
        /// Simulates or reports the user approaching a departure boundary (e.g. exit doorway).
        /// </summary>
        public void TriggerApproachingBoundary(DepartureBoundaryType boundaryType = DepartureBoundaryType.RoomLevel)
        {
            activeBoundaryType = boundaryType;
            SetState(DepartureEventState.ApproachingBoundary);
            Debug.Log($"[SpatialDepartureService] Approaching departure boundary: {boundaryType}");
        }

        /// <summary>
        /// Evaluates belongings and triggers a proactive departure reminder if uncollected items remain.
        /// </summary>
        public SpatialDepartureReminder TriggerDeparture(DepartureBoundaryType boundaryType = DepartureBoundaryType.RoomLevel)
        {
            activeBoundaryType = boundaryType;

            // 1. Filter genuinely uncollected, active belongings
            SpatialTrackedItem targetItem = GetNextUncollectedBelonging();

            if (targetItem == null)
            {
                SetState(DepartureEventState.CrossedBoundary);
                activeReminder = null;
                Debug.Log("[SpatialDepartureService] Departure crossed, but zero uncollected belongings found. No alert needed.");
                return null;
            }

            // 2. Enforce alert cooldown to prevent repetitive spamming
            long nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            if (itemCooldownTimestamps.TryGetValue(targetItem.id, out long lastMs))
            {
                float elapsed = (nowMs - lastMs) / 1000f;
                if (elapsed < alertCooldownSeconds)
                {
                    Debug.Log($"[SpatialDepartureService] Alert for '{targetItem.name}' suppressed by cooldown ({elapsed:F1}s < {alertCooldownSeconds}s)");
                    return null;
                }
            }

            // 3. Create grounded reminder
            string reminderPrompt = $"Before you leave, your {targetItem.name} was last seen {targetItem.lastSeenLocation}. This is a past sighting.";
            activeReminder = new SpatialDepartureReminder(
                targetItem.id,
                targetItem.name,
                targetItem.lastSeenLocation,
                targetItem.lastSeenTimestamp,
                boundaryType,
                reminderPrompt,
                nowMs
            );
            itemCooldownTimestamps[targetItem.id] = nowMs;

            SetState(DepartureEventState.CrossedBoundary);

            // 4. Acoustic earcon alert
            if (SpatialAudioService.Instance != null && !SpatialAudioService.Instance.IsMuted)
            {
                SpatialAudioService.Instance.PlayAlert();
            }

            // 5. Calm spoken reminder
            if (SpatialSpeechService.Instance != null)
            {
                SpatialSpeechService.Instance.SpeakCalmReminder(reminderPrompt);
            }

            OnDepartureAlertTriggered?.Invoke(activeReminder);
            Debug.Log($"[SpatialDepartureService] Triggered departure alert for '{targetItem.name}' ({boundaryType})");
            return activeReminder;
        }

        /// <summary>
        /// Reports the user returning back inside the safe zone, resetting the departure sequence.
        /// </summary>
        public void TriggerReturnInside()
        {
            SetState(DepartureEventState.ReturnedInside);
            activeReminder = null;

            if (SpatialSpeechService.Instance != null && SpatialSpeechService.Instance.IsSpeaking)
            {
                SpatialSpeechService.Instance.StopSpeech();
            }

            if (SpatialAudioService.Instance != null && !SpatialAudioService.Instance.IsMuted)
            {
                SpatialAudioService.Instance.PlaySuccess();
            }

            OnReturnedInside?.Invoke();
            Debug.Log("[SpatialDepartureService] User returned inside boundary. Departure state reset.");
        }

        public void DismissReminder()
        {
            if (activeReminder != null)
            {
                activeReminder = null;
                SetState(DepartureEventState.Dismissed);
                if (SpatialSpeechService.Instance != null)
                {
                    SpatialSpeechService.Instance.StopSpeech();
                }
                OnReminderDismissed?.Invoke();
                Debug.Log("[SpatialDepartureService] Departure reminder dismissed by user.");
            }
        }

        /// <summary>
        /// Convenience cycle method for simulator keyboard testing [D].
        /// </summary>
        public void SimulateCycle()
        {
            switch (currentState)
            {
                case DepartureEventState.Inside:
                case DepartureEventState.ReturnedInside:
                case DepartureEventState.Dismissed:
                    TriggerApproachingBoundary(DepartureBoundaryType.RoomLevel);
                    break;
                case DepartureEventState.ApproachingBoundary:
                    TriggerDeparture(DepartureBoundaryType.RoomLevel);
                    break;
                case DepartureEventState.CrossedBoundary:
                    TriggerReturnInside();
                    break;
            }
        }

        private SpatialTrackedItem GetNextUncollectedBelonging()
        {
            if (trackedItems == null || trackedItems.Count == 0) return null;

            foreach (var item in trackedItems)
            {
                if (item == null) continue;

                // Belongings marked "found" or "collected" are currently with user
                string status = item.status != null ? item.status.ToLower() : "active";
                if (status == "found" || status == "collected") continue;

                if (!string.IsNullOrEmpty(item.lastSeenLocation))
                {
                    return item;
                }
            }
            return null;
        }

        private void SetState(DepartureEventState newState)
        {
            if (currentState != newState)
            {
                currentState = newState;
                OnDepartureStateChanged?.Invoke(currentState);
            }
        }
    }
}
