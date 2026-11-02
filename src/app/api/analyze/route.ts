import { NextRequest, NextResponse } from "next/server.js";
import { AnalyzeRequestSchema } from "../../../lib/schemas.ts";
import { analyzeScene } from "../../../lib/meta.ts";
import { getSupabaseServerClient } from "../../../lib/supabase/server.ts";
import { VisionProviderState } from "../../../lib/vision/providerState.ts";

// Set route execution timeout ceiling to 60 seconds for reasoning model analysis
export const maxDuration = 60;

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

    // Validate request structure and payload boundaries
    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Derive user identity server-side from verified JWT, never trust client-provided userId
    let effectiveUserId = "demo-user";
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (token) {
      const supabase = getSupabaseServerClient(token);
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        if (user) {
          effectiveUserId = user.id;
        }
      }
    }

    // Server-Side Provider Validation
    const providerState = VisionProviderState.getInstance();
    const eligibility = providerState.getEligibility(effectiveUserId);

    const clientRequestedLive =
      parseResult.data.requestedProvider === "meta_muse" ||
      parseResult.data.forceLive;

    const wantsLive =
      clientRequestedLive || eligibility.activeProvider === "meta_muse";

    if (wantsLive) {
      // 1. Mandatory user confirmation check
      if (!parseResult.data.liveConfirmed) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Live AI inference requires explicit user confirmation before consuming Meta API credits.",
          },
          { status: 400 }
        );
      }

      // 2. Server gate validation
      if (!eligibility.eligibleForLive) {
        const blockingReasons = eligibility.reasons.filter(
          (r) => !r.includes("Mock AI is currently selected")
        );
        return NextResponse.json(
          {
            success: false,
            error: `Live Meta Muse inference blocked: ${blockingReasons.join("; ")}`,
            gates: eligibility.gates,
          },
          { status: 403 }
        );
      }
    }

    const payload = {
      ...parseResult.data,
      userId: effectiveUserId,
      forceLive: wantsLive && eligibility.eligibleForLive,
    };

    let result;
    try {
      result = await analyzeScene(payload);
    } finally {
      // Disarm live mode after any live inference attempt to prevent accidental repeats
      if (wantsLive) {
        providerState.selectProvider("mock");
      }
    }

    return NextResponse.json({
      success: true,
      candidates: result.candidates,
      scene_context: result.scene_context,
      uncertainty_notes: result.uncertainty_notes,
      source: result.source,
      metaModel: result.metaModel,
      cached: result.cached || false,
    });
  } catch (error: unknown) {
    console.error("API /api/analyze error:", error);
    const message = error instanceof Error ? error.message : "Internal analysis error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
