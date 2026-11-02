import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { getSupabaseServerClient } from "../../../lib/supabase/server.ts";
import { SupabaseRepository } from "../../../lib/repository/supabaseRepository.ts";
import { INITIAL_TRACKED_ITEMS, INITIAL_OBSERVATIONS } from "../../../data/fixtures.ts";
import type { TrackedItem, ItemObservation } from "../../../types/index.ts";

const RecallQuerySchema = z.object({
  query: z.string().trim().min(1, "Query is required").max(256, "Query cannot exceed 256 characters"),
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

    const parseResult = RecallQuerySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recall query format",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const q = parseResult.data.query.toLowerCase();
    let trackedItems: TrackedItem[] = INITIAL_TRACKED_ITEMS;
    let observations: ItemObservation[] = INITIAL_OBSERVATIONS;
    let isCloud = false;

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (token) {
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

      const repository = new SupabaseRepository(supabase, user.id);
      const [cloudItems, cloudObs] = await Promise.all([
        repository.getItems(),
        repository.getObservations(),
      ]);
      trackedItems = cloudItems;
      observations = cloudObs;
      isCloud = true;
    }

    const match = trackedItems.find((item) => {
      const name = item.item_name.toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const loc = item.last_location_description.toLowerCase();
      const nameWords = name.split(/[\s-]+/).filter((w) => w.length > 2);

      return (
        name.includes(q) ||
        q.includes(name) ||
        nameWords.some((w) => q.includes(w)) ||
        (cat && q.includes(cat)) ||
        loc.includes(q) ||
        item.last_landmarks.some((lm) => q.includes(lm.toLowerCase()))
      );
    });

    if (!match) {
      return NextResponse.json({
        success: true,
        found: false,
        query: parseResult.data.query,
        message: "No sighting recorded.",
        disclaimer: "Yaad records historical sightings only and never guesses present whereabouts.",
        isCloud,
      });
    }

    const latestObs = observations.find(
      (obs) =>
        obs.item_name.toLowerCase() === match.item_name.toLowerCase() ||
        obs.id === match.last_observation_id
    );

    const speechSummary = `Your ${match.item_name} was last recorded at ${match.last_location_description}.`;

    return NextResponse.json({
      success: true,
      found: true,
      query: parseResult.data.query,
      item: {
        id: match.id,
        item_name: match.item_name,
        category: match.category,
        last_location_description: match.last_location_description,
        last_observed_at: match.last_observed_at,
        landmarks: match.last_landmarks,
        image_reference: match.image_reference,
        coordinates: match.coordinates ?? null,
        geofence_radius_meters: match.geofence_radius_meters ?? null,
      },
      observation: latestObs
        ? {
            id: latestObs.id,
            observed_at: latestObs.observed_at,
            confidence: latestObs.confidence,
            description: latestObs.description,
          }
        : null,
      speechSummary,
      disclaimer: "Last recorded historical sighting only; not real-time tracking.",
      isCloud,
    });
  } catch (error: unknown) {
    console.error("API /api/recall POST error:", error);
    const message = error instanceof Error ? error.message : "Internal recall error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
