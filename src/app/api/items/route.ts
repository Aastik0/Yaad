import { NextRequest, NextResponse } from "next/server.js";
import { getSupabaseServerClient } from "../../../lib/supabase/server.ts";
import { SupabaseRepository } from "../../../lib/repository/supabaseRepository.ts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
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

    const repository = new SupabaseRepository(supabase, user.id);
    const items = await repository.getItems();

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error: unknown) {
    console.error("API /api/items GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
