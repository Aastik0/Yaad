using System;
using System.Text.RegularExpressions;
using UnityEngine;

namespace Yaad.Spatial.Services
{
    public enum SpatialVoiceIntentType
    {
        Recall,
        Remember,
        RecentMemories,
        Cancel,
        Unknown
    }

    [Serializable]
    public class ParsedSpatialIntent
    {
        public SpatialVoiceIntentType type;
        public string rawTranscript;
        public string normalizedQuery;
        public string targetItem;
        public float confidence;
        public string explanation;

        public ParsedSpatialIntent(
            SpatialVoiceIntentType type,
            string rawTranscript,
            string normalizedQuery,
            string targetItem,
            float confidence,
            string explanation)
        {
            this.type = type;
            this.rawTranscript = rawTranscript;
            this.normalizedQuery = normalizedQuery;
            this.targetItem = targetItem;
            this.confidence = confidence;
            this.explanation = explanation;
        }
    }

    /// <summary>
    /// SpatialVoiceIntentRouter
    /// Deterministic voice intent classifier for Yaad Spatial XR.
    /// Maps spoken phrases and text queries into structured hands-free actions:
    /// - RECALL: Searches historical grounded belongings ("Where did I leave my keys?")
    /// - REMEMBER: Triggers camera scene capture ("Remember this", "Take a picture")
    /// - RECENT_MEMORIES: Opens 3D carousel ("Show my recent memories")
    /// - CANCEL: Stops speech, clears view, or dismisses modal ("Cancel", "Stop", "Go back")
    /// - UNKNOWN: Surfaces calm, dementia-friendly clarification without hallucination.
    /// </summary>
    public static class SpatialVoiceIntentRouter
    {
        /// <summary>
        /// Strips punctuation, normalizes casing, and collapses whitespace.
        /// </summary>
        public static string NormalizeTranscript(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";
            string lower = text.ToLowerInvariant();
            // Replace punctuation with spaces
            string clean = Regex.Replace(lower, @"[.,\/#!$%\^&\*;:{}=\-_`~()?""']", " ");
            // Collapse multiple spaces
            return Regex.Replace(clean, @"\s+", " ").Trim();
        }

        /// <summary>
        /// Cleans extracted item names by stripping leading articles, possessives, and trailing conversational filler.
        /// </summary>
        public static string CleanItemName(string rawItem)
        {
            if (string.IsNullOrWhiteSpace(rawItem)) return "";
            string cleaned = rawItem.Trim();
            // Strip leading articles and possessives
            cleaned = Regex.Replace(cleaned, @"^(my|the|a|an|this|these|our)\s+", "", RegexOptions.IgnoreCase).Trim();
            // Strip trailing conversational filler
            cleaned = Regex.Replace(cleaned, @"\s+(again|today|now|please|at|for\s+me)$", "", RegexOptions.IgnoreCase).Trim();
            return cleaned;
        }

