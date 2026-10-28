import test from "node:test";
import assert from "node:assert/strict";
import {
  CandidateItemSchema,
  SceneAnalysisResponseSchema,
  AnalyzeRequestSchema,
} from "../src/lib/schemas.ts";

test("Phase 5: CandidateItemSchema validates well-formed candidate", () => {
  const validCandidate = {
    id: "cand-1",
    item_name: "Prescription Glasses",
    category: "Eyewear",
    location_description: "On the hall console table near the front door",
    landmarks: ["hall console table", "key tray"],
    description: "Glasses resting folded in front of the ceramic tray.",
    confidence: "high",
    is_selected: true,
  };

  const parsed = CandidateItemSchema.safeParse(validCandidate);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.item_name, "Prescription Glasses");
    assert.equal(parsed.data.confidence, "high");
  }
});

test("Phase 5: CandidateItemSchema rejects malformed candidate missing required grounded fields", () => {
  const invalidCandidate = {
    id: "cand-2",
    item_name: "", // Invalid empty name
    location_description: "", // Invalid empty location
  };

  const parsed = CandidateItemSchema.safeParse(invalidCandidate);
  assert.equal(parsed.success, false);
});

test("Phase 5: SceneAnalysisResponseSchema parses structured response", () => {
  const responseData = {
    candidates: [
      {
        id: "c-1",
        item_name: "Matte Black Water Bottle",
        category: "Beverage",
        location_description: "Beside the side chair on the rug",
        landmarks: ["side chair", "rug"],
        description: "Water bottle standing upright beside chair leg.",
        confidence: "medium",
        is_selected: true,
      },
    ],
    scene_context: "Living room study area",
  };

  const parsed = SceneAnalysisResponseSchema.safeParse(responseData);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.candidates.length, 1);
    assert.equal(parsed.data.scene_context, "Living room study area");
  }
});

test("Phase 5: AnalyzeRequestSchema validates request input and provides safe defaults", () => {
  const request = {
    image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    requestedQuery: "keys",
  };

  const parsed = AnalyzeRequestSchema.safeParse(request);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.source, "browser_upload"); // default
    assert.equal(parsed.data.forceLive, false); // default
  }
});

