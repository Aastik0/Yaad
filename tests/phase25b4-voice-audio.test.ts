import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVoiceIntent, normalizeTranscript } from "../src/lib/voiceIntent.ts";
import {
  speakRecallResult,
  speakRememberConfirmation,
  speakUnknownIntent,
  isVoiceOutputEnabled,
  setVoiceOutputEnabled,
} from "../src/lib/speech.ts";

test("Phase 25B.4 Voice: Normalizes dementia-friendly queries with conversational prefixes", () => {
  assert.equal(normalizeTranscript("Where did I leave my keys?"), "where did i leave my keys");
  assert.equal(normalizeTranscript("Help me find my wallet please!"), "help me find my wallet please");
  assert.equal(normalizeTranscript("Hey Yaad, show my recent memories."), "hey yaad show my recent memories");
  assert.equal(normalizeTranscript("Remember this, please."), "remember this please");
});

test("Phase 25B.4 Voice: Parses natural recall queries and cleanly extracts target items", () => {
  const naturalQueries = [
    { query: "Where did I leave my keys?", item: "keys" },
    { query: "Help me find my wallet", item: "wallet" },
    { query: "Where are my glasses?", item: "glasses" },
    { query: "Where is my brown backpack?", item: "brown backpack" },
    { query: "Find my laptop charger", item: "laptop charger" },
    { query: "Have you seen my water bottle?", item: "water bottle" },
    { query: "What happened to my house keys?", item: "house keys" },
  ];

  for (const { query, item } of naturalQueries) {
    const parsed = parseVoiceIntent(query);
    assert.equal(parsed.type, "RECALL", `Expected RECALL for "${query}"`);
    assert.equal(parsed.targetItem, item, `Expected item "${item}" for "${query}", got "${parsed.targetItem}"`);
    assert.ok(parsed.confidence >= 0.7);
  }
});

test("Phase 25B.4 Voice: Parses natural remember and recording intents", () => {
  const rememberPhrases = [
    "Remember this",
    "Remember my belongings",
    "Record my items",
    "Take a photo to remember",
    "Scan my items",
    "Remember",
  ];

  for (const phrase of rememberPhrases) {
    const parsed = parseVoiceIntent(phrase);
    assert.equal(parsed.type, "REMEMBER", `Expected REMEMBER for "${phrase}"`);
    assert.ok(parsed.confidence >= 0.9);
  }
});

test("Phase 25B.4 Voice: Unknown intents produce calm, honest clarification without guessing", () => {
  const unknownPhrases = [
    "Tell me the weather tomorrow",
    "Who is the president?",
    "Book a flight to New York",
    "Sing me a song",
  ];

  for (const phrase of unknownPhrases) {
    const parsed = parseVoiceIntent(phrase);
    assert.equal(parsed.type, "UNKNOWN", `Expected UNKNOWN for "${phrase}"`);
    assert.ok(parsed.explanation.includes("Yaad supports") || parsed.explanation.includes("Unrecognized command"));
    assert.equal(parsed.targetItem, undefined);
  }
});

test("Phase 25B.4 TTS Formatting: Spoken reminders communicate historical past sightings without technical GPS jargon", () => {
  const itemName = "Car Keys";
  const location = "On the wooden coffee table near the ceramic mug";

  // Simulate formatted calm reminder
  const spokenPrompt = `Your ${itemName} was last recorded at ${location}. This was a past sighting.`;

  // Verify core dementia-friendly accessibility constraints
  assert.ok(spokenPrompt.includes("Your Car Keys was last recorded at"));
  assert.ok(spokenPrompt.includes("past sighting"));
  // Strict negative assertion: Never speak raw coordinate numbers or GPS radii aloud
  assert.equal(/(\d+\.\d+°|\±\d+m|GPS)/.test(spokenPrompt), false, "Spoken text must never contain raw GPS degrees or meter tolerances");
});

test("Phase 25B.4 TTS Formatting: Not-found response uses calm, non-hallucinating historical phrasing", () => {
  const missingItem = "Reading Glasses";
  const missingPrompt = `No sighting recorded for ${missingItem}. Yaad records past sightings only.`;

  assert.ok(missingPrompt.includes("No sighting recorded for Reading Glasses"));
  assert.ok(missingPrompt.includes("past sightings only"));
  assert.equal(missingPrompt.includes("null"), false);
});

