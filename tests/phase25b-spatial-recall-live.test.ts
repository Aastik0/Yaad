import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as recallHandler } from "../src/app/api/recall/route.ts";

test("Phase 25B.1 Spatial Recall: Grounded query 'keys' returns complete grounded item and visual description", async () => {
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
  assert.equal(data.query, "keys");

  // Verify item properties match persisted grounded fixture
  assert.equal(data.item.item_name, "Apartment Keys with Brass Carabiner");
  assert.equal(data.item.category, "Keys");
  assert.equal(data.item.last_location_description, "On the wooden coffee table near the ceramic coffee mug");
  assert.ok(Array.isArray(data.item.landmarks));
  assert.ok(data.item.landmarks.includes("wooden coffee table"));
  assert.ok(data.item.last_observed_at);

  // Verify GPS metadata exposed in Phase 25B.2
  assert.ok(data.item.coordinates, "Item must expose persisted coordinates");
  assert.equal(data.item.coordinates.latitude, 37.7749);
  assert.equal(data.item.coordinates.longitude, -122.4194);
  assert.equal(data.item.coordinates.accuracy, 8);
  assert.equal(data.item.geofence_radius_meters, 50);

  // Verify visual description from observation
  assert.ok(data.observation, "Observation must be returned for visual context");
  assert.equal(data.observation.description, "Brass carabiner keychain recorded lying flat on oak surface beside a white ceramic mug.");

  // Verify speech summary and historical disclaimer
  assert.ok(data.speechSummary.includes("Apartment Keys with Brass Carabiner"));
  assert.ok(data.speechSummary.includes("On the wooden coffee table"));
  assert.ok(data.disclaimer.includes("historical sighting only"));
});

test("Phase 25B.1 Spatial Recall: Item that does not exist returns found: false with truthful message", async () => {
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
  assert.ok(data.disclaimer.includes("historical sightings only"));
  assert.equal(data.item, undefined);
  assert.equal(data.observation, undefined);
});

test("Phase 25B.1 Spatial Recall: Invalid / expired session token rejects with 401 Unauthorized", async () => {
  // Ensure Supabase environment variables are present for server client initialization
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://nfxxdwsfunaazbtncnll.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZNBCMv__TiLCxk67G1ziZA_lb7q9tSF";

    const req = new Request("http://localhost:3000/api/recall", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid_expired_jwt_token_12345",
      },
      body: JSON.stringify({ query: "keys" }),
    });

    const res = await recallHandler(req as any);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes("Unauthorized") || data.error.includes("expired"));
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test("Phase 25B.1 Spatial Recall: Empty query is rejected with 400 Bad Request", async () => {
  const req = new Request("http://localhost:3000/api/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "   " }),
  });

  const res = await recallHandler(req as any);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes("Query is required") || data.error.includes("Invalid recall query"));
});
