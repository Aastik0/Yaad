using System;
using UnityEngine;
using UnityEngine.UI;
using Yaad.Spatial.Models;
using Yaad.Spatial.Services;

namespace Yaad.Spatial
{
    /// <summary>
    /// RecallPanelController
    /// Coordinates spatial memory queries by delegating to YaadApiClient.QueryRecall (/api/recall).
    /// Provides grounded "last recorded" location cards and enforces the strict "no hallucination" rule.
    /// </summary>
    public class RecallPanelController : MonoBehaviour
    {
        [Header("Query Input")]
        [SerializeField] private InputField queryInputField;
        [SerializeField] private Button submitQueryButton;
        [SerializeField] private Button queryKeysButton;
        [SerializeField] private Button queryGlassesButton;
        [SerializeField] private Button queryWalletButton;

        [Header("Answer Display")]
        [SerializeField] private GameObject answerCard;
        [SerializeField] private Text answerItemTitle;
        [SerializeField] private Text answerLocationText;
        [SerializeField] private Text answerGpsConfidenceText;
        [SerializeField] private Text answerTimestampText;
        [SerializeField] private Text answerSpeechSummaryText;
        [SerializeField] private Button clearAnswerButton;

        private bool isSearching = false;

        private void Start()
        {
            if (submitQueryButton != null) submitQueryButton.onClick.AddListener(() => ExecuteQuery(queryInputField != null ? queryInputField.text : ""));
            if (queryKeysButton != null) queryKeysButton.onClick.AddListener(() => ExecuteQuery("keys"));
            if (queryGlassesButton != null) queryGlassesButton.onClick.AddListener(() => ExecuteQuery("glasses"));
            if (queryWalletButton != null) queryWalletButton.onClick.AddListener(() => ExecuteQuery("wallet"));
            if (clearAnswerButton != null) clearAnswerButton.onClick.AddListener(ClearAnswer);

            if (answerCard != null) answerCard.SetActive(false);
        }

        private void OnDestroy()
        {
            if (submitQueryButton != null) submitQueryButton.onClick.RemoveAllListeners();
            if (queryKeysButton != null) queryKeysButton.onClick.RemoveAllListeners();
            if (queryGlassesButton != null) queryGlassesButton.onClick.RemoveAllListeners();
            if (queryWalletButton != null) queryWalletButton.onClick.RemoveAllListeners();
            if (clearAnswerButton != null) clearAnswerButton.onClick.RemoveAllListeners();
        }

        public void ExecuteQuery(string rawQuery)
        {
            if (string.IsNullOrWhiteSpace(rawQuery) || isSearching) return;

            string query = rawQuery.Trim();
            if (queryInputField != null) queryInputField.text = query;

            // Phase 25B.4 Deterministic Voice Intent Classification
            var intent = SpatialVoiceIntentRouter.ParseIntent(query);

            switch (intent.type)
            {
                case SpatialVoiceIntentType.Cancel:
                    if (SpatialSpeechService.Instance != null)
                    {
                        SpatialSpeechService.Instance.StopSpeech();
                    }
                    if (SpatialGuidanceService.Instance != null)
                    {
                        SpatialGuidanceService.Instance.CancelGuidance();
                    }
                    if (SpatialDepartureService.Instance != null)
                    {
                        SpatialDepartureService.Instance.DismissReminder();
                    }
                    ClearAnswer();
                    if (YaadSpatialPanel.Instance != null)
                    {
                        YaadSpatialPanel.Instance.UpdateStatus("Action: Cancelled.");
                    }
                    return;

                case SpatialVoiceIntentType.RecentMemories:
                    if (SpatialSpeechService.Instance != null)
                    {
                        SpatialSpeechService.Instance.SpeakRecentMemoriesPrompt();
                    }
                    ClearAnswer();
                    if (YaadSpatialPanel.Instance != null)
                    {
                        YaadSpatialPanel.Instance.SelectTab(YaadSpatialPanel.PanelTab.RecentMemories);
                    }
                    return;

                case SpatialVoiceIntentType.Remember:
                    if (SpatialSpeechService.Instance != null)
                    {
                        SpatialSpeechService.Instance.SpeakRememberPrompt();
                    }
                    ClearAnswer();
                    if (YaadSpatialPanel.Instance != null)
                    {
                        YaadSpatialPanel.Instance.SelectTab(YaadSpatialPanel.PanelTab.Remember);
                        YaadSpatialPanel.Instance.TriggerSimulatedCapture();
                    }
                    return;

                case SpatialVoiceIntentType.Unknown:
                    if (SpatialAudioService.Instance != null)
                    {
                        SpatialAudioService.Instance.PlayAlert();
                    }
                    if (SpatialSpeechService.Instance != null)
                    {
                        SpatialSpeechService.Instance.SpeakUnknownIntent();
                    }
                    RenderUnknownIntent(query);
                    return;

                case SpatialVoiceIntentType.Recall:
                default:
                    string itemToSearch = !string.IsNullOrEmpty(intent.targetItem) ? intent.targetItem : query;
                    PerformRecallSearch(itemToSearch);
                    break;
            }
        }

