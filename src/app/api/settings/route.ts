import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  DEFAULT_CATEGORY_SIZE_SCALES,
  DEFAULT_CATEGORY_ATTRIBUTES,
} from "../../../../scripts/seed-store-data";

export async function GET() {
  try {
    const rows = (await sql`
      SELECT key, value FROM "StoreSetting"
      WHERE key IN ('category_size_scales', 'category_attributes');
    `) as { key: string; value: unknown }[];

    let sizeScales = DEFAULT_CATEGORY_SIZE_SCALES;
    let attributes = DEFAULT_CATEGORY_ATTRIBUTES;

    for (const r of rows) {
      if (r.key === "category_size_scales" && r.value) {
        sizeScales = r.value as typeof DEFAULT_CATEGORY_SIZE_SCALES;
      }
      if (r.key === "category_attributes" && r.value) {
        attributes = r.value as typeof DEFAULT_CATEGORY_ATTRIBUTES;
      }
    }

    return NextResponse.json({
      sizeScales,
      attributes,
    });
  } catch (error) {
    console.error("Failed to load store settings:", error);
    // Return defaults if database error occurs
    return NextResponse.json({
      sizeScales: DEFAULT_CATEGORY_SIZE_SCALES,
      attributes: DEFAULT_CATEGORY_ATTRIBUTES,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sizeScales, attributes } = body;

    if (sizeScales) {
      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_scales', 'category_size_scales', ${JSON.stringify(sizeScales)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(sizeScales)}::jsonb, "updatedAt" = NOW();
      `;
    }

    if (attributes) {
      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_attrs', 'category_attributes', ${JSON.stringify(attributes)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(attributes)}::jsonb, "updatedAt" = NOW();
      `;
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Failed to save store settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
