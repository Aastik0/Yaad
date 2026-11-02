import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { getSupabaseServerClient } from "../../../../lib/supabase/server.ts";
import { SupabaseRepository } from "../../../../lib/repository/supabaseRepository.ts";
import { CandidateItemSchema, GeoCoordinatesSchema } from "../../../../lib/schemas.ts";
import type { ItemObservation, TrackedItem } from "../../../../types/index.ts";

const ConfirmCandidatePayloadSchema = z.object({
  candidate: CandidateItemSchema,
  source: z.enum(["browser_upload", "browser_camera", "glasses_sdk", "manual"]).default("glasses_sdk"),
  image_reference: z.string().nullable().optional(),
  coordinates: GeoCoordinatesSchema.nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON format in request body",
        },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Missing Bearer token in Authorization header.",
        },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient(token);
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Database service not configured.",
        },
        { status: 503 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or expired session token.",
        },
        { status: 401 }
      );
    }

    const parseResult = ConfirmCandidatePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid candidate confirmation payload",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { candidate, source, image_reference, coordinates } = parseResult.data;
    const repository = new SupabaseRepository(supabase, user.id);
    const now = new Date().toISOString();

    // Idempotency guard: prevent duplicate observation from rapid double-pinch or network retry
    const existingObservations = await repository.getObservations();
    const recentDuplicate = existingObservations.find((obs) => {
      const sameName = obs.item_name.toLowerCase() === candidate.item_name.toLowerCase();
      const sameLoc = obs.location_description.toLowerCase() === candidate.location_description.toLowerCase();
      const timeDiffMs = Math.abs(Date.now() - new Date(obs.observed_at).getTime());
      return sameName && sameLoc && timeDiffMs < 5000;
    });

    if (recentDuplicate) {
      const existingItems = await repository.getItems();
      const matchedItem = existingItems.find(
        (i) => i.item_name.toLowerCase() === candidate.item_name.toLowerCase()
      );
      if (matchedItem) {
        return NextResponse.json({
          success: true,
          item: matchedItem,
          observation: recentDuplicate,
          duplicateIgnored: true,
        });
      }
    }

    // 1. Create confirmed Observation record strictly under authenticated user's ID
    const newObs: ItemObservation = {
      id: `obs-${Date.now()}-${candidate.id}`,
      user_id: user.id,
      item_name: candidate.item_name,
      item_category: candidate.category || "Belonging",
      location_description: candidate.location_description,
      landmarks: candidate.landmarks || [],
      description: candidate.description,
      confidence: candidate.confidence,
      observed_at: now,
      source: source || "glasses_sdk",
      image_reference: image_reference ?? undefined,
      coordinates: coordinates ?? undefined,
      user_confirmed: true,
      created_at: now,
    };

    const savedObs = await repository.saveObservation(newObs);

    // 2. Find or create TrackedItem record
    const existingItems = await repository.getItems();
    const existingItem = existingItems.find(
      (item) => item.item_name.toLowerCase() === candidate.item_name.toLowerCase()
    );

    let savedItem: TrackedItem;

    if (existingItem) {
      savedItem = await repository.updateItem(existingItem.id, {
        status: "suggested",
        last_observation_id: savedObs.id,
        last_location_description: candidate.location_description,
        last_landmarks: candidate.landmarks || [],
        last_observed_at: now,
        image_reference: (image_reference ?? undefined) || existingItem.image_reference,
        coordinates: (coordinates ?? undefined) || existingItem.coordinates,
      });
    } else {
      const newItem: TrackedItem = {
        id: `item-${Date.now()}`,
        user_id: user.id,
        item_name: candidate.item_name,
        category: candidate.category || "Belonging",
        status: "suggested",
        last_observation_id: savedObs.id,
        last_location_description: candidate.location_description,
        last_landmarks: candidate.landmarks || [],
        last_observed_at: now,
        image_reference: image_reference ?? undefined,
        coordinates: coordinates ?? undefined,
        geofence_radius_meters: 50,
        updated_at: now,
      };

      savedItem = await repository.saveItem(newItem);
    }

    return NextResponse.json({
      success: true,
      item: savedItem,
      observation: savedObs,
    });
  } catch (error: unknown) {
    console.error("API /api/items/confirm POST error:", error);
    const message = error instanceof Error ? error.message : "Internal confirmation error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
