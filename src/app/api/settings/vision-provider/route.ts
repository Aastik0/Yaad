import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { VisionProviderState } from "../../../../lib/vision/providerState.ts";
import { getSupabaseServerClient } from "../../../../lib/supabase/server.ts";

const VisionProviderSettingSchema = z.object({
  provider: z.enum(["mock", "meta_muse"]),
  developerConfirmed: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
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

    const state = VisionProviderState.getInstance();
    const eligibility = state.getEligibility(effectiveUserId);

    return NextResponse.json({
      success: true,
      ...eligibility,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve provider settings";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON format in request body" },
        { status: 400 }
      );
    }

    const parseResult = VisionProviderSettingSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Expected provider: 'mock' | 'meta_muse'",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

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

    const { provider, developerConfirmed } = parseResult.data;
    const state = VisionProviderState.getInstance();

    const result = state.selectProvider(provider, {
      userId: effectiveUserId,
      developerConfirmed: developerConfirmed ?? false,
    });

    const eligibility = state.getEligibility(effectiveUserId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Cannot enable selected provider",
          ...eligibility,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Vision AI provider updated to ${result.activeProvider}`,
      ...eligibility,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update provider settings";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

