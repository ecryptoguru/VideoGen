import { NextRequest, NextResponse } from "next/server";
import { getBrandKit, updateBrandKit } from "@/lib/db-queries";
import { ALLOWED_BRAND_KIT_COLS } from "@/lib/db-queries";

export async function GET() {
  try {
    const brandKit = getBrandKit();
    return NextResponse.json(brandKit || {});
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if ((ALLOWED_BRAND_KIT_COLS as unknown as Set<string>).has(key)) {
        filtered[key] = body[key];
      }
    }
    updateBrandKit(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
