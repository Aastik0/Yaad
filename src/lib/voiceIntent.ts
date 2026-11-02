/**
 * Deterministic Voice Intent Parser for Yaad
 * Parses natural speech transcripts into structured intents:
 * - REMEMBER: Triggers scene camera capture flow
 * - RECALL: Queries grounded historical sightings
 * - NAVIGATE: Requests directional handoff / navigation to an item
 * - UNKNOWN: Unrecognized intent, handled gracefully without hallucination
 */

export type VoiceIntentType = "REMEMBER" | "RECALL" | "NAVIGATE" | "UNKNOWN";

export interface ParsedVoiceIntent {
  type: VoiceIntentType;
  rawTranscript: string;
  normalizedQuery: string;
  targetItem?: string;
  confidence: number;
  explanation: string;
}

/**
 * Strips conversational filler and standardizes speech transcript
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cleans extracted item names by stripping leading articles/possessives
 */
function cleanItemName(rawItem: string): string {
  let cleaned = rawItem.trim();
  // Strip leading "my", "the", "a", "an", "this", "these", "our"
  cleaned = cleaned.replace(/^(my|the|a|an|this|these|our)\s+/i, "").trim();
  // Strip trailing question / location filler like "again", "today", "now"
  cleaned = cleaned.replace(/\s+(again|today|now|please)$/i, "").trim();
  return cleaned;
}

/**
 * Parses a spoken transcript into a deterministic VoiceIntent
 */
export function parseVoiceIntent(transcript: string): ParsedVoiceIntent {
  const raw = transcript || "";
  const normalized = normalizeTranscript(raw);

  if (!normalized) {
    return {
      type: "UNKNOWN",
      rawTranscript: raw,
      normalizedQuery: "",
      confidence: 0,
      explanation: "Empty or silent audio transcript.",
    };
  }

  // Strip common conversational opening prefixes like "hey yaad", "yaad", "please", "can you", "could you", "help me"
  let prompt = normalized
    .replace(/^(hey\s+yaad|yaad|meta|ok\s+yaad|please|can\s+you|could\s+you|help\s+me\s+to|help\s+me)\s+/i, "")
    .trim();

  // 1. NAVIGATE INTENTS
  // "take me to my wallet", "navigate to my keys", "directions to my laptop", "guide me to my bag"
  const navigatePatterns = [
    /^(?:take\s+me\s+to|navigate\s+to|directions\s+to|guide\s+me\s+to|lead\s+me\s+to|route\s+to)\s+(.+)$/i,
    /^(?:how\s+do\s+i\s+(?:get|walk)\s+to)\s+(.+)$/i,
    /^(?:show\s+(?:me\s+the\s+way|directions)\s+to)\s+(.+)$/i,
  ];

  for (const pattern of navigatePatterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const item = cleanItemName(match[1]);
      if (item) {
        return {
          type: "NAVIGATE",
          rawTranscript: raw,
          normalizedQuery: prompt,
          targetItem: item,
          confidence: 0.95,
          explanation: `Navigate intent targeting item "${item}".`,
        };
      }
    }
  }

  // 2. RECALL INTENTS
  // "where are my keys", "where is my wallet", "where did i last see my glasses", "find my backpack"
  const recallPatterns = [
    /^(?:where\s+are|where\s+is|where\s+did\s+i\s+last\s+see|where\s+did\s+i\s+leave|where\s+did\s+i\s+put|where\s+was)\s+(.+)$/i,
    /^(?:where\s+s)\s+(.+)$/i, // normalized form of "where's"
    /^(?:find|locate|search\s+for|look\s+for|recall)\s+(.+)$/i,
    /^(?:have\s+you\s+seen|do\s+you\s+know\s+where)\s+(.+)$/i,
    /^(?:what\s+happened\s+to)\s+(.+)$/i,
  ];

  for (const pattern of recallPatterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const item = cleanItemName(match[1]);
      if (item) {
        return {
          type: "RECALL",
          rawTranscript: raw,
          normalizedQuery: prompt,
          targetItem: item,
          confidence: 0.95,
          explanation: `Recall intent querying location of "${item}".`,
        };
      }
    }
  }

  // 3. REMEMBER INTENTS
  // "remember my items", "remember my belongings", "remember this", "record my items", "scan belongings"
  const rememberPatterns = [
    /^(?:remember|record|scan|capture)\s+(?:my\s+)?(?:items|belongings|stuff|scene|surroundings|environment|things)$/i,
    /^(?:remember|record|capture)\s+(?:this|here|now)$/i,
    /^(?:remember|record)$/i,
    /^(?:remember\s+where\s+i\s+(?:put|set|left)\s+(?:my\s+)?(?:items|belongings|this))$/i,
    /^(?:take\s+(?:a\s+)?photo\s+to\s+remember)$/i,
  ];

  for (const pattern of rememberPatterns) {
    if (pattern.test(prompt)) {
      return {
        type: "REMEMBER",
        rawTranscript: raw,
        normalizedQuery: prompt,
        confidence: 0.95,
        explanation: "Remember intent triggering optical scene capture.",
      };
    }
  }

  // Check if prompt is a direct query for an item (e.g., user just says "my keys" or "wallet")
  // If it's a short noun phrase, we treat as a RECALL intent
  const singleItemPattern = /^(?:my\s+|the\s+)?([a-z0-9\s]+)$/i;
  const singleMatch = prompt.match(singleItemPattern);
  if (singleMatch && singleMatch[1]) {
    const item = cleanItemName(singleMatch[1]);
    const commonItemKeywords = ["keys", "wallet", "glasses", "phone", "bag", "backpack", "badge", "laptop", "bottle", "watch", "passport", "jacket"];
    if (commonItemKeywords.includes(item)) {
      return {
        type: "RECALL",
        rawTranscript: raw,
        normalizedQuery: prompt,
        targetItem: item,
        confidence: 0.75,
        explanation: `Short item utterance recognized as Recall query for "${item}".`,
      };
    }
  }

  return {
    type: "UNKNOWN",
    rawTranscript: raw,
    normalizedQuery: prompt,
    confidence: 0.2,
    explanation: `Unrecognized command "${prompt}". Yaad supports "Remember my items", "Where are my keys?", and "Navigate to my wallet".`,
  };
}

