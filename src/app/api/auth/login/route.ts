import { NextRequest, NextResponse } from "next/server.js";
import { AuthCredentialsSchema } from "../../../../lib/schemas.ts";
import { getSupabaseServerClient } from "../../../../lib/supabase/server.ts";

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

    const parseResult = AuthCredentialsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password format",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase authentication is not configured on this server.",
          isDemoMode: true,
        },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parseResult.data.email,
      password: parseResult.data.password,
    });

    if (error || !data.session) {
      // Prevent user enumeration: provide uniform error message unless email confirmation is pending
      const isEmailNotConfirmed = error?.message?.toLowerCase().includes("email not confirmed");
      const safeErrorMessage = isEmailNotConfirmed
        ? "Please check your inbox and confirm your email address before signing in."
        : "Invalid email or password.";

      return NextResponse.json(
        {
          success: false,
          error: safeErrorMessage,
        },
        { status: 401 }
      );
    }

    // Return the session tokens without exposing service-role or sensitive internal keys
    return NextResponse.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal login error";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
