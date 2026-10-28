import { NextResponse } from "next/server";
import { getUsageLedger } from "@/lib/meta";

export async function GET() {
  try {
    const summary = getUsageLedger();
    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error reading usage";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