        /// <summary>
        /// Parses spoken transcript into a deterministic voice intent.
        /// </summary>
        public static ParsedSpatialIntent ParseIntent(string transcript)
        {
            string raw = transcript ?? "";
            string normalized = NormalizeTranscript(raw);

            if (string.IsNullOrEmpty(normalized))
            {
                return new ParsedSpatialIntent(
                    SpatialVoiceIntentType.Unknown,
                    raw,
                    "",
                    null,
                    0f,
                    "Empty or silent transcript."
                );
            }

            // Strip common conversational opening prefixes ("hey yaad", "yaad", "meta", "please", "can you", "help me")
            string prompt = Regex.Replace(
                normalized,
                @"^(hey\s+yaad|yaad|meta|ok\s+yaad|please|can\s+you|could\s+you|help\s+me\s+to|help\s+me)\s+",
                "",
                RegexOptions.IgnoreCase
            ).Trim();

            // 1. CANCEL INTENTS
            // "cancel", "stop", "go back", "dismiss", "clear", "close", "never mind", "stop talking"
            string[] cancelExact = { "cancel", "stop", "go back", "dismiss", "clear", "close", "never mind", "stop talking", "exit" };
            foreach (var c in cancelExact)
            {
                if (prompt == c || prompt.StartsWith(c + " "))
                {
                    return new ParsedSpatialIntent(
                        SpatialVoiceIntentType.Cancel,
                        raw,
                        prompt,
                        null,
                        0.98f,
                        "Cancel intent: stop speech and clear view."
                    );
                }
            }

            // 2. RECENT MEMORIES INTENTS
            // "show my recent memories", "recent memories", "show memories", "open memories", "my memories", "view memories"
            string[] memoryPatterns =
            {
                @"^(?:show|open|view|display)\s+(?:my\s+)?(?:recent\s+)?memories$",
                @"^(?:recent\s+memories|my\s+memories)$",
                @"^(?:take\s+me\s+to|switch\s+to)\s+recent\s+memories$"
            };
            foreach (var pat in memoryPatterns)
            {
                if (Regex.IsMatch(prompt, pat, RegexOptions.IgnoreCase))
                {
                    return new ParsedSpatialIntent(
                        SpatialVoiceIntentType.RecentMemories,
                        raw,
                        prompt,
                        null,
                        0.95f,
                        "Recent Memories intent: switch to 3D carousel."
                    );
                }
            }

            // 3. REMEMBER INTENTS
            // "remember my items", "remember this", "remember these keys", "take a picture", "take a photo", "scan surroundings"
            string[] rememberPatterns =
            {
                @"^(?:remember|record|scan|capture)\s+(?:my\s+)?(?:items|belongings|stuff|scene|surroundings|things)$",
                @"^(?:remember|record|capture)\s+(?:this|these|here|now)$",
                @"^(?:take\s+(?:a\s+)?(?:photo|picture|snapshot)(?:\s+to\s+remember)?)$",
                @"^(?:remember|record)$"
            };
            foreach (var pat in rememberPatterns)
            {
                if (Regex.IsMatch(prompt, pat, RegexOptions.IgnoreCase))
                {
                    return new ParsedSpatialIntent(
                        SpatialVoiceIntentType.Remember,
                        raw,
                        prompt,
                        null,
                        0.95f,
                        "Remember intent: opening camera to record scene."
                    );
                }
            }

            // Also check for "remember my [item]" -> remember intent
            var rememberItemMatch = Regex.Match(prompt, @"^(?:remember|record|capture)\s+(?:where\s+i\s+(?:put|left|placed)\s+)?(.+)$", RegexOptions.IgnoreCase);
            if (rememberItemMatch.Success && rememberItemMatch.Groups[1].Success)
            {
                string target = CleanItemName(rememberItemMatch.Groups[1].Value);
                if (!string.IsNullOrEmpty(target) && target != "items" && target != "belongings" && target != "this")
                {
                    return new ParsedSpatialIntent(
                        SpatialVoiceIntentType.Remember,
                        raw,
                        prompt,
                        target,
                        0.92f,
                        $"Remember intent targeting: {target}"
                    );
                }
            }

            // 4. RECALL INTENTS
            // "where did i leave my keys", "where are my glasses", "help me find my wallet", "find my backpack"
            string[] recallPatterns =
            {
                @"^(?:where\s+are|where\s+is|where\s+did\s+i\s+(?:last\s+see|leave|put|place)|where\s+was)\s+(.+)$",
                @"^(?:where\s+s)\s+(.+)$",
                @"^(?:find|locate|search\s+for|look\s+for|recall)\s+(.+)$",
                @"^(?:have\s+you\s+seen|do\s+you\s+know\s+where)\s+(.+)$",
                @"^(?:what\s+happened\s+to)\s+(.+)$"
            };

            foreach (var pat in recallPatterns)
            {
                var match = Regex.Match(prompt, pat, RegexOptions.IgnoreCase);
                if (match.Success && match.Groups[1].Success)
                {
                    string target = CleanItemName(match.Groups[1].Value);
                    if (!string.IsNullOrEmpty(target))
                    {
                        return new ParsedSpatialIntent(
                            SpatialVoiceIntentType.Recall,
                            raw,
                            prompt,
                            target,
                            0.95f,
                            $"Recall intent querying location of \"{target}\"."
                        );
                    }
                }
            }

            // Check for direct noun phrase item utterance (e.g., user just says "my keys", "wallet", "glasses")
            string[] commonKeywords =
            {
                "keys", "car keys", "house keys", "wallet", "cardholder", "glasses",
                "reading glasses", "spectacles", "phone", "bag", "backpack", "badge",
                "laptop", "bottle", "water bottle", "watch", "passport", "jacket",
                "headphones", "book", "charger"
            };

            string directItem = CleanItemName(prompt);
            foreach (var kw in commonKeywords)
            {
                if (directItem == kw || directItem.EndsWith(" " + kw))
                {
                    return new ParsedSpatialIntent(
                        SpatialVoiceIntentType.Recall,
                        raw,
                        prompt,
                        directItem,
                        0.85f,
                        $"Direct item utterance recognized as Recall query for \"{directItem}\"."
                    );
                }
            }

            // 5. UNKNOWN INTENT (Honest clarification without guessing)
            return new ParsedSpatialIntent(
                SpatialVoiceIntentType.Unknown,
                raw,
                prompt,
                null,
                0.2f,
                $"Unrecognized command \"{prompt}\". You can say 'Where are my keys?', 'Remember this', or 'Show my memories'."
            );
        }
    }
}

