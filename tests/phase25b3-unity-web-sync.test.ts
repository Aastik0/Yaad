import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as confirmHandler } from "../src/app/api/items/confirm/route.ts";
import { CandidateItemSchema, GeoCoordinatesSchema } from "../src/lib/schemas.ts";
import { z } from "zod";

const ConfirmCandidatePayloadSchema = z.object({
  candidate: CandidateItemSchema,
  source: z.enum(["browser_upload", "browser_camera", "glasses_sdk", "manual"]).default("glasses_sdk"),
  image_reference: z.string().nullable().optional(),
  coordinates: GeoCoordinatesSchema.nullable().optional(),
});

test("Phase 25B.3 Schema: Full Unity candidate payload with landmarks, description, category, and GPS validates", () => {
  const unityPayload = {
    candidate: {
      id: "cand-unity-1",
      item_name: "Sony Noise-Canceling Headphones",
      category: "Personal Item",
      location_description: "On the oak desk next to the computer monitor",
      landmarks: ["oak desk", "computer monitor", "mousepad"],
      description: "Black matte over-ear headphones with silver headband accents.",
      confidence: "high",
      is_selected: true,
    },
    source: "glasses_sdk",
    image_reference: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    coordinates: {
      latitude: 37.774929,
      longitude: -122.419416,
      accuracy: 6.5,
      place_name: "San Francisco Office",
    },
  };

  const parsed = ConfirmCandidatePayloadSchema.safeParse(unityPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.candidate.item_name, "Sony Noise-Canceling Headphones");
    assert.equal(parsed.data.candidate.category, "Personal Item");
    assert.deepEqual(parsed.data.candidate.landmarks, ["oak desk", "computer monitor", "mousepad"]);
    assert.equal(parsed.data.candidate.description, "Black matte over-ear headphones with silver headband accents.");
    assert.equal(parsed.data.source, "glasses_sdk");
    assert.equal(parsed.data.coordinates?.accuracy, 6.5);
  }
});

test("Phase 25B.3 Schema: Unity candidate payload with nullable coordinates and null image_reference validates", () => {
  const indoorPayload = {
    candidate: {
      id: "cand-unity-2",
      item_name: "House Keys",
      category: "Everyday Carry",
      location_description: "In the ceramic bowl on the entryway console table",
      landmarks: ["entryway console table", "ceramic bowl"],
      description: "Silver brass keys attached to a green nylon wrist lanyard.",
      confidence: "medium",
      is_selected: true,
    },
    source: "glasses_sdk",
    image_reference: null,
    coordinates: null,
  };

  const parsed = ConfirmCandidatePayloadSchema.safeParse(indoorPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.coordinates, null);
    assert.equal(parsed.data.image_reference, null);
    assert.equal(parsed.data.candidate.category, "Everyday Carry");
  }
});

test("Phase 25B.3 Schema: Unity payload omitting optional fields defaults correctly", () => {
  const minimalPayload = {
    candidate: {
      id: "cand-unity-3",
      item_name: "Leather Wallet",
      location_description: "On bedside nightstand",
      description: "Brown leather bifold wallet.",
    },
  };

  const parsed = ConfirmCandidatePayloadSchema.safeParse(minimalPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.source, "glasses_sdk");
    assert.deepEqual(parsed.data.candidate.landmarks, []);
    assert.equal(parsed.data.candidate.confidence, "medium");
    assert.equal(parsed.data.coordinates, undefined);
    assert.equal(parsed.data.image_reference, undefined);
  }
});

test("Phase 25B.3 Schema: Rejects invalid candidate (missing description, empty item name)", () => {
  const badPayload1 = {
    candidate: {
      id: "cand-bad-1",
      item_name: "", // Empty name rejected
      location_description: "Desk",
      description: "Description",
    },
  };
  assert.equal(ConfirmCandidatePayloadSchema.safeParse(badPayload1).success, false);

  const badPayload2 = {
    candidate: {
      id: "cand-bad-2",
      item_name: "Valid Name",
      location_description: "Desk",
      description: "", // Empty description rejected
    },
  };
  assert.equal(ConfirmCandidatePayloadSchema.safeParse(badPayload2).success, false);

  const badPayload3 = {
    candidate: {
      id: "cand-bad-3",
      item_name: "Valid Name",
      location_description: "Desk",
      description: "Valid Description",
      confidence: "invalid_confidence", // Bad confidence enum rejected
    },
  };
  assert.equal(ConfirmCandidatePayloadSchema.safeParse(badPayload3).success, false);
});

test("Phase 25B.3 Route: POST /api/items/confirm rejects unauthenticated requests with 401", async () => {
  const req = new Request("http://localhost:3000/api/items/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate: {
        id: "cand-1",
        item_name: "Apartment Keys",
        location_description: "Coffee table",
        description: "Brass carabiner keys",
      },
    }),
  });

  const res = await confirmHandler(req as any);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Missing Bearer token/i);
});

test("Phase 25B.3 Route: POST /api/items/confirm rejects invalid JWT session with 401", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://nfxxdwsfunaazbtncnll.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZNBCMv__TiLCxk67G1ziZA_lb7q9tSF";

    const req = new Request("http://localhost:3000/api/items/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer invalid_expired_unity_jwt_999",
      },
      body: JSON.stringify({
        candidate: {
          id: "cand-1",
          item_name: "Apartment Keys",
          location_description: "Coffee table",
          description: "Brass carabiner keys",
        },
      }),
    });

    const res = await confirmHandler(req as any);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.error, /Unauthorized|Invalid or expired/i);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

