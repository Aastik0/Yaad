using System;
using UnityEngine;

namespace Yaad.Spatial.Services
{
    /// <summary>
    /// SpatialAudioService
    /// Procedural spatial audio synthesizer for Yaad Spatial UI.
    /// Synthesizes subtle, non-intrusive UI feedback chimes in memory with zero external assets.
    /// Includes master mute toggle, volume limits, and hover debouncing.
    /// </summary>
    public class SpatialAudioService : MonoBehaviour
    {
        public static SpatialAudioService Instance { get; private set; }

        [Header("Audio Settings")]
        [Range(0f, 1f)]
        [SerializeField] private float masterVolume = 0.35f;
        [SerializeField] private bool isMuted = false;

        private AudioSource audioSource;
        private AudioClip hoverClip;
        private AudioClip clickClip;
        private AudioClip successClip;
        private AudioClip discardClip;
        private AudioClip tabSwitchClip;
        private AudioClip alertClip;
        private AudioClip listeningStartClip;
        private AudioClip listeningStopClip;
        private AudioClip processingClip;

        private float lastHoverSoundTime = 0f;
        private const float MinHoverInterval = 0.08f;

        public bool IsMuted => isMuted;

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

            if (audioSource == null)
            {
                audioSource = GetComponent<AudioSource>();
                if (audioSource == null)
                {
                    audioSource = gameObject.AddComponent<AudioSource>();
                }
            }

            audioSource.playOnAwake = false;
            audioSource.spatialBlend = 0.3f; // subtle spatial spread
            audioSource.volume = masterVolume;