        private void PerformRecallSearch(string query)
        {
            isSearching = true;

            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlayProcessing();
            }

            if (answerCard != null) answerCard.SetActive(true);
            if (answerItemTitle != null) answerItemTitle.text = "Searching Memory...";
            if (answerLocationText != null) answerLocationText.text = $"Querying Yaad for: \"{query}\"...";
            if (answerGpsConfidenceText != null) answerGpsConfidenceText.text = "";

            bool isCloud = YaadApiClient.Instance != null && YaadApiClient.Instance.IsCloudMode;
            bool isAuth = YaadApiClient.Instance != null && YaadApiClient.Instance.IsAuthenticated;
            if (answerTimestampText != null)
            {
                answerTimestampText.text = isCloud
                    ? (isAuth ? "Mode: Authenticated Cloud" : "Mode: Cloud (Unauthenticated)")
                    : "Mode: Offline Demo Mode";
            }
            if (answerSpeechSummaryText != null) answerSpeechSummaryText.text = "";

            if (YaadApiClient.Instance != null)
            {
                YaadApiClient.Instance.QueryRecall(query, (success, result, error) =>
                {
                    isSearching = false;

                    if (success && result != null)
                    {
                        RenderRecallResult(result);
                    }
                    else
                    {
                        RenderError(query, error ?? "Unknown recall error occurred.");
                    }
                });
            }
            else
            {
                isSearching = false;
                RenderError(query, "YaadApiClient instance is not available.");
            }
        }

        private void RenderRecallResult(SpatialRecallResult result)
        {
            if (answerCard != null) answerCard.SetActive(true);

            if (result.found)
            {
                if (SpatialAudioService.Instance != null)
                {
                    SpatialAudioService.Instance.PlaySuccess();
                }

                // Phase 26A: Activate contextual spatial guidance beacon
                if (SpatialGuidanceService.Instance != null)
                {
                    SpatialGuidanceService.Instance.ActivateGuidance(result);
                }

                // Calm, dementia-friendly spoken reminder
                if (SpatialSpeechService.Instance != null)
                {
                    SpatialSpeechService.Instance.SpeakRecallResult(result.itemName, result.lastRecordedLocation);
                }

                if (answerItemTitle != null) answerItemTitle.text = $"Found: {result.itemName}";
                if (answerLocationText != null) answerLocationText.text = $"📍 Location: {result.lastRecordedLocation}";

                // Format truthful GPS Confidence Badge matching web tier classification
                string gpsBadge = FormatGpsConfidenceBadge(result);
                if (answerGpsConfidenceText != null)
                {
                    answerGpsConfidenceText.text = gpsBadge;
                }
                else if (answerLocationText != null)
                {
                    answerLocationText.text += $"\n{gpsBadge}";
                }

                if (answerTimestampText != null)
                {
                    string modeTag = result.isCloud ? "Cloud Sighting" : "Historical Sighting";
                    answerTimestampText.text = $"🕒 Last Recorded: {FormatTimestamp(result.lastRecordedTimestamp)} ({modeTag})";
                }

                if (answerSpeechSummaryText != null)
                {
                    string body = "";
                    if (result.landmarks != null && result.landmarks.Length > 0)
                    {
                        body += $"🏷 Nearby Landmarks: {string.Join(", ", result.landmarks)}\n";
                    }
                    if (!string.IsNullOrEmpty(result.visualDescription))
                    {
                        body += $"👁 Visual Description: {result.visualDescription}\n\n";
                    }
                    body += $"💬 \"{result.speechSummary}\"";

                    string disclaimer = !string.IsNullOrEmpty(result.disclaimer)
                        ? result.disclaimer
                        : "Last recorded historical sighting only; not real-time tracking.";
                    body += $"\n\n<color=#88A0B8><i>{disclaimer}</i></color>";
                    answerSpeechSummaryText.text = body;
                }
            }
            else
            {
                // Phase 26A: Clear guidance beacon on ungrounded/missing items
                if (SpatialGuidanceService.Instance != null)
                {
                    SpatialGuidanceService.Instance.ClearGuidance();
                }

                if (SpatialSpeechService.Instance != null)
                {
                    SpatialSpeechService.Instance.SpeakRecallResult(result.query, null);
                }

                if (answerItemTitle != null) answerItemTitle.text = "No Record Found";
                if (answerLocationText != null) answerLocationText.text = $"No sighting recorded for: \"{result.query}\"";
                if (answerGpsConfidenceText != null) answerGpsConfidenceText.text = "<color=#94A3B8>Status: No coordinates recorded</color>";
                if (answerTimestampText != null) answerTimestampText.text = "Status: Grounded Memory Checked";
                if (answerSpeechSummaryText != null)
                {
                    answerSpeechSummaryText.text = "Yaad records historical sightings only and never guesses present whereabouts.\n\nTry searching for another item or capture it in the Remember tab.";
                }
            }
        }

