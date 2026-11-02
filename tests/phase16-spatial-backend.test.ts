import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as loginHandler } from "../src/app/api/auth/login/route.ts";
import { GET as getItemsHandler } from "../src/app/api/items/route.ts";
import { POST as confirmItemHandler } from "../src/app/api/items/confirm/route.ts";
import { POST as recallHandler } from "../src/app/api/recall/route.ts";
import { POST as analyzeHandler } from "../src/app/api/analyze/route.ts";
import { AnalyzeRequestSchema } from "../src/lib/schemas.ts";

test("Phase 16 Backend: Login route rejects invalid email/password format", async () => {
  const req = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid-email", password: "123" }),
  });

  const res = await loginHandler(req as any);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("Phase 16.1 Audit: Login route rejects malformed JSON with 400 Bad Request", async () => {
  const req = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });

  const res = await loginHandler(req as any);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Invalid JSON format/);
});

test("Phase 16 Backend: GET /api/items rejects request without Bearer token", async () => {
  const req = new Request("http://localhost:3000/api/items", {
    method: "GET",
  });

  const res = await getItemsHandler(req as any);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Unauthorized/);
});

test("Phase 16 Backend: POST /api/items/confirm rejects request without Bearer token", async () => {
  const req = new Request("http://localhost:3000/api/items/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate: {
        id: "cand-1",
        item_name: "Test Wallet",
        location_description: "Desk",
        description: "Black wallet",
        confidence: "high",
        is_selected: true,
        landmarks: [],
      },
    }),
  });

  const res = await confirmItemHandler(req as any);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("Phase 16.1 Audit: POST /api/items/confirm rejects malformed JSON with 400", async () => {
  const req = new Request("http://localhost:3000/api/items/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ bad json",
  });

  const res = await confirmItemHandler(req as any);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test("Phase 16 Backend: POST /api/recall returns grounded match in unauthenticated/demo mode", async () => {
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "keys" }),
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.found, true);
  assert.ok(data.item.item_name.toLowerCase().includes("key"));
  assert.ok(data.speechSummary.includes(data.item.item_name));
  assert.match(data.disclaimer, /historical/i);
});

test("Phase 16 Backend: POST /api/recall returns 'No sighting recorded.' when item does not exist", async () => {
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "telescope" }),
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.found, false);
  assert.equal(data.message, "No sighting recorded.");
});

test("Phase 16 Backend: POST /api/recall rejects empty query with 400", async () => {
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "" }),
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 400);
});

test("Phase 16.1 Audit: POST /api/recall rejects query exceeding 256 characters with 400", async () => {
  const overlengthQuery = "a".repeat(300);
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: overlengthQuery }),
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 400);
});

test("Phase 16.1 Audit: POST /api/recall rejects malformed JSON with 400", async () => {
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ broken json",
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 400);
});

test("Phase 16 Backend: AnalyzeRequestSchema supports glasses_sdk source from Unity spatial client", () => {
  const payload = {
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    source: "glasses_sdk",
    requestedQuery: "glasses",
    userId: "test-spatial-user",
  };

  const parsed = AnalyzeRequestSchema.safeParse(payload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.source, "glasses_sdk");
    assert.equal(parsed.data.userId, "test-spatial-user");
  }
});

test("Phase 16.1 Audit: AnalyzeRequestSchema rejects oversized image payload (>7MB)", () => {
  const oversizedImage = "data:image/png;base64," + "A".repeat(8 * 1024 * 1024);
  const payload = {
    image: oversizedImage,
    source: "glasses_sdk",
  };

  const parsed = AnalyzeRequestSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("Phase 16.1 Audit: POST /api/analyze rejects malformed JSON with 400", async () => {
  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json",
  });

  const res = await analyzeHandler(req as any);
  assert.equal(res.status, 400);
});
