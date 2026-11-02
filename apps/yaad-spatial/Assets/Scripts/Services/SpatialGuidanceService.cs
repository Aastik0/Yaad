using System;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;

namespace Yaad.Spatial.Services
{
    /// <summary>
    /// SpatialGuidanceService
    /// Coordinates spatial guidance beacons for recalled belongings in Yaad Spatial.
    /// Bridges grounded recall queries with contextual in-world spatial indicators.
    /// Strictly adheres to the zero-fabrication invariant: never invents physical vectors or bearings from GPS alone.
    /// </summary>
    public class SpatialGuidanceService : MonoBehaviour
    {
        public static SpatialGuidanceService Instance { get; private set; }

        [Header("Beacon Configuration")]
        [SerializeField] private SpatialGuidanceBeacon beaconPrefab;
        [SerializeField] private Vector3 defaultRelativeOffset = new Vector3(0.45f, -0.1f, 1.8f);

        private SpatialGuidanceBeacon activeBeacon;
        private SpatialGuidanceState currentState = SpatialGuidanceState.Inactive;
        private SpatialGuidanceData activeData = null;

        public event Action<SpatialGuidanceState> OnGuidanceStateChanged;
        public event Action<SpatialGuidanceData> OnGuidanceActivated;
        public event Action OnGuidanceDismissed;

        public bool IsGuidanceActive => activeBeacon != null && activeBeacon.IsVisible;
        public SpatialGuidanceState CurrentState => currentState;
        public SpatialGuidanceData ActiveData => activeData;
        public SpatialGuidanceBeacon ActiveBeacon => activeBeacon;

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

            if (activeBeacon == null)
            {
                activeBeacon = FindFirstObjectByType<SpatialGuidanceBeacon>();
                if (activeBeacon == null)
                {
                    activeBeacon = CreateProceduralBeacon();
                }
            }

            if (activeBeacon != null)
            {
                activeBeacon.OnDismissed += HandleBeaconDismissed;
            }
        }

