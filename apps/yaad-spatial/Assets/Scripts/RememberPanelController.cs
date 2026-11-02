using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// RememberPanelController
    /// Coordinates the simulated camera/viewfinder experience in Yaad Spatial.
    /// Emulates glasses capture, calls YaadApiClient.AnalyzeFrame, and requires
    /// explicit user confirmation before saving via YaadApiClient.ConfirmCandidate.
    /// </summary>
    public class RememberPanelController : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private GameObject viewfinderContainer;
        [SerializeField] private Text viewfinderStatusText;
        [SerializeField] private Button captureButton;
        [SerializeField] private GameObject candidateCardContainer;
        [SerializeField] private Text candidateNameText;
        [SerializeField] private Text candidateLocationText;
        [SerializeField] private Text candidateConfidenceText;
        [SerializeField] private Button confirmButton;
        [SerializeField] private Button discardButton;
        [SerializeField] private Text rememberFeedbackText;

        [Header("Real Camera Service")]
        [SerializeField] private RawImage cameraPreviewImage;
        [SerializeField] private Text captureButtonLabel;

        [Header("Callbacks")]
        [SerializeField] private RecentMemoriesCarousel recentMemoriesCarousel;
        public Action<SpatialTrackedItem> OnItemConfirmed;

        private SpatialDetectedCandidate currentActiveCandidate = null;
        private bool isAnalyzing = false;
        private bool isSaving = false;

        private WebCamTexture activeWebCam = null;
        private bool isRealWebcamActive = false;
        private string activeCameraDeviceName = null;

        private void Start()
        {
            if (captureButton != null) captureButton.onClick.AddListener(TriggerSimulatedCapture);
            if (confirmButton != null) confirmButton.onClick.AddListener(ConfirmCurrentCandidate);
            if (discardButton != null) discardButton.onClick.AddListener(DiscardCurrentCandidate);

            InitializeCamera();
            ResetView();
        }

        private void OnEnable()
        {
            if (activeWebCam != null && !activeWebCam.isPlaying)
            {
                activeWebCam.Play();
            }
        }

        private void OnDisable()
        {
            if (activeWebCam != null && activeWebCam.isPlaying)
            {
                activeWebCam.Stop();
            }
        }

        private void OnDestroy()
        {
            if (captureButton != null) captureButton.onClick.RemoveListener(TriggerSimulatedCapture);
            if (confirmButton != null) confirmButton.onClick.RemoveListener(ConfirmCurrentCandidate);
            if (discardButton != null) discardButton.onClick.RemoveListener(DiscardCurrentCandidate);

            ReleaseCamera();
        }

        public void InitializeCamera()
        {
            try
            {
                WebCamDevice[] devices = WebCamTexture.devices;
                if (devices != null && devices.Length > 0)
                {
                    activeCameraDeviceName = devices[0].name;
                    activeWebCam = new WebCamTexture(activeCameraDeviceName, 640, 480, 15);
                    activeWebCam.Play();
                    isRealWebcamActive = true;

                    if (cameraPreviewImage != null)
                    {
                        cameraPreviewImage.texture = activeWebCam;
                        cameraPreviewImage.gameObject.SetActive(true);
                    }
                    if (captureButtonLabel != null)
                    {
                        captureButtonLabel.text = "📷 Snap Real Photo [C / Space]";
                    }
                    Debug.Log($"[RememberPanel] WebCamTexture initialized with device: '{activeCameraDeviceName}'");
                }
                else
                {
                    SetSyntheticFallbackMode("No physical camera devices detected.");
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[RememberPanel] Camera init exception: {ex.Message}. Falling back to synthetic capture.");
                SetSyntheticFallbackMode(ex.Message);
            }
        }

        private void SetSyntheticFallbackMode(string reason)
        {
            isRealWebcamActive = false;
            if (cameraPreviewImage != null)
            {
                cameraPreviewImage.gameObject.SetActive(false);
            }
            if (captureButtonLabel != null)
            {
                captureButtonLabel.text = "📷 Simulate Glasses Capture [C / Space]";
            }
            Debug.Log($"[RememberPanel] Operating in Synthetic Fallback mode: {reason}");
        }

        private void ReleaseCamera()
        {
            if (activeWebCam != null)
            {
                if (activeWebCam.isPlaying)
                {
                    activeWebCam.Stop();
                }
                Destroy(activeWebCam);
                activeWebCam = null;
            }
            isRealWebcamActive = false;
        }

        public void ResetView()
        {
            if (candidateCardContainer != null) candidateCardContainer.SetActive(false);
            if (viewfinderStatusText != null)
            {
                viewfinderStatusText.text = isRealWebcamActive
                    ? $"Live Camera: {activeCameraDeviceName} (macOS Dev Feed) · Point Gaze & Snap"
                    : "Simulated Glasses POV (Synthetic Fallback Mode · No Hardware Camera)";
            }
            if (rememberFeedbackText != null)
            {
                rememberFeedbackText.text = isRealWebcamActive
                    ? "Point gaze at belongings and press Snap to capture actual camera frame."
                    : "Point gaze and pinch 'Simulate Glasses Capture' to scan current scene.";
            }
            currentActiveCandidate = null;
            isAnalyzing = false;
            isSaving = false;
        }

        public void TriggerSimulatedCapture()
        {
            // Debounce / duplicate prevention
            if (isAnalyzing || isSaving)
            {
                Debug.Log("[RememberPanel] Capture ignored: analysis or save currently in progress.");
                return;
            }

            isAnalyzing = true;
            if (rememberFeedbackText != null)
            {
                rememberFeedbackText.text = isRealWebcamActive
                    ? "Capturing frame from live camera & analyzing via Yaad Vision API..."
                    : "Scanning simulated POV scene via Yaad Vision API...";
            }

            // Determine frame payload: Real camera frame or synthetic fallback
            string framePayload;
            if (isRealWebcamActive && activeWebCam != null && activeWebCam.isPlaying)
            {
                try
                {
                    Texture2D snap = new Texture2D(activeWebCam.width, activeWebCam.height, TextureFormat.RGB24, false);
                    snap.SetPixels(activeWebCam.GetPixels());
                    snap.Apply();
                    byte[] jpgBytes = snap.EncodeToJPG(75);
                    Destroy(snap);
                    framePayload = "data:image/jpeg;base64," + Convert.ToBase64String(jpgBytes);
                    Debug.Log($"[RememberPanel] Captured genuine camera frame ({activeWebCam.width}x{activeWebCam.height}, {jpgBytes.Length} bytes)");
                }
                catch (Exception snapEx)
                {
                    Debug.LogWarning($"[RememberPanel] Frame capture exception: {snapEx.Message}. Using synthetic fallback.");
                    framePayload = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
                }
            }
            else
            {
                framePayload = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            }

            if (YaadApiClient.Instance != null)
            {
                YaadApiClient.Instance.AnalyzeFrame(framePayload, "", (success, candidates, error) =>
                {
                    isAnalyzing = false;

                    if (success && candidates != null && candidates.Count > 0)
                    {
                        currentActiveCandidate = candidates[0];
                        DisplayActiveCandidate(currentActiveCandidate);
                    }
                    else
                    {
                        Debug.LogWarning($"[RememberPanel] Analysis error: {error}");
                        currentActiveCandidate = null;
                        if (candidateCardContainer != null) candidateCardContainer.SetActive(false);
                        if (rememberFeedbackText != null)
                        {
                            rememberFeedbackText.text = $"Unable to analyze this frame. Check your connection and try again. ({error ?? "No items detected"})";
                        }
                    }
                });
            }
            else
            {
                isAnalyzing = false;
                currentActiveCandidate = null;
                if (candidateCardContainer != null) candidateCardContainer.SetActive(false);
                if (rememberFeedbackText != null)
                {
                    rememberFeedbackText.text = "Unable to analyze this frame. Check your connection and try again.";
                }
            }
        }

        private void DisplayActiveCandidate(SpatialDetectedCandidate candidate)
        {
            if (candidate == null) return;

            if (candidateCardContainer != null) candidateCardContainer.SetActive(true);
            if (candidateNameText != null) candidateNameText.text = candidate.name;
            if (candidateLocationText != null) candidateLocationText.text = $"Detected at: {candidate.detectedLocation}";
            if (candidateConfidenceText != null)
            {
                candidateConfidenceText.text = $"Confidence: {(int)(candidate.confidence * 100)}% (Verified Grounded)";
            }

            if (rememberFeedbackText != null)
            {
                rememberFeedbackText.text = "Candidate detected! Confirm to save to memory, or discard.";
            }

            Debug.Log($"[RememberPanel] Candidate ready for confirmation: {candidate.name}");
        }

        public void ConfirmCurrentCandidate()
        {
            if (currentActiveCandidate == null || isSaving) return;

            isSaving = true;
            if (rememberFeedbackText != null)
            {
                rememberFeedbackText.text = "Persisting confirmed item to backend repository...";
            }

            if (YaadApiClient.Instance != null)
            {
                YaadApiClient.Instance.ConfirmCandidate(currentActiveCandidate, (success, savedItem, error) =>
                {
                    isSaving = false;

                    if (success && savedItem != null)
                    {
                        if (SpatialAudioService.Instance != null)
                        {
                            SpatialAudioService.Instance.PlaySuccess();
                        }

                        OnItemConfirmed?.Invoke(savedItem);
                        if (recentMemoriesCarousel != null)
                        {
                            recentMemoriesCarousel.RefreshItems();
                        }

                        if (rememberFeedbackText != null)
                        {
                            rememberFeedbackText.text = $"✓ Confirmed! '{savedItem.name}' saved to Yaad memory.";
                        }
                        if (candidateCardContainer != null) candidateCardContainer.SetActive(false);
                        currentActiveCandidate = null;
                    }
                    else
                    {
                        if (SpatialAudioService.Instance != null)
                        {
                            SpatialAudioService.Instance.PlayAlert();
                        }

                        Debug.LogWarning($"[RememberPanel] Confirm error: {error}");
                        if (rememberFeedbackText != null)
                        {
                            rememberFeedbackText.text = $"Failed to save item: {error ?? "Network error"}. Please try again.";
                        }
                    }
                });
            }
            else
            {
                isSaving = false;
                if (SpatialAudioService.Instance != null)
                {
                    SpatialAudioService.Instance.PlayAlert();
                }

                if (rememberFeedbackText != null)
                {
                    rememberFeedbackText.text = "Failed to save item: API service is unavailable.";
                }
            }
        }

        public void DiscardCurrentCandidate()
        {
            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlayDiscard();
            }

            if (currentActiveCandidate != null)
            {
                Debug.Log($"[RememberPanel] Candidate discarded without database persistence: {currentActiveCandidate.name}");
            }

            if (rememberFeedbackText != null)
            {
                rememberFeedbackText.text = "Candidate discarded. Unconfirmed items are never saved.";
            }

            if (candidateCardContainer != null) candidateCardContainer.SetActive(false);
            currentActiveCandidate = null;
            isSaving = false;
        }
    }
}
