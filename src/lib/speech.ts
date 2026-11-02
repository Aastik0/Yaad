/**
 * Speech synthesis helper for Yaad
 * Delivers calm spoken reminders and conversational memory feedback using Web Speech API with fallback.
 * Respects user audio preferences and privacy settings.
 */

const VOICE_OUTPUT_STORAGE_KEY = "yaad_voice_output_enabled";

/**
 * Checks whether spoken audio responses are enabled by the user.
 * Defaults to true if unconfigured.
 */
export const isVoiceOutputEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(VOICE_OUTPUT_STORAGE_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
};

/**
 * Toggles or sets user voice output preference in localStorage.
 */
export const setVoiceOutputEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOICE_OUTPUT_STORAGE_KEY, enabled ? "true" : "false");
  } catch (err) {
    console.warn("Failed to persist voice output preference:", err);
  }
};

/**
 * Delivers a calm spoken utterance using browser speechSynthesis.
 * Respects user voice output setting unless force is explicitly true.
 */
export const speakCalmReminder = (text: string, force: boolean = false): boolean => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  // Respect user audio toggle
  if (!force && !isVoiceOutputEnabled()) {
    return false;
  }

  try {
    // Cancel any pending speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, calm cadence
    utterance.pitch = 1.0;
    utterance.volume = 0.85;

    // Prefer a gentle English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Serena") ||
          v.name.includes("Karen") ||
          v.name.includes("Daniel"))
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Speech synthesis unavailable or blocked:", err);
    return false;
  }
};

/**
 * Stops all ongoing speech synthesis immediately.
 */
export const stopSpeech = (): void => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
};

/**
 * Spoken response helpers for Voice Interaction
 */
export const speakRecallResult = (itemName: string, locationDescription?: string | null): boolean => {
  if (locationDescription) {
    return speakCalmReminder(`Your ${itemName} was last recorded at ${locationDescription}.`);
  }
  return speakCalmReminder(`No sighting recorded for ${itemName}. Yaad records historical sightings only.`);
};

export const speakRememberConfirmation = (): boolean => {
  return speakCalmReminder("Opening camera to remember your belongings.");
};

export const speakNavigationGuidance = (itemName: string, locationDescription?: string | null): boolean => {
  if (locationDescription) {
    return speakCalmReminder(`Navigation guidance for ${itemName}: last recorded near ${locationDescription}.`);
  }
  return speakCalmReminder(`No recorded location found for ${itemName} to navigate to.`);
};

export const speakUnknownIntent = (): boolean => {
  return speakCalmReminder("I didn't recognize that command. Try asking 'Where are my keys?' or 'Remember my items'.");
};
