using System;
using System.Diagnostics;
using UnityEngine;

namespace Yaad.Spatial.Services
{
    /// <summary>
    /// SpatialSpeechService
    /// Centralized, dementia-friendly speech synthesis coordinator for Yaad Spatial XR.
    /// Provides calm, non-intrusive spoken memory reminders with strict single-utterance queueing,
    /// instantaneous cancellation, and zero live cloud credit consumption.
    /// 
    /// Accessibility & Dementia-Friendly Principles:
    /// 1. Short, plain-language prompts: one clear instruction at a time.
    /// 2. Calm, measured cadence (~0.95x standard rate).
    /// 3. Memory Safety: explicitly communicates historical sightings, not real-time tracking.
    /// 4. Zero technical jargon: never speaks raw GPS numbers, accuracy radii, or status flags.
    /// 5. User Agency: respects master mute and cancels instantly upon user interruption.
    /// </summary>
    public class SpatialSpeechService : MonoBehaviour
    {
        public static SpatialSpeechService Instance { get; private set; }

        [Header("Speech Settings")]
        [SerializeField] private bool speechEnabled = true;
        [Range(120, 220)]
        [SerializeField] private int speechRateWordsPerMin = 165; // Calm, measured cadence

        private Process activeSpeechProcess = null;
        private string currentSpokenText = null;

        public bool IsSpeaking => activeSpeechProcess != null && !activeSpeechProcess.HasExited;
        public string LastSpokenText => currentSpokenText;

        public event Action<string> OnSpeechStarted;
        public event Action OnSpeechFinished;

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
        }

        private void OnDestroy()
        {
            StopSpeech();
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// Stops any ongoing or pending speech synthesis immediately.
        /// </summary>
        public void StopSpeech()
        {
            if (activeSpeechProcess != null)
            {
                try
                {
                    if (!activeSpeechProcess.HasExited)
                    {
                        activeSpeechProcess.Kill();
                    }
                }
                catch { }
                finally
                {
                    activeSpeechProcess.Dispose();
                    activeSpeechProcess = null;
                }
            }
            currentSpokenText = null;
            OnSpeechFinished?.Invoke();
        }

        /// <summary>
        /// Delivers a calm spoken utterance with single-utterance queueing (interrupts prior speech).
        /// </summary>
        public bool SpeakCalmReminder(string text)
        {
            if (!speechEnabled || string.IsNullOrWhiteSpace(text)) return false;

            // Respect master mute from SpatialAudioService
            if (SpatialAudioService.Instance != null && SpatialAudioService.Instance.IsMuted)
            {
                UnityEngine.Debug.Log("[SpatialSpeechService] Speech suppressed (Audio Muted)");
                return false;
            }

            // Interrupt any previous utterance immediately
            StopSpeech();

            currentSpokenText = text.Trim();
            UnityEngine.Debug.Log($"[SpatialSpeechService] Spoken: \"{currentSpokenText}\"");
            OnSpeechStarted?.Invoke(currentSpokenText);

            // Execute local offline speech synthesis on macOS / Desktop simulator
            #if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX
            try
            {
                string escaped = currentSpokenText.Replace("\"", "\\\"");
                var startInfo = new ProcessStartInfo
                {
                    FileName = "/usr/bin/say",
                    Arguments = $"-r {speechRateWordsPerMin} \"{escaped}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                activeSpeechProcess = Process.Start(startInfo);
                return true;
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogWarning($"[SpatialSpeechService] Native speech exception: {ex.Message}");
                return false;
            }
            #else
            // On non-macOS platforms or mobile, log and trigger acoustic cue
            if (SpatialAudioService.Instance != null)
            {
                SpatialAudioService.Instance.PlaySuccess();
            }
            return true;
            #endif
        }

        /// <summary>
        /// Formats and speaks a truthful, concise recall result adhering to dementia-friendly guidelines.
        /// </summary>
        public bool SpeakRecallResult(string itemName, string locationDescription)
        {
            if (!string.IsNullOrWhiteSpace(locationDescription))
            {
                // Concise, calm phrasing with explicit historical disclaimer
                string cleanLocation = locationDescription.Trim();
                if (cleanLocation.StartsWith("On ", StringComparison.OrdinalIgnoreCase) ||
                    cleanLocation.StartsWith("In ", StringComparison.OrdinalIgnoreCase) ||
                    cleanLocation.StartsWith("Near ", StringComparison.OrdinalIgnoreCase) ||
                    cleanLocation.StartsWith("At ", StringComparison.OrdinalIgnoreCase))
                {
                    return SpeakCalmReminder($"Your {itemName} was last recorded {cleanLocation}. This was a past sighting.");
                }
                return SpeakCalmReminder($"Your {itemName} was last recorded at {cleanLocation}. This was a past sighting.");
            }

            return SpeakCalmReminder($"No sighting recorded for {itemName}. Yaad records past sightings only.");
        }

        /// <summary>
        /// Spoken prompt when Remember mode is triggered.
        /// </summary>
        public bool SpeakRememberPrompt()
        {
            return SpeakCalmReminder("Opening camera to remember your belongings.");
        }

        /// <summary>
        /// Spoken prompt when Recent Memories mode is triggered.
        /// </summary>
        public bool SpeakRecentMemoriesPrompt()
        {
            return SpeakCalmReminder("Showing your recent memories carousel.");
        }

        /// <summary>
        /// Spoken prompt when an unrecognized voice command is received.
        /// </summary>
        public bool SpeakUnknownIntent()
        {
            return SpeakCalmReminder("I didn't quite catch that. You can say 'Where are my keys?' or 'Remember my items'.");
        }
    }
}