            if (hoverClip == null)
            {
                SynthesizeAudioClips();
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void SetMuted(bool mute)
        {
            isMuted = mute;
            if (isMuted)
            {
                StopAllAudio();
            }
            Debug.Log($"[SpatialAudioService] Audio {(isMuted ? "MUTED" : "UNMUTED")}");
        }

        public void ToggleAudio()
        {
            SetMuted(!isMuted);
        }

        public void StopAllAudio()
        {
            if (audioSource != null)
            {
                audioSource.Stop();
            }
            if (SpatialSpeechService.Instance != null)
            {
                SpatialSpeechService.Instance.StopSpeech();
            }
        }

        #region Playback Methods

        public void PlayHover()
        {
            if (isMuted || Time.unscaledTime - lastHoverSoundTime < MinHoverInterval) return;
            lastHoverSoundTime = Time.unscaledTime;
            PlayClip(hoverClip, 0.4f);
        }

        public void PlayClick()
        {
            if (isMuted) return;
            PlayClip(clickClip, 0.7f);
        }

        public void PlaySuccess()
        {
            if (isMuted) return;
            PlayClip(successClip, 0.85f);
        }

        public void PlayDiscard()
        {
            if (isMuted) return;
            PlayClip(discardClip, 0.5f);
        }

        public void PlayTabSwitch()
        {
            if (isMuted) return;
            PlayClip(tabSwitchClip, 0.6f);
        }

        public void PlayAlert()
        {
            if (isMuted) return;
            PlayClip(alertClip, 0.75f);
        }

        public void PlayListeningStart()
        {
            if (isMuted) return;
            PlayClip(listeningStartClip, 0.65f);
        }

        public void PlayListeningStop()
        {
            if (isMuted) return;
            PlayClip(listeningStopClip, 0.55f);
        }

        public void PlayProcessing()
        {
            if (isMuted) return;
            PlayClip(processingClip, 0.5f);
        }

        public void PlayClipAtPoint(AudioClip clip, Vector3 position, float relativeVolume = 1f)
        {
            if (isMuted || clip == null) return;
            AudioSource.PlayClipAtPoint(clip, position, masterVolume * relativeVolume);
        }

        private void PlayClip(AudioClip clip, float relativeVolume)
        {
            if (clip != null && audioSource != null)
            {
                audioSource.PlayOneShot(clip, masterVolume * relativeVolume);
            }
        }

        #endregion

        #region Procedural Audio Synthesis

        private void SynthesizeAudioClips()
        {
            const int sampleRate = 44100;

            // 1. Hover Tick: Extremely soft 45ms sine blip at 480Hz with exponential decay
            hoverClip = CreateTone(sampleRate, 0.045f, (t, dur) =>
            {
                float envelope = Mathf.Exp(-t * 85f);
                return Mathf.Sin(2 * Mathf.PI * 480f * t) * envelope * 0.3f;
            });

            // 2. Click / Pinch: Crisp 60ms click at 720Hz with fast attack and warm decay
            clickClip = CreateTone(sampleRate, 0.06f, (t, dur) =>
            {
                float envelope = Mathf.Exp(-t * 50f);
                return Mathf.Sin(2 * Mathf.PI * 720f * t) * envelope * 0.5f;
            });

            // 3. Success Chime: 320ms gentle ascending triad (C5 -> E5 -> G5)
            successClip = CreateTone(sampleRate, 0.32f, (t, dur) =>
            {
                float freq = t < 0.10f ? 523.25f : t < 0.20f ? 659.25f : 783.99f;
                float envelope = (1f - (t / dur)) * Mathf.Exp(-t * 4f);
                float harmonic = 0.7f * Mathf.Sin(2 * Mathf.PI * freq * t) + 0.3f * Mathf.Sin(4 * Mathf.PI * freq * t);
                return harmonic * envelope * 0.55f;
            });

            // 4. Discard: Quiet neutral 70ms thud at 310Hz
            discardClip = CreateTone(sampleRate, 0.07f, (t, dur) =>
            {
                float envelope = Mathf.Exp(-t * 45f);
                return Mathf.Sin(2 * Mathf.PI * 310f * t) * envelope * 0.4f;
            });

            // 5. Tab Switch: 75ms airy transition tone at 560Hz -> 640Hz pitch bend
            tabSwitchClip = CreateTone(sampleRate, 0.075f, (t, dur) =>
            {
                float freq = Mathf.Lerp(560f, 640f, t / dur);
                float envelope = Mathf.Sin(Mathf.PI * (t / dur));
                return Mathf.Sin(2 * Mathf.PI * freq * t) * envelope * 0.45f;
            });

            // 6. Alert: Low-key restrained alert (two soft pulses at 290Hz)
            alertClip = CreateTone(sampleRate, 0.16f, (t, dur) =>
            {
                float pulse = (t < 0.07f || t > 0.09f) ? 1f : 0f;
                float envelope = Mathf.Exp(-(t % 0.08f) * 40f) * pulse;
                return Mathf.Sin(2 * Mathf.PI * 290f * t) * envelope * 0.5f;
            });

            // 7. Listening Start: Soft, friendly 70ms chime ascending 480Hz -> 540Hz
            listeningStartClip = CreateTone(sampleRate, 0.07f, (t, dur) =>
            {
                float freq = Mathf.Lerp(480f, 540f, t / dur);
                float envelope = Mathf.Sin(Mathf.PI * (t / dur));
                return Mathf.Sin(2 * Mathf.PI * freq * t) * envelope * 0.4f;
            });

            // 8. Listening Stop: Soft gentle 70ms chime descending 540Hz -> 440Hz
            listeningStopClip = CreateTone(sampleRate, 0.07f, (t, dur) =>
            {
                float freq = Mathf.Lerp(540f, 440f, t / dur);
                float envelope = Mathf.Sin(Mathf.PI * (t / dur));
                return Mathf.Sin(2 * Mathf.PI * freq * t) * envelope * 0.35f;
            });

            // 9. Processing: Gentle soft 100ms pulse at 380Hz
            processingClip = CreateTone(sampleRate, 0.10f, (t, dur) =>
            {
                float envelope = Mathf.Exp(-t * 30f);
                return Mathf.Sin(2 * Mathf.PI * 380f * t) * envelope * 0.3f;
            });
        }

        private AudioClip CreateTone(int sampleRate, float duration, Func<float, float, float> generator)
        {
            int totalSamples = Mathf.RoundToInt(sampleRate * duration);
            float[] samples = new float[totalSamples];

            for (int i = 0; i < totalSamples; i++)
            {
                float t = (float)i / sampleRate;
                samples[i] = generator(t, duration);
            }

            AudioClip clip = AudioClip.Create("SynthesizedUI_" + duration.ToString("F3"), totalSamples, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        #endregion
    }
}

