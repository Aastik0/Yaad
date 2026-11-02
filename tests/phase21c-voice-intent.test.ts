import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVoiceIntent, normalizeTranscript } from "../src/lib/voiceIntent.ts";
import {
  isVoiceOutputEnabled,
  setVoiceOutputEnabled,
  speakCalmReminder,
  speakRecallResult,
  speakNavigationGuidance,
  speakRememberConfirmation,
  speakUnknownIntent,
  stopSpeech,
} from "../src/lib/speech.ts";

test("Phase 21C Voice Intent: normalizeTranscript handles punctuation, casing and whitespace", () => {
  assert.equal(normalizeTranscript("  Where are my keys???  "), "where are my keys");
  assert.equal(normalizeTranscript("Remember my belongings!"), "remember my belongings");
  assert.equal(normalizeTranscript("Where's my wallet?"), "where s my wallet");
});

test("Phase 21C Voice Intent: Parses REMEMBER commands correctly", () => {
  const rememberPhrases = [
    "Remember my items",
    "remember my belongings",
    "Remember this",
    "Record my belongings",
    "Hey Yaad, remember my stuff",
    "Scan my items",
    "Remember",
    "Please remember my belongings",
  ];

  for (const phrase of rememberPhrases) {
    const result = parseVoiceIntent(phrase);
    assert.equal(result.type, "REMEMBER", `Failed for phrase: "${phrase}"`);
    assert.ok(result.confidence >= 0.9);
  }
});

test("Phase 21C Voice Intent: Parses RECALL commands and extracts target item correctly", () => {
  const cases: Array<{ phrase: string; expectedItem: string }> = [
    { phrase: "Where are my keys?", expectedItem: "keys" },
    { phrase: "Where is my wallet?", expectedItem: "wallet" },
    { phrase: "Where did I last see my glasses?", expectedItem: "glasses" },
    { phrase: "Find my backpack", expectedItem: "backpack" },
    { phrase: "Where's my phone?", expectedItem: "phone" },
    { phrase: "Where did I leave my laptop?", expectedItem: "laptop" },
    { phrase: "Have you seen my badge?", expectedItem: "badge" },
    { phrase: "Locate my water bottle", expectedItem: "water bottle" },
    { phrase: "Hey Yaad, where are my car keys?", expectedItem: "car keys" },
    { phrase: "keys", expectedItem: "keys" },
  ];

  for (const { phrase, expectedItem } of cases) {
    const result = parseVoiceIntent(phrase);
    assert.equal(result.type, "RECALL", `Failed for phrase: "${phrase}"`);
    assert.equal(result.targetItem, expectedItem, `Expected item "${expectedItem}" but got "${result.targetItem}" for "${phrase}"`);
    assert.ok(result.confidence >= 0.7);
  }
});

test("Phase 21C Voice Intent: Parses NAVIGATE commands and extracts target item correctly", () => {
  const cases: Array<{ phrase: string; expectedItem: string }> = [
    { phrase: "Take me to my wallet", expectedItem: "wallet" },
    { phrase: "Navigate to my keys", expectedItem: "keys" },
    { phrase: "Directions to my laptop", expectedItem: "laptop" },
    { phrase: "Guide me to my bag", expectedItem: "bag" },
    { phrase: "How do I get to my glasses?", expectedItem: "glasses" },
    { phrase: "Lead me to my car keys", expectedItem: "car keys" },
  ];

  for (const { phrase, expectedItem } of cases) {
    const result = parseVoiceIntent(phrase);
    assert.equal(result.type, "NAVIGATE", `Failed for phrase: "${phrase}"`);
    assert.equal(result.targetItem, expectedItem, `Expected item "${expectedItem}" but got "${result.targetItem}" for "${phrase}"`);
    assert.ok(result.confidence >= 0.9);
  }
});

test("Phase 21C Voice Intent: Handles unknown commands and silence gracefully without fabrication", () => {
  const unknownPhrases = [
    "What is the weather in Tokyo?",
    "Tell me a funny joke",
    "Turn on the lights",
    "Who is the president?",
    "",
    "   ",
  ];

  for (const phrase of unknownPhrases) {
    const result = parseVoiceIntent(phrase);
    assert.equal(result.type, "UNKNOWN", `Expected UNKNOWN for phrase: "${phrase}"`);
    assert.ok(result.confidence <= 0.2);
  }
});

test("Phase 21C Speech Output: Preferences and safe headless fallback", () => {
  // In Node.js environment without window.speechSynthesis, speech functions return false gracefully without throwing
  assert.equal(typeof isVoiceOutputEnabled(), "boolean");
  setVoiceOutputEnabled(false);
  assert.equal(speakCalmReminder("Test reminder"), false);
  assert.equal(speakRecallResult("keys", "kitchen counter"), false);
  assert.equal(speakNavigationGuidance("keys", "kitchen counter"), false);
  assert.equal(speakRememberConfirmation(), false);
  assert.equal(speakUnknownIntent(), false);
  assert.doesNotThrow(() => stopSpeech());
});
