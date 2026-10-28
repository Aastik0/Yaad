import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/schemas";
import { analyzeScene } from "@/lib/meta";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request structure
    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await analyzeScene(parseResult.data);

    return NextResponse.json({
      success: true,
      candidates: result.candidates,
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