        private void RenderUnknownIntent(string query)
        {
            if (answerCard != null) answerCard.SetActive(true);
            if (answerItemTitle != null) answerItemTitle.text = "Command Not Recognized";
            if (answerLocationText != null) answerLocationText.text = $"\"{query}\"";
            if (answerGpsConfidenceText != null) answerGpsConfidenceText.text = "<color=#94A3B8>Voice Assistant Guidance</color>";
            if (answerTimestampText != null) answerTimestampText.text = "Status: Awaiting Clarification";
            if (answerSpeechSummaryText != null)
            {
                answerSpeechSummaryText.text = "Yaad didn't recognize that command.\n\nTry asking:\n• \"Where are my keys?\"\n• \"Remember my items\"\n• \"Show my memories\"";
            }
        }

        private string FormatGpsConfidenceBadge(SpatialRecallResult result)
        {
            switch (result.locationTier)
            {
                case GpsAccuracyTier.Target:
                case GpsAccuracyTier.Acceptable:
                    // High Precision (<=30m): show recorded coordinates to 6 decimals + actual measured accuracy
                    string latStr = result.coordinates.latitude >= 0 ? $"{result.coordinates.latitude:F6}° N" : $"{-result.coordinates.latitude:F6}° S";
                    string lonStr = result.coordinates.longitude >= 0 ? $"{result.coordinates.longitude:F6}° E" : $"{-result.coordinates.longitude:F6}° W";
                    string tierName = result.locationTier == GpsAccuracyTier.Target ? "Excellent" : "High Precision";
                    return $"<color=#4ADE80>📍 Recorded GPS [{tierName}]: {latStr}, {lonStr} (±{result.accuracyMeters:F0}m)</color>";

                case GpsAccuracyTier.Uncertain:
                    // Uncertain (31-80m or missing accuracy with valid coordinates)
                    if (result.hasGps && result.hasAccuracy)
                    {
                        return $"<color=#FBBF24>⚠ Uncertain GPS (±{result.accuracyMeters:F0}m): Coarse area only. Visual landmarks prioritized.</color>";
                    }
                    else
                    {
                        return "<color=#FBBF24>⚠ Uncertain GPS: Accuracy unverified. Visual landmarks prioritized.</color>";
                    }

                case GpsAccuracyTier.Unusable:
                    // Unusable (>80m): suppress navigation, emphasize visual description
                    return $"<color=#FB923C>🚫 Low GPS Accuracy (±{result.accuracyMeters:F0}m): Unusable for navigation. Rely on visual description.</color>";

                case GpsAccuracyTier.Unavailable:
                default:
                    // Missing / invalid / (0,0) / null
                    return "<color=#94A3B8>📍 Indoor Landmark Grounded (No GPS recorded)</color>";
            }
        }

        private void RenderError(string query, string error)
        {
            if (answerCard != null) answerCard.SetActive(true);
            if (answerItemTitle != null) answerItemTitle.text = "Recall Failed";
            if (answerLocationText != null) answerLocationText.text = $"Unable to retrieve memory for \"{query}\"";
            if (answerGpsConfidenceText != null) answerGpsConfidenceText.text = "";
            if (answerTimestampText != null) answerTimestampText.text = "Status: Communication Error";
            if (answerSpeechSummaryText != null)
            {
                answerSpeechSummaryText.text = $"<color=#FF7B7B>{error}</color>\n\nEnsure local Next.js server is running at http://localhost:3000 or press [M] to switch to Demo Mode.";
            }
        }

        private string FormatTimestamp(string isoTimestamp)
        {
            if (string.IsNullOrEmpty(isoTimestamp)) return "Recent";
            if (DateTime.TryParse(isoTimestamp, out DateTime dt))
            {
                return dt.ToLocalTime().ToString("MMM d, yyyy 'at' h:mm tt");
            }
            return isoTimestamp;
        }

        public void ClearAnswer()
        {
            if (answerCard != null) answerCard.SetActive(false);
            if (queryInputField != null) queryInputField.text = "";
            if (SpatialSpeechService.Instance != null)
            {
                SpatialSpeechService.Instance.StopSpeech();
            }
            if (SpatialGuidanceService.Instance != null)
            {
                SpatialGuidanceService.Instance.DismissGuidance();
            }
            isSearching = false;
        }
    }
}
