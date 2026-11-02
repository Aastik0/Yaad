using System;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// YaadSpatialPanel
    /// Floating spatial UI panel designed for Meta Horizon OS / Meta VR Glasses look-and-pinch interaction.
    /// Provides spatial access to Remember, Recall, and Recent Memories without cluttering the 3D field of view.
    /// Features deadzoned ergonomic gaze follow, world-locking, tab switching, cloud mode, and audio toggle.
    /// </summary>
    public class YaadSpatialPanel : MonoBehaviour
    {
        [Header("Spatial Positioning")]
        [Tooltip("Distance in meters in front of user's eye gaze")]
        [SerializeField] private float defaultDistance = 1.35f;
        [SerializeField] private float smoothFollowSpeed = 3.2f;
        [SerializeField] private float followDeadzone = 0.06f;
        [SerializeField] private bool isWorldLocked = false;

        [Header("UI Views")]
        [SerializeField] private GameObject rememberView;
        [SerializeField] private GameObject recallView;
        [SerializeField] private GameObject recentMemoriesView;

        [Header("Sub-Controllers")]
        [SerializeField] private RememberPanelController rememberController;
        [SerializeField] private RecallPanelController recallController;
        [SerializeField] private RecentMemoriesCarousel recentMemoriesController;

        [Header("Status & Mode Feedback")]
        [SerializeField] private Text statusDisplayText;
        [SerializeField] private Text activeModeText;
        [SerializeField] private Button lockToggleButton;
        [SerializeField] private Text lockButtonText;
        [SerializeField] private Button cloudModeToggleButton;
        [SerializeField] private Text cloudModeButtonText;
        [SerializeField] private Button audioToggleButton;
        [SerializeField] private Text audioButtonText;

        [Header("Proactive Departure Intelligence (Phase 26A)")]
        [SerializeField] private GameObject departureToastContainer;
        [SerializeField] private Text departureToastTitle;
        [SerializeField] private Text departureToastMessage;
        [SerializeField] private Button departureDismissButton;
        [SerializeField] private Button simDepartureButton;
        [SerializeField] private Text simDepartureButtonText;

        public enum PanelTab
        {
            Remember,
            Recall,
            RecentMemories
        }

        public static YaadSpatialPanel Instance { get; private set; }

        private PanelTab currentTab = PanelTab.Remember;
        private Transform mainCameraTransform;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            if (Camera.main != null)
            {
                mainCameraTransform = Camera.main.transform;
            }

            // Wire up item confirmation flow from Remember -> Recent Memories
            if (rememberController != null && recentMemoriesController != null)
            {
                rememberController.OnItemConfirmed += OnItemConfirmedFromRemember;
            }

            if (lockToggleButton != null)
            {
                lockToggleButton.onClick.AddListener(ToggleWorldLock);
            }

            if (cloudModeToggleButton != null)
            {
                cloudModeToggleButton.onClick.AddListener(ToggleCloudMode);
            }

            if (audioToggleButton != null)
            {
                audioToggleButton.onClick.AddListener(ToggleAudio);
            }

            if (simDepartureButton != null)
            {
                simDepartureButton.onClick.AddListener(TriggerSimulatedDepartureCycle);
            }

            if (departureDismissButton != null)
            {
                departureDismissButton.onClick.AddListener(DismissDepartureReminder);
            }

            if (departureToastContainer != null)
            {
                departureToastContainer.SetActive(false);
            }

            if (SpatialDepartureService.Instance != null)
            {
                SpatialDepartureService.Instance.OnDepartureAlertTriggered += HandleDepartureAlert;
                SpatialDepartureService.Instance.OnReminderDismissed += HandleDepartureDismissed;
                SpatialDepartureService.Instance.OnReturnedInside += HandleDepartureDismissed;
            }

            UpdateCloudModeUI();
            UpdateAudioUI();
            SelectTab(PanelTab.Remember);
            UpdateStatus("Yaad Spatial Active · [1,2,3: Tabs | Space: Pinch | C: Capture | D: Departure | L: Pin | M: Cloud | A: Audio]");
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
            if (rememberController != null)
            {
                rememberController.OnItemConfirmed -= OnItemConfirmedFromRemember;
            }
            if (lockToggleButton != null) lockToggleButton.onClick.RemoveListener(ToggleWorldLock);
            if (cloudModeToggleButton != null) cloudModeToggleButton.onClick.RemoveListener(ToggleCloudMode);
            if (audioToggleButton != null) audioToggleButton.onClick.RemoveListener(ToggleAudio);
            if (simDepartureButton != null) simDepartureButton.onClick.RemoveListener(TriggerSimulatedDepartureCycle);
            if (departureDismissButton != null) departureDismissButton.onClick.RemoveListener(DismissDepartureReminder);

            if (SpatialDepartureService.Instance != null)
            {
                SpatialDepartureService.Instance.OnDepartureAlertTriggered -= HandleDepartureAlert;
                SpatialDepartureService.Instance.OnReminderDismissed -= HandleDepartureDismissed;
                SpatialDepartureService.Instance.OnReturnedInside -= HandleDepartureDismissed;
            }
        }

        private void Update()
        {
            // Ergonomic gaze follow with micro-tremor deadzone
            if (!isWorldLocked && mainCameraTransform != null)
            {
                Vector3 desiredPos = mainCameraTransform.position + mainCameraTransform.forward * defaultDistance;
                desiredPos.y = mainCameraTransform.position.y - 0.08f;

                float distanceDelta = Vector3.Distance(transform.position, desiredPos);
                if (distanceDelta > followDeadzone)
                {
                    transform.position = Vector3.Lerp(transform.position, desiredPos, Time.deltaTime * smoothFollowSpeed);
                }

                Quaternion targetRot = Quaternion.LookRotation(transform.position - mainCameraTransform.position);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, Time.deltaTime * smoothFollowSpeed);
            }

            HandleKeyboardFallbacks();
        }

        private void HandleKeyboardFallbacks()
        {
            if (Input.GetKeyDown(KeyCode.Alpha1))
            {
                SelectTab(PanelTab.Remember);
            }
            else if (Input.GetKeyDown(KeyCode.Alpha2))
            {
                SelectTab(PanelTab.Recall);
            }
            else if (Input.GetKeyDown(KeyCode.Alpha3))
            {
                SelectTab(PanelTab.RecentMemories);
            }
            else if (Input.GetKeyDown(KeyCode.L))
            {
                ToggleWorldLock();
            }
            else if (Input.GetKeyDown(KeyCode.M))
            {
                ToggleCloudMode();
            }
            else if (Input.GetKeyDown(KeyCode.A))
            {
                ToggleAudio();
            }
            else if (Input.GetKeyDown(KeyCode.C))
            {
                if (currentTab == PanelTab.Remember && rememberController != null)
                {
                    rememberController.TriggerSimulatedCapture();
                }
            }
            else if (Input.GetKeyDown(KeyCode.D))
            {
                TriggerSimulatedDepartureCycle();
            }
            else if (Input.GetKeyDown(KeyCode.Escape))
            {
                if (SpatialDepartureService.Instance != null)
                {
                    SpatialDepartureService.Instance.DismissReminder();
                }
                if (SpatialGuidanceService.Instance != null)
                {
                    SpatialGuidanceService.Instance.DismissGuidance();
                }
                if (recentMemoriesController != null)
                {
                    recentMemoriesController.CloseDetailModal();
                }
                if (recallController != null)
                {
                    recallController.ClearAnswer();
                }
            }
        }

        public void TriggerSimulatedDepartureCycle()
        {
            if (SpatialDepartureService.Instance != null)
            {
                SpatialDepartureService.Instance.SimulateCycle();
                var state = SpatialDepartureService.Instance.CurrentState;
                UpdateStatus($"Departure Sim: State is {state}");
            }
        }

        public void DismissDepartureReminder()
        {
            if (SpatialDepartureService.Instance != null)
            {
                SpatialDepartureService.Instance.DismissReminder();
            }
            HandleDepartureDismissed();
        }

        private void HandleDepartureAlert(SpatialDepartureReminder reminder)
        {
            if (departureToastContainer != null && reminder != null)
            {
                if (departureToastTitle != null)
                {
                    departureToastTitle.text = $"⚠ Departure Check · {reminder.boundaryType}";
                }
                if (departureToastMessage != null)
                {
                    departureToastMessage.text = $"Don't forget your {reminder.itemName}\n<color=#94A3B8>Last recorded: {reminder.lastLocation}</color>";
                }
                departureToastContainer.SetActive(true);
            }
            UpdateStatus($"Departure Warning: Don't forget your {reminder?.itemName}!");
        }

        private void HandleDepartureDismissed()
        {
            if (departureToastContainer != null)
            {
                departureToastContainer.SetActive(false);
            }
        }

        public void SelectTab(PanelTab tab)
        {
            if (currentTab != tab && SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlayTabSwitch();
            }

            currentTab = tab;

            if (rememberView != null) rememberView.SetActive(tab == PanelTab.Remember);
            if (recallView != null) recallView.SetActive(tab == PanelTab.Recall);
            if (recentMemoriesView != null) recentMemoriesView.SetActive(tab == PanelTab.RecentMemories);

            if (activeModeText != null)
            {
                activeModeText.text = tab switch
                {
                    PanelTab.Remember => "Mode: Remember (Map Belongings via Simulated Capture)",
                    PanelTab.Recall => "Mode: Recall (Find Belonging with Grounded History)",
                    PanelTab.RecentMemories => "Mode: Recent Memories (Interactive Spatial Carousel)",
                    _ => "Mode: Yaad Spatial"
                };
            }

            if (tab == PanelTab.RecentMemories && recentMemoriesController != null)
            {
                recentMemoriesController.RefreshItems();
            }

            UpdateStatus($"Active Tab: {tab}");
        }

        public void OnTabButtonClicked(string tabName)
        {
            if (Enum.TryParse<PanelTab>(tabName, true, out var tab))
            {
                SelectTab(tab);
            }
        }

        public void ToggleWorldLock()
        {
            isWorldLocked = !isWorldLocked;
            if (lockButtonText != null)
            {
                lockButtonText.text = isWorldLocked ? "📌 Panel Pinned" : "👀 Floating Gaze";
            }
            UpdateStatus(isWorldLocked ? "Panel Pin: World-Locked in 3D Space (Fixed location)" : "Panel Pin: Floating Gaze Follow");
        }

        public void ToggleCloudMode()
        {
            if (YaadApiClient.Instance != null)
            {
                bool newMode = !YaadApiClient.Instance.IsCloudMode;
                YaadApiClient.Instance.SetCloudMode(newMode);
                UpdateCloudModeUI();

                if (recentMemoriesController != null)
                {
                    recentMemoriesController.RefreshItems();
                }

                UpdateStatus(newMode
                    ? "Switched to Authenticated Cloud Mode (Connecting to Next.js API / Supabase)"
                    : "Switched to Local Demo Mode (Zero network requests)");
            }
        }

        public void ToggleAudio()
        {
            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.ToggleAudio();
                UpdateAudioUI();
                UpdateStatus(SpatialAudioService.Instance.IsMuted ? "Spatial Audio: Muted" : "Spatial Audio: Enabled (Subtle Cues)");
            }
        }

        private void UpdateCloudModeUI()
        {
            bool isCloud = YaadApiClient.Instance != null && YaadApiClient.Instance.IsCloudMode;
            if (cloudModeButtonText != null)
            {
                cloudModeButtonText.text = isCloud ? "☁ Cloud Mode" : "🏠 Demo Mode";
            }
        }

        private void UpdateAudioUI()
        {
            bool isMuted = SpatialAudioService.Instance != null && SpatialAudioService.Instance.IsMuted;
            if (audioButtonText != null)
            {
                audioButtonText.text = isMuted ? "🔇 Audio: Off" : "🔊 Audio: On";
            }
        }

        public void TriggerSimulatedCapture()
        {
            if (rememberController != null)
            {
                rememberController.TriggerSimulatedCapture();
            }
        }

        private void OnItemConfirmedFromRemember(SpatialTrackedItem newItem)
        {
            if (recentMemoriesController != null)
            {
                recentMemoriesController.AddTrackedItem(newItem);
                if (YaadApiClient.Instance != null && YaadApiClient.Instance.IsCloudMode)
                {
                    recentMemoriesController.RefreshItems();
                }
            }
            UpdateStatus($"Saved '{newItem.name}' to Recent Memories carousel.");
        }

        public void UpdateStatus(string message)
        {
            if (statusDisplayText != null)
            {
                statusDisplayText.text = message;
            }
            Debug.Log($"[YaadSpatialPanel] {message}");
        }
    }
}
