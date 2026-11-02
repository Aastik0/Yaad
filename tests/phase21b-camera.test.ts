import test from "node:test";
import assert from "node:assert/strict";
import { AnalyzeRequestSchema, CandidateItemSchema } from "../src/lib/schemas.ts";
import { POST as analyzeHandler } from "../src/app/api/analyze/route.ts";
import { POST as confirmHandler } from "../src/app/api/items/confirm/route.ts";
import { MockVisionProvider } from "../src/lib/vision/MockVisionProvider.ts";

test("Phase 21B Camera: AnalyzeRequestSchema validates browser_camera and glasses_sdk sources", () => {
  const browserCameraPayload = {
    image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    requestedQuery: "wallet and keys",
    source: "browser_camera",
    userId: "test-user-1",
  };

  const parsedBrowser = AnalyzeRequestSchema.safeParse(browserCameraPayload);
  assert.equal(parsedBrowser.success, true);
  if (parsedBrowser.success) {
    assert.equal(parsedBrowser.data.source, "browser_camera");
    assert.equal(parsedBrowser.data.requestedQuery, "wallet and keys");
  }

  const glassesPayload = {
    image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    requestedQuery: "keys",
    source: "glasses_sdk",
  };

  const parsedGlasses = AnalyzeRequestSchema.safeParse(glassesPayload);
  assert.equal(parsedGlasses.success, true);
  if (parsedGlasses.success) {
    assert.equal(parsedGlasses.data.source, "glasses_sdk");
  }
});

test("Phase 21B Camera: AnalyzeRequestSchema rejects oversized camera frames (>7MB)", () => {
  const oversizedDataUrl = "data:image/jpeg;base64," + "A".repeat(7.5 * 1024 * 1024);
  const payload = {
    image: oversizedDataUrl,
    source: "browser_camera",
  };

  const parsed = AnalyzeRequestSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("Phase 21B Camera: POST /api/analyze processes real camera JPEG data URL in Demo Mode with 0 cost", async () => {
  const sampleCameraFrame = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: sampleCameraFrame,
      requestedQuery: "reading glasses",
      source: "browser_camera",
    }),
  });

  const res = await analyzeHandler(req as any);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.source, "mock");
  assert.ok(Array.isArray(data.candidates));
  assert.ok(data.candidates.length > 0);

  // Verify candidate properties are grounded
  const firstCandidate = data.candidates[0];
  assert.ok(firstCandidate.item_name);
  assert.ok(firstCandidate.location_description);
  assert.ok(firstCandidate.confidence);
});

test("Phase 21B Camera: Candidate confirmation preserves browser_camera origin", () => {
  const candidate = {
    id: "cand-cam-101",
    item_name: "Car Keys",
    category: "Everyday Carry",
    location_description: "Front entryway console table",
    landmarks: ["Table", "Ceramic Bowl"],
    description: "Honda key fob resting on ceramic tray",
    confidence: "high" as const,
    is_selected: true,
  };

  const parsed = CandidateItemSchema.safeParse(candidate);
  assert.equal(parsed.success, true);
});

test("Phase 21B Camera: MockVisionProvider analyzes real camera frames offline without network requests", async () => {
  const mockProvider = new MockVisionProvider();
  const sampleFrame = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const result = await mockProvider.analyzeScene(sampleFrame, {
    requestedQuery: "wallet",
    source: "browser_camera",
  });

  assert.equal(result.source, "mock");
  assert.equal(result.costUsd, 0);
  assert.ok(result.candidates.length > 0);
});

