using System;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// SpatialGuidanceBeacon
    /// Floating in-world visual indicator providing glanceable contextual guidance for a recalled belonging.
    /// Strictly respects grounding constraints: never fabricates physical bearing or room vectors from GPS coordinates.
    /// Emphasizes visual description and room landmarks with subtle, calm breathing animation and clear simulated placement disclosure.
    /// </summary>
    public class SpatialGuidanceBeacon : MonoBehaviour
    {
        [Header("UI Elements")]
        [SerializeField] private Canvas canvas;
        [SerializeField] private Text itemTitleText;
        [SerializeField] private Text locationDescriptionText;
        [SerializeField] private Text landmarksText;
        [SerializeField] private Text reliabilityBadgeText;
        [SerializeField] private Text disclosureNoticeText;
        [SerializeField] private Button dismissButton;
        [SerializeField] private Image backgroundPanel;

        public event Action OnDismissed;
        private SpatialGuidanceData currentData;
        private float pulseTimer = 0f;
        private Vector3 baseScale = Vector3.one * 0.0016f;

        public SpatialGuidanceData CurrentData => currentData;
        public bool IsVisible => gameObject != null && gameObject.activeSelf;
        public string DisclosureText => disclosureNoticeText != null ? disclosureNoticeText.text : string.Empty;
        public string ReliabilityBadge => reliabilityBadgeText != null ? reliabilityBadgeText.text : string.Empty;

        private void Awake()
        {
            if (dismissButton != null)
            {
                dismissButton.onClick.AddListener(Dismiss);
            }
        }

        private void OnDestroy()
        {
            if (dismissButton != null)
            {
                dismissButton.onClick.RemoveListener(Dismiss);
            }
        }

        private void Update()
        {
            // Face the user/camera smoothly
            if (Camera.main != null)
            {
                Vector3 dirToCamera = transform.position - Camera.main.transform.position;
                if (dirToCamera.sqrMagnitude > 0.001f)
                {
                    transform.rotation = Quaternion.LookRotation(dirToCamera);
                }
            }

            // Subtle, calm breathing animation (1.5s period, max ±2% scale variation)
            pulseTimer += Time.deltaTime;
            float pulseScale = 1.0f + 0.02f * Mathf.Sin(pulseTimer * 2.0f);
            transform.localScale = baseScale * pulseScale;
        }

        /// <summary>
        /// Configures the beacon with grounded historical recall data.
        /// </summary>
        public void Configure(SpatialGuidanceData data)
        {
            currentData = data;
            if (data == null)
            {
                gameObject.SetActive(false);
                return;
            }

            if (itemTitleText != null)
            {
                itemTitleText.text = $"📍 {data.itemName}";
            }

            if (locationDescriptionText != null)
            {
                locationDescriptionText.text = data.locationDescription;
            }

            if (landmarksText != null)
            {
                landmarksText.text = data.landmarks != null && data.landmarks.Length > 0
                    ? $"🏷 Landmarks: {string.Join(", ", data.landmarks)}"
                    : "🏷 Visual description prioritized";
            }

            if (reliabilityBadgeText != null)
            {
                reliabilityBadgeText.text = FormatTierBadge(data.tier);
            }

            if (disclosureNoticeText != null)
            {
                disclosureNoticeText.text = data.isSimulatedIndoor
                    ? "Simulated Spatial Placement · Contextual Landmarks Grounded"
                    : "Historical Sighting · Not Real-Time Tracking";
            }

            // Position beacon at designated simulated position
            transform.position = data.simulatedWorldPosition;
            pulseTimer = 0f;
            gameObject.SetActive(true);

            // Emit spatialized acoustic cue at beacon position
            if (SpatialAudioService.Instance != null && !SpatialAudioService.Instance.IsMuted)
            {
                SpatialAudioService.Instance.PlayListeningStart();
            }

            Debug.Log($"[SpatialGuidanceBeacon] Activated for '{data.itemName}' at {data.simulatedWorldPosition}. Tier: {data.tier}");
        }

        private string FormatTierBadge(GpsAccuracyTier tier)
        {
            return tier switch
            {
                GpsAccuracyTier.Target => "<color=#4ADE80>● Recorded GPS: Excellent (±10m)</color>",
                GpsAccuracyTier.Acceptable => "<color=#4ADE80>● Recorded GPS: High Precision (±30m)</color>",
                GpsAccuracyTier.Uncertain => "<color=#FBBF24>⚠ Uncertain GPS: Coarse area. Landmarks prioritized.</color>",
                GpsAccuracyTier.Unusable => "<color=#FB923C>🚫 Low GPS Accuracy: Unusable for navigation</color>",
                GpsAccuracyTier.Unavailable => "<color=#94A3B8>📍 Indoor Landmark Grounded (No GPS recorded)</color>",
                _ => "<color=#94A3B8>📍 Historical Landmark Grounded</color>"
            };
        }

        public void Dismiss()
        {
            if (!gameObject.activeSelf) return;

            gameObject.SetActive(false);
            if (SpatialAudioService.Instance != null && !SpatialAudioService.Instance.IsMuted)
            {
                SpatialAudioService.Instance.PlayClick();
            }
            OnDismissed?.Invoke();
            Debug.Log("[SpatialGuidanceBeacon] Guidance beacon dismissed by user.");
        }
    }
}
