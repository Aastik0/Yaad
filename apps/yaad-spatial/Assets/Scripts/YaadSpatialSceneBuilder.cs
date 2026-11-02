using System;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// YaadSpatialSceneBuilder
    /// Automatically builds and configures the complete Yaad Spatial UI hierarchy,
    /// initializes YaadApiClient, and configures SpatialAudioService at runtime.
    /// Ensures instantaneous, 100% reliable execution in Unity Editor & Meta XR Simulator.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class YaadSpatialSceneBuilder : MonoBehaviour
    {
        private Font standardFont;

        private void Awake()
        {
            standardFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (standardFont == null)
            {
                standardFont = Font.CreateDynamicFontFromOSFont("Helvetica", 14);
            }

            EnsureApiClient();
            EnsureAudioService();
            EnsureGuidanceService();
            EnsureDepartureService();
            EnsureEventSystem();
            EnsureReticle();
            BuildSpatialCanvasIfMissing();
        }

        private void EnsureApiClient()
        {
            if (FindFirstObjectByType<YaadApiClient>() == null)
            {
                GameObject clientObj = new GameObject("YaadApiClient", typeof(YaadApiClient));
                clientObj.transform.SetParent(transform, false);
            }
        }

        private void EnsureAudioService()
        {
            var audioService = FindFirstObjectByType<SpatialAudioService>();
            if (audioService == null)
            {
                GameObject audioObj = new GameObject("SpatialAudioService", typeof(SpatialAudioService), typeof(SpatialSpeechService));
                audioObj.transform.SetParent(transform, false);
            }
            else if (FindFirstObjectByType<SpatialSpeechService>() == null)
            {
                audioService.gameObject.AddComponent<SpatialSpeechService>();
            }
        }

        private void EnsureGuidanceService()
        {
            if (FindFirstObjectByType<SpatialGuidanceService>() == null)
            {
                GameObject guidanceObj = new GameObject("SpatialGuidanceService", typeof(SpatialGuidanceService));
                guidanceObj.transform.SetParent(transform, false);
            }
        }

        private void EnsureDepartureService()
        {
            if (FindFirstObjectByType<SpatialDepartureService>() == null)
            {
                GameObject departureObj = new GameObject("SpatialDepartureService", typeof(SpatialDepartureService));
                departureObj.transform.SetParent(transform, false);
            }
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject eventObj = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                eventObj.transform.SetParent(transform, false);
            }
        }

        private void EnsureReticle()
        {
            if (FindFirstObjectByType<LookAndPinchInteraction>() != null) return;

            GameObject reticleCanvasObj = new GameObject("ReticleCanvas", typeof(Canvas), typeof(CanvasScaler));
            Canvas canvas = reticleCanvasObj.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 999;

            GameObject dotObj = new GameObject("ReticleDot", typeof(RectTransform), typeof(Image));
            dotObj.transform.SetParent(reticleCanvasObj.transform, false);

            RectTransform rt = dotObj.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(16, 16);
            rt.anchoredPosition = Vector2.zero;

            Image img = dotObj.GetComponent<Image>();
            img.color = new Color(0.92f, 0.95f, 1f, 0.6f);

            var interaction = reticleCanvasObj.AddComponent<LookAndPinchInteraction>();
            SetPrivateField(interaction, "reticleTransform", rt);
            SetPrivateField(interaction, "reticleImage", img);
        }

        private void BuildSpatialCanvasIfMissing()
        {
            if (FindFirstObjectByType<YaadSpatialPanel>() != null) return;

            GameObject canvasObj = new GameObject("YaadSpatialCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasObj.transform.position = new Vector3(0, -0.05f, 1.35f);
            canvasObj.transform.localScale = Vector3.one * 0.0016f;

            Canvas canvas = canvasObj.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;

            RectTransform canvasRt = canvasObj.GetComponent<RectTransform>();
            canvasRt.sizeDelta = new Vector2(980, 700);

            // Background Panel (Serene Dark Navy #0F172A)
            GameObject bgObj = CreateUIElement("BackgroundPanel", canvasObj.transform, new Vector2(980, 700), Vector2.zero);
            Image bgImage = bgObj.AddComponent<Image>();
            bgImage.color = new Color(0.06f, 0.09f, 0.16f, 0.96f);

            // Header Container
            GameObject headerObj = CreateUIElement("Header", bgObj.transform, new Vector2(940, 64), new Vector2(0, 300));
            Text titleText = CreateText(headerObj.transform, "YAAD SPATIAL", 22, FontStyle.Bold, new Color(0.15f, 0.75f, 1f), new Vector2(230, 30), new Vector2(-340, 10));
            Text subText = CreateText(headerObj.transform, "Hands-Free Memory Assistant · Meta VR Glasses Profile", 11, FontStyle.Normal, new Color(0.6f, 0.7f, 0.8f), new Vector2(340, 20), new Vector2(-285, -12));

            // Mode Toggle (Cloud vs Demo)
            GameObject cloudModeBtnObj = CreateButton(headerObj.transform, "CloudModeBtn", "🏠 Demo Mode", new Vector2(115, 34), new Vector2(15, 0), new Color(0.12f, 0.35f, 0.55f));
            Button cloudModeBtn = cloudModeBtnObj.GetComponent<Button>();
            Text cloudModeText = cloudModeBtnObj.GetComponentInChildren<Text>();

            // Departure Simulator Trigger Button (Phase 26A)
            GameObject simDepBtnObj = CreateButton(headerObj.transform, "SimDepartureBtn", "🚪 Sim Departure [D]", new Vector2(145, 34), new Vector2(150, 0), new Color(0.35f, 0.25f, 0.12f));
            Button simDepBtn = simDepBtnObj.GetComponent<Button>();
            Text simDepBtnText = simDepBtnObj.GetComponentInChildren<Text>();

            // Master Audio Toggle Button
            GameObject audioBtnObj = CreateButton(headerObj.transform, "AudioToggleBtn", "🔊 Audio: On", new Vector2(110, 34), new Vector2(285, 0), new Color(0.14f, 0.28f, 0.42f));
            Button audioBtn = audioBtnObj.GetComponent<Button>();
            Text audioBtnText = audioBtnObj.GetComponentInChildren<Text>();

            // World Lock Button
            GameObject lockBtnObj = CreateButton(headerObj.transform, "LockToggleBtn", "👀 Floating Gaze", new Vector2(125, 34), new Vector2(410, 0), new Color(0.18f, 0.24f, 0.35f));
            Button lockBtn = lockBtnObj.GetComponent<Button>();
            Text lockBtnText = lockBtnObj.GetComponentInChildren<Text>();

            // Navigation Tabs Bar
            GameObject navBarObj = CreateUIElement("NavigationBar", bgObj.transform, new Vector2(940, 48), new Vector2(0, 238));
            GameObject rememberTabBtn = CreateButton(navBarObj.transform, "Tab_Remember", "📸 Remember (Capture)", new Vector2(290, 42), new Vector2(-310, 0), new Color(0.15f, 0.28f, 0.45f));
            GameObject recallTabBtn = CreateButton(navBarObj.transform, "Tab_Recall", "🔍 Recall (Find)", new Vector2(290, 42), new Vector2(0, 0), new Color(0.15f, 0.28f, 0.45f));
            GameObject memoriesTabBtn = CreateButton(navBarObj.transform, "Tab_Memories", "🗂 Recent Memories", new Vector2(290, 42), new Vector2(310, 0), new Color(0.15f, 0.28f, 0.45f));

            // Content Area Container
            GameObject contentArea = CreateUIElement("ContentArea", bgObj.transform, new Vector2(940, 480), new Vector2(0, -32));

            // 1. Remember View
            GameObject rememberView = CreateUIElement("RememberView", contentArea.transform, new Vector2(940, 480), Vector2.zero);
            var rememberCtrl = rememberView.AddComponent<RememberPanelController>();

            // Viewfinder box
            GameObject viewfinder = CreateUIElement("ViewfinderBox", rememberView.transform, new Vector2(540, 220), new Vector2(0, 95));
            Image vfBg = viewfinder.AddComponent<Image>();
            vfBg.color = new Color(0.08f, 0.12f, 0.20f, 0.9f);

            // Real Camera live preview texture
            GameObject previewObj = CreateUIElement("CameraPreview", viewfinder.transform, new Vector2(520, 160), new Vector2(0, 15));
            RawImage cameraPreview = previewObj.AddComponent<RawImage>();
            cameraPreview.color = Color.white;
            previewObj.SetActive(false);

            Text vfStatus = CreateText(viewfinder.transform, "CAMERA STATUS · Initializing...", 12, FontStyle.Normal, new Color(0.4f, 0.8f, 0.5f), new Vector2(500, 24), new Vector2(0, 80));

            GameObject captureBtnObj = CreateButton(viewfinder.transform, "CaptureBtn", "📷 Snap Scene Photo [Space / C]", new Vector2(400, 48), new Vector2(0, -20), new Color(0.08f, 0.52f, 0.85f));
            Button captureBtn = captureBtnObj.GetComponent<Button>();
            Text captureBtnLabel = captureBtnObj.GetComponentInChildren<Text>();

            // Candidate Container
            GameObject candidateBox = CreateUIElement("CandidateBox", rememberView.transform, new Vector2(640, 120), new Vector2(0, -85));
            Image candBg = candidateBox.AddComponent<Image>();
            candBg.color = new Color(0.12f, 0.18f, 0.28f, 0.95f);

            Text candName = CreateText(candidateBox.transform, "Candidate Item", 16, FontStyle.Bold, Color.white, new Vector2(600, 24), new Vector2(0, 36));
            Text candLoc = CreateText(candidateBox.transform, "Detected at: Location", 13, FontStyle.Normal, new Color(0.8f, 0.88f, 0.95f), new Vector2(600, 20), new Vector2(0, 12));
            Text candConf = CreateText(candidateBox.transform, "Confidence: 94%", 11, FontStyle.Normal, new Color(0.3f, 0.85f, 0.5f), new Vector2(600, 18), new Vector2(0, -10));

            GameObject confirmBtnObj = CreateButton(candidateBox.transform, "ConfirmBtn", "✓ Confirm & Save to Yaad", new Vector2(260, 34), new Vector2(-140, -36), new Color(0.10f, 0.65f, 0.40f));
            GameObject discardBtnObj = CreateButton(candidateBox.transform, "DiscardBtn", "✕ Discard", new Vector2(160, 34), new Vector2(160, -36), new Color(0.85f, 0.25f, 0.35f));

            Text rememberFeedback = CreateText(rememberView.transform, "Ready. Point gaze and pinch capture button to scan.", 12, FontStyle.Italic, new Color(0.7f, 0.8f, 0.9f), new Vector2(720, 24), new Vector2(0, -195));

            SetPrivateField(rememberCtrl, "viewfinderContainer", viewfinder);
            SetPrivateField(rememberCtrl, "viewfinderStatusText", vfStatus);
            SetPrivateField(rememberCtrl, "captureButton", captureBtn);
            SetPrivateField(rememberCtrl, "cameraPreviewImage", cameraPreview);
            SetPrivateField(rememberCtrl, "captureButtonLabel", captureBtnLabel);
            SetPrivateField(rememberCtrl, "candidateCardContainer", candidateBox);
            SetPrivateField(rememberCtrl, "candidateNameText", candName);
            SetPrivateField(rememberCtrl, "candidateLocationText", candLoc);
            SetPrivateField(rememberCtrl, "candidateConfidenceText", candConf);
            SetPrivateField(rememberCtrl, "confirmButton", confirmBtnObj.GetComponent<Button>());
            SetPrivateField(rememberCtrl, "discardButton", discardBtnObj.GetComponent<Button>());
            SetPrivateField(rememberCtrl, "rememberFeedbackText", rememberFeedback);

            // 2. Recall View
            GameObject recallView = CreateUIElement("RecallView", contentArea.transform, new Vector2(940, 480), Vector2.zero);
            var recallCtrl = recallView.AddComponent<RecallPanelController>();

            Text queryLabel = CreateText(recallView.transform, "Simulated Voice & Text Query · Hands-Free Memory Search", 14, FontStyle.Bold, new Color(0.3f, 0.75f, 1f), new Vector2(720, 24), new Vector2(0, 205));

            // Preset query buttons
            GameObject presetRow = CreateUIElement("PresetRow", recallView.transform, new Vector2(840, 44), new Vector2(0, 155));
            GameObject qKeys = CreateButton(presetRow.transform, "Btn_QueryKeys", "🔑 \"Where are my keys?\"", new Vector2(195, 38), new Vector2(-300, 0), new Color(0.18f, 0.24f, 0.38f));
            GameObject qGlasses = CreateButton(presetRow.transform, "Btn_QueryGlasses", "👓 \"Where are my glasses?\"", new Vector2(195, 38), new Vector2(-100, 0), new Color(0.18f, 0.24f, 0.38f));
            GameObject qWallet = CreateButton(presetRow.transform, "Btn_QueryWallet", "👛 \"Where is my wallet?\"", new Vector2(195, 38), new Vector2(100, 0), new Color(0.18f, 0.24f, 0.38f));
            GameObject qBottle = CreateButton(presetRow.transform, "Btn_QueryBottle", "💧 \"Where is my bottle?\"", new Vector2(195, 38), new Vector2(300, 0), new Color(0.18f, 0.24f, 0.38f));

            // Answer card (Spacious layout for visual description & grounded metadata)
            GameObject answerCard = CreateUIElement("AnswerCard", recallView.transform, new Vector2(820, 280), new Vector2(0, -10));
            Image ansBg = answerCard.AddComponent<Image>();
            ansBg.color = new Color(0.10f, 0.15f, 0.24f, 0.98f);

            Text ansTitle = CreateText(answerCard.transform, "Found: Item Name", 18, FontStyle.Bold, Color.white, new Vector2(660, 28), new Vector2(-40, 104));
            GameObject clearAnsBtn = CreateButton(answerCard.transform, "ClearAnsBtn", "✕ Clear", new Vector2(100, 28), new Vector2(340, 104), new Color(0.25f, 0.3f, 0.4f));

            Text ansLoc = CreateText(answerCard.transform, "📍 Location: Coffee Table", 13, FontStyle.Normal, new Color(0.4f, 0.85f, 0.55f), new Vector2(760, 22), new Vector2(0, 74));
            Text ansGps = CreateText(answerCard.transform, "📍 Recorded GPS: ...", 12, FontStyle.Normal, new Color(0.4f, 0.85f, 0.55f), new Vector2(760, 22), new Vector2(0, 50));
            Text ansTime = CreateText(answerCard.transform, "🕒 Recorded: Just now (Cloud)", 11, FontStyle.Normal, new Color(0.7f, 0.75f, 0.85f), new Vector2(760, 20), new Vector2(0, 26));
            Text ansSummary = CreateText(answerCard.transform, "Grounded sighting summary...", 12, FontStyle.Normal, new Color(0.9f, 0.92f, 0.96f), new Vector2(760, 115), new Vector2(0, -48));

            SetPrivateField(recallCtrl, "queryKeysButton", qKeys.GetComponent<Button>());
            SetPrivateField(recallCtrl, "queryGlassesButton", qGlasses.GetComponent<Button>());
            SetPrivateField(recallCtrl, "queryWalletButton", qWallet.GetComponent<Button>());
            SetPrivateField(recallCtrl, "answerCard", answerCard);
            SetPrivateField(recallCtrl, "answerItemTitle", ansTitle);
            SetPrivateField(recallCtrl, "answerLocationText", ansLoc);
            SetPrivateField(recallCtrl, "answerGpsConfidenceText", ansGps);
            SetPrivateField(recallCtrl, "answerTimestampText", ansTime);
            SetPrivateField(recallCtrl, "answerSpeechSummaryText", ansSummary);
            SetPrivateField(recallCtrl, "clearAnswerButton", clearAnsBtn.GetComponent<Button>());

            // 3. Recent Memories View
            GameObject memoriesView = CreateUIElement("MemoriesView", contentArea.transform, new Vector2(940, 480), Vector2.zero);
            var memoriesCtrl = memoriesView.AddComponent<RecentMemoriesCarousel>();

            // Carousel cards container
            GameObject carouselRow = CreateUIElement("CarouselCardsRow", memoriesView.transform, new Vector2(820, 290), new Vector2(0, 40));
            var hlg = carouselRow.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 20;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = false;
            hlg.childControlHeight = false;

            // Carousel pagination
            GameObject pageRow = CreateUIElement("PaginationRow", memoriesView.transform, new Vector2(400, 40), new Vector2(0, -140));
            GameObject prevBtn = CreateButton(pageRow.transform, "PrevBtn", "◀ Previous", new Vector2(110, 32), new Vector2(-130, 0), new Color(0.18f, 0.24f, 0.35f));
            Text pageText = CreateText(pageRow.transform, "Page 1 of 2", 12, FontStyle.Normal, new Color(0.7f, 0.8f, 0.9f), new Vector2(120, 24), Vector2.zero);
            GameObject nextBtn = CreateButton(pageRow.transform, "NextBtn", "Next ▶", new Vector2(110, 32), new Vector2(130, 0), new Color(0.18f, 0.24f, 0.35f));

            // Detail modal inside memories
            GameObject detailModal = CreateUIElement("DetailModal", memoriesView.transform, new Vector2(680, 360), Vector2.zero);
            Image modalBg = detailModal.AddComponent<Image>();
            modalBg.color = new Color(0.08f, 0.12f, 0.20f, 0.98f);

            Text detName = CreateText(detailModal.transform, "Item Details", 18, FontStyle.Bold, Color.white, new Vector2(620, 28), new Vector2(0, 140));
            Text detCategory = CreateText(detailModal.transform, "Category", 12, FontStyle.Normal, new Color(0.3f, 0.7f, 1f), new Vector2(620, 20), new Vector2(0, 110));
            Text detLoc = CreateText(detailModal.transform, "Location", 14, FontStyle.Normal, new Color(0.8f, 0.88f, 0.95f), new Vector2(620, 24), new Vector2(0, 75));
            Text detTime = CreateText(detailModal.transform, "Timestamp", 12, FontStyle.Normal, new Color(0.6f, 0.7f, 0.8f), new Vector2(620, 20), new Vector2(0, 45));
            Text detNotes = CreateText(detailModal.transform, "Notes", 13, FontStyle.Italic, new Color(0.85f, 0.9f, 0.95f), new Vector2(620, 30), new Vector2(0, 10));
            Text detHist = CreateText(detailModal.transform, "History", 12, FontStyle.Normal, new Color(0.7f, 0.75f, 0.85f), new Vector2(620, 70), new Vector2(0, -45));
            GameObject closeDetBtn = CreateButton(detailModal.transform, "CloseDetBtn", "← Back to Carousel [Esc]", new Vector2(230, 36), new Vector2(0, -135), new Color(0.2f, 0.28f, 0.4f));

            SetPrivateField(memoriesCtrl, "cardsContainer", carouselRow.transform);
            SetPrivateField(memoriesCtrl, "prevPageButton", prevBtn.GetComponent<Button>());
            SetPrivateField(memoriesCtrl, "nextPageButton", nextBtn.GetComponent<Button>());
            SetPrivateField(memoriesCtrl, "pageIndicatorText", pageText);
            SetPrivateField(memoriesCtrl, "detailModal", detailModal);
            SetPrivateField(memoriesCtrl, "detailItemNameText", detName);
            SetPrivateField(memoriesCtrl, "detailCategoryText", detCategory);
            SetPrivateField(memoriesCtrl, "detailLocationText", detLoc);
            SetPrivateField(memoriesCtrl, "detailTimestampText", detTime);
            SetPrivateField(memoriesCtrl, "detailNotesText", detNotes);
            SetPrivateField(memoriesCtrl, "detailHistoryText", detHist);
            SetPrivateField(memoriesCtrl, "closeDetailButton", closeDetBtn.GetComponent<Button>());

            // Status bar at bottom
            GameObject footerObj = CreateUIElement("Footer", bgObj.transform, new Vector2(940, 40), new Vector2(0, -315));
            Text statusText = CreateText(footerObj.transform, "Yaad Spatial Active · Point Gaze & Pinch to interact", 11, FontStyle.Normal, new Color(0.55f, 0.65f, 0.75f), new Vector2(900, 24), Vector2.zero);

            // Proactive Departure Reminder Toast (Phase 26A)
            GameObject depToastObj = CreateUIElement("DepartureToast", bgObj.transform, new Vector2(900, 56), new Vector2(0, 240));
            Image depToastBg = depToastObj.AddComponent<Image>();
            depToastBg.color = new Color(0.18f, 0.12f, 0.05f, 0.98f);

            Text depToastTitle = CreateText(depToastObj.transform, "🚪 Departure Reminder", 13, FontStyle.Bold, new Color(1f, 0.82f, 0.25f), new Vector2(740, 22), new Vector2(-60, 11));
            Text depToastMsg = CreateText(depToastObj.transform, "Before you leave, check your belongings.", 11, FontStyle.Normal, new Color(0.92f, 0.94f, 0.98f), new Vector2(740, 20), new Vector2(-60, -11));
            GameObject depDismissBtnObj = CreateButton(depToastObj.transform, "DepartureDismissBtn", "✕ Dismiss [Esc]", new Vector2(120, 32), new Vector2(370, 0), new Color(0.35f, 0.2f, 0.15f));
            Button depDismissBtn = depDismissBtnObj.GetComponent<Button>();
            depToastObj.SetActive(false);

            // Connect root YaadSpatialPanel
            var panel = canvasObj.AddComponent<YaadSpatialPanel>();
            SetPrivateField(panel, "rememberView", rememberView);
            SetPrivateField(panel, "recallView", recallView);
            SetPrivateField(panel, "recentMemoriesView", memoriesView);
            SetPrivateField(panel, "rememberController", rememberCtrl);
            SetPrivateField(panel, "recallController", recallCtrl);
            SetPrivateField(panel, "recentMemoriesController", memoriesCtrl);
            SetPrivateField(rememberCtrl, "recentMemoriesCarousel", memoriesCtrl);
            SetPrivateField(panel, "statusDisplayText", statusText);
            SetPrivateField(panel, "lockToggleButton", lockBtn);
            SetPrivateField(panel, "lockButtonText", lockBtnText);
            SetPrivateField(panel, "cloudModeToggleButton", cloudModeBtn);
            SetPrivateField(panel, "cloudModeButtonText", cloudModeText);
            SetPrivateField(panel, "audioToggleButton", audioBtn);
            SetPrivateField(panel, "audioButtonText", audioBtnText);
            SetPrivateField(panel, "simDepartureButton", simDepBtn);
            SetPrivateField(panel, "simDepartureButtonText", simDepBtnText);
            SetPrivateField(panel, "departureToastContainer", depToastObj);
            SetPrivateField(panel, "departureToastTitle", depToastTitle);
            SetPrivateField(panel, "departureToastMessage", depToastMsg);
            SetPrivateField(panel, "departureDismissButton", depDismissBtn);

            // Wire Tab buttons
            rememberTabBtn.GetComponent<Button>().onClick.AddListener(() => panel.SelectTab(YaadSpatialPanel.PanelTab.Remember));
            recallTabBtn.GetComponent<Button>().onClick.AddListener(() => panel.SelectTab(YaadSpatialPanel.PanelTab.Recall));
            memoriesTabBtn.GetComponent<Button>().onClick.AddListener(() => panel.SelectTab(YaadSpatialPanel.PanelTab.RecentMemories));
        }

        private GameObject CreateUIElement(string name, Transform parent, Vector2 size, Vector2 anchoredPosition)
        {
            GameObject obj = new GameObject(name, typeof(RectTransform));
            obj.transform.SetParent(parent, false);
            RectTransform rt = obj.GetComponent<RectTransform>();
            rt.sizeDelta = size;
            rt.anchoredPosition = anchoredPosition;
            return obj;
        }

        private Text CreateText(Transform parent, string content, int fontSize, FontStyle style, Color color, Vector2 size, Vector2 anchoredPosition)
        {
            GameObject obj = new GameObject("Text_" + content.Substring(0, Mathf.Min(8, content.Length)), typeof(RectTransform), typeof(Text));
            obj.transform.SetParent(parent, false);
            RectTransform rt = obj.GetComponent<RectTransform>();
            rt.sizeDelta = size;
            rt.anchoredPosition = anchoredPosition;

            Text txt = obj.GetComponent<Text>();
            txt.font = standardFont;
            txt.fontSize = fontSize;
            txt.fontStyle = style;
            txt.color = color;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.text = content;
            return txt;
        }

        private GameObject CreateButton(Transform parent, string name, string label, Vector2 size, Vector2 anchoredPosition, Color normalColor)
        {
            GameObject btnObj = new GameObject(name, typeof(RectTransform), typeof(Image), typeof(Button));
            btnObj.transform.SetParent(parent, false);

            RectTransform rt = btnObj.GetComponent<RectTransform>();
            rt.sizeDelta = size;
            rt.anchoredPosition = anchoredPosition;

            Image img = btnObj.GetComponent<Image>();
            img.color = normalColor;

            Button btn = btnObj.GetComponent<Button>();
            ColorBlock cb = btn.colors;
            cb.normalColor = normalColor;
            cb.highlightedColor = normalColor * 1.25f;
            cb.pressedColor = normalColor * 0.8f;
            btn.colors = cb;

            GameObject textObj = new GameObject("Label", typeof(RectTransform), typeof(Text));
            textObj.transform.SetParent(btnObj.transform, false);
            RectTransform textRt = textObj.GetComponent<RectTransform>();
            textRt.sizeDelta = size;
            textRt.anchoredPosition = Vector2.zero;

            Text txt = textObj.GetComponent<Text>();
            txt.font = standardFont;
            txt.fontSize = 13;
            txt.fontStyle = FontStyle.Bold;
            txt.color = Color.white;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.text = label;

            return btnObj;
        }

        private static void SetPrivateField(object target, string fieldName, object value)
        {
            if (target == null) return;
            Type type = target.GetType();
            FieldInfo field = type.GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            if (field != null)
            {
                field.SetValue(target, value);
            }
        }
    }
}
