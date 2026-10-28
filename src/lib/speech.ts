/**
 * Speech synthesis helper for Yaad
 * Delivers calm spoken reminders using Web Speech API with fallback.
 */

export const speakCalmReminder = (text: string): boolean => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
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

export const stopSpeech = (): void => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
};