        private void OnDestroy()
        {
            if (activeBeacon != null)
            {
                activeBeacon.OnDismissed -= HandleBeaconDismissed;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// Activates contextual spatial guidance for a successful grounded recall result.
        /// </summary>
        public SpatialGuidanceData ActivateGuidance(SpatialRecallResult recallResult)
        {
            EnsureInitialized();

            if (recallResult == null || !recallResult.found)
            {
                SetState(SpatialGuidanceState.NoRecordedSighting);
                if (activeBeacon != null)
                {
                    activeBeacon.gameObject.SetActive(false);
                }
                activeData = null;
                return null;
            }

            // Determine appropriate guidance state based on genuine GPS quality
            SpatialGuidanceState targetState = recallResult.locationTier switch
            {
                GpsAccuracyTier.Unavailable => SpatialGuidanceState.LandmarkOnlyGuidance,
                GpsAccuracyTier.Uncertain => SpatialGuidanceState.GpsUncertain,
                GpsAccuracyTier.Unusable => SpatialGuidanceState.GpsUnavailable,
                _ => SpatialGuidanceState.GroundedLocationAvailable
            };

            // Calculate simulated in-world placement relative to current eye gaze
            Vector3 worldPos;
            if (Camera.main != null)
            {
                Transform cam = Camera.main.transform;
                worldPos = cam.position + (cam.forward * defaultRelativeOffset.z) +
                           (cam.right * defaultRelativeOffset.x) +
                           (cam.up * defaultRelativeOffset.y);
            }
            else
            {
                worldPos = new Vector3(0.5f, 1.2f, 1.8f);
            }

            activeData = new SpatialGuidanceData(
                recallResult.query,
                recallResult.itemName,
                recallResult.lastRecordedLocation,
                recallResult.landmarks,
                recallResult.lastRecordedTimestamp,
                recallResult.locationTier,
                recallResult.disclaimer,
                true, // Clearly disclosed as simulated indoor placement
                worldPos,
                recallResult.coordinates
            );

            if (activeBeacon != null)
            {
                activeBeacon.Configure(activeData);
            }

            SetState(targetState);
            OnGuidanceActivated?.Invoke(activeData);
            return activeData;
        }

        public void DismissGuidance()
        {
            if (activeBeacon != null && activeBeacon.IsVisible)
            {
                activeBeacon.Dismiss();
            }
            SetState(SpatialGuidanceState.Dismissed);
            OnGuidanceDismissed?.Invoke();
        }

        public void CancelGuidance()
        {
            if (activeBeacon != null && activeBeacon.IsVisible)
            {
                activeBeacon.gameObject.SetActive(false);
            }
            if (SpatialSpeechService.Instance != null)
            {
                SpatialSpeechService.Instance.StopSpeech();
            }
            SetState(SpatialGuidanceState.Cancelled);
            OnGuidanceDismissed?.Invoke();
        }

        public void ClearGuidance()
        {
            if (activeBeacon != null)
            {
                activeBeacon.gameObject.SetActive(false);
            }
            SetState(SpatialGuidanceState.Inactive);
            activeData = null;
        }

        private void HandleBeaconDismissed()
        {
            SetState(SpatialGuidanceState.Dismissed);
            OnGuidanceDismissed?.Invoke();
        }

        private void SetState(SpatialGuidanceState newState)
        {
            if (currentState != newState)
            {
                currentState = newState;
                OnGuidanceStateChanged?.Invoke(currentState);
                Debug.Log($"[SpatialGuidanceService] State changed to: {currentState}");
            }
        }

        /// <summary>
        /// Creates a clean procedural beacon if none is bound via Inspector.
        /// </summary>
        private SpatialGuidanceBeacon CreateProceduralBeacon()
        {
            GameObject beaconObj = new GameObject("SpatialGuidanceBeacon", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            beaconObj.transform.position = new Vector3(0.5f, 1.2f, 1.8f);
            beaconObj.transform.localScale = Vector3.one * 0.0016f;

            Canvas canvas = beaconObj.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;

            RectTransform canvasRt = beaconObj.GetComponent<RectTransform>();
            canvasRt.sizeDelta = new Vector2(460, 240);

            // Background Card
            GameObject bgObj = new GameObject("Background", typeof(RectTransform), typeof(Image));
            bgObj.transform.SetParent(beaconObj.transform, false);
            RectTransform bgRt = bgObj.GetComponent<RectTransform>();
            bgRt.sizeDelta = new Vector2(460, 240);
            Image bgImg = bgObj.GetComponent<Image>();
            bgImg.color = new Color(0.08f, 0.14f, 0.24f, 0.95f);

            Font font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf") ?? Font.CreateDynamicFontFromOSFont("Helvetica", 14);

            // Title
            GameObject titleObj = new GameObject("Title", typeof(RectTransform), typeof(Text));
            titleObj.transform.SetParent(bgObj.transform, false);
            RectTransform titleRt = titleObj.GetComponent<RectTransform>();
            titleRt.sizeDelta = new Vector2(420, 32);
            titleRt.anchoredPosition = new Vector2(0, 85);
            Text titleText = titleObj.GetComponent<Text>();
            titleText.font = font;
            titleText.fontSize = 18;
            titleText.fontStyle = FontStyle.Bold;
            titleText.color = new Color(0.2f, 0.8f, 1.0f);
            titleText.alignment = TextAnchor.MiddleCenter;

            // Location
            GameObject locObj = new GameObject("Location", typeof(RectTransform), typeof(Text));
            locObj.transform.SetParent(bgObj.transform, false);
            RectTransform locRt = locObj.GetComponent<RectTransform>();
            locRt.sizeDelta = new Vector2(420, 48);
            locRt.anchoredPosition = new Vector2(0, 40);
            Text locText = locObj.GetComponent<Text>();
            locText.font = font;
            locText.fontSize = 13;
            locText.color = Color.white;
            locText.alignment = TextAnchor.MiddleCenter;

            // Landmarks
            GameObject lmObj = new GameObject("Landmarks", typeof(RectTransform), typeof(Text));
            lmObj.transform.SetParent(bgObj.transform, false);
            RectTransform lmRt = lmObj.GetComponent<RectTransform>();
            lmRt.sizeDelta = new Vector2(420, 24);
            lmRt.anchoredPosition = new Vector2(0, 0);
            Text lmText = lmObj.GetComponent<Text>();
            lmText.font = font;
            lmText.fontSize = 11;
            lmText.color = new Color(0.6f, 0.85f, 0.65f);
            lmText.alignment = TextAnchor.MiddleCenter;

            // Tier Badge
            GameObject tierObj = new GameObject("TierBadge", typeof(RectTransform), typeof(Text));
            tierObj.transform.SetParent(bgObj.transform, false);
            RectTransform tierRt = tierObj.GetComponent<RectTransform>();
            tierRt.sizeDelta = new Vector2(420, 22);
            tierRt.anchoredPosition = new Vector2(0, -28);
            Text tierText = tierObj.GetComponent<Text>();
            tierText.font = font;
            tierText.fontSize = 11;
            tierText.alignment = TextAnchor.MiddleCenter;

            // Disclosure
            GameObject discObj = new GameObject("Disclosure", typeof(RectTransform), typeof(Text));
            discObj.transform.SetParent(bgObj.transform, false);
            RectTransform discRt = discObj.GetComponent<RectTransform>();
            discRt.sizeDelta = new Vector2(420, 18);
            discRt.anchoredPosition = new Vector2(0, -52);
            Text discText = discObj.GetComponent<Text>();
            discText.font = font;
            discText.fontSize = 9;
            discText.fontStyle = FontStyle.Italic;
            discText.color = new Color(0.65f, 0.75f, 0.85f);
            discText.alignment = TextAnchor.MiddleCenter;

            // Dismiss Button
            GameObject btnObj = new GameObject("DismissBtn", typeof(RectTransform), typeof(Image), typeof(Button));
            btnObj.transform.SetParent(bgObj.transform, false);
            RectTransform btnRt = btnObj.GetComponent<RectTransform>();
            btnRt.sizeDelta = new Vector2(160, 28);
            btnRt.anchoredPosition = new Vector2(0, -85);
            Image btnImg = btnObj.GetComponent<Image>();
            btnImg.color = new Color(0.2f, 0.3f, 0.45f);
            Button btn = btnObj.GetComponent<Button>();

            GameObject btnTextObj = new GameObject("BtnLabel", typeof(RectTransform), typeof(Text));
            btnTextObj.transform.SetParent(btnObj.transform, false);
            RectTransform btnTextRt = btnTextObj.GetComponent<RectTransform>();
            btnTextRt.sizeDelta = new Vector2(160, 28);
            Text btnLabel = btnTextObj.GetComponent<Text>();
            btnLabel.font = font;
            btnLabel.fontSize = 11;
            btnLabel.fontStyle = FontStyle.Bold;
            btnLabel.color = Color.white;
            btnLabel.alignment = TextAnchor.MiddleCenter;
            btnLabel.text = "✕ Dismiss Guidance";

            var beaconComp = beaconObj.AddComponent<SpatialGuidanceBeacon>();
            SetPrivateField(beaconComp, "canvas", canvas);
            SetPrivateField(beaconComp, "itemTitleText", titleText);
            SetPrivateField(beaconComp, "locationDescriptionText", locText);
            SetPrivateField(beaconComp, "landmarksText", lmText);
            SetPrivateField(beaconComp, "reliabilityBadgeText", tierText);
            SetPrivateField(beaconComp, "disclosureNoticeText", discText);
            SetPrivateField(beaconComp, "dismissButton", btn);
            SetPrivateField(beaconComp, "backgroundPanel", bgImg);

            beaconObj.SetActive(false);
            return beaconComp;
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            if (target == null) return;
            var f = target.GetType().GetField(fieldName, System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
            if (f != null) f.SetValue(target, value);
        }
    }
}

