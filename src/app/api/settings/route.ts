import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  DEFAULT_CATEGORY_SIZE_SCALES,
  DEFAULT_CATEGORY_ATTRIBUTES,
} from "@/lib/store-defaults";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const rows = (await sql`
      SELECT key, value FROM "StoreSetting"
      WHERE key IN ('category_size_scales', 'category_attributes');
    `) as { key: string; value: unknown }[];

    let sizeScales: Record<string, unknown> | null = null;
    let attributes: Record<string, unknown> | null = null;

    for (const r of rows) {
      if (r.key === "category_size_scales" && r.value !== undefined && r.value !== null) {
        sizeScales = r.value as Record<string, unknown>;
      }
      if (r.key === "category_attributes" && r.value !== undefined && r.value !== null) {
        attributes = r.value as Record<string, unknown>;
      }
    }

    // Return whatever is in database (even if empty); only fallback if setting never initialized
    return NextResponse.json(
      {
        sizeScales: sizeScales ?? {},
        attributes: attributes ?? {},
        hasSavedSettings: rows.length > 0,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to load store settings:", error);
    return NextResponse.json(
      {
        sizeScales: {},
        attributes: {},
        hasSavedSettings: false,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sizeScales, attributes, action } = body;

    if (action === "reset_defaults") {
      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_scales', 'category_size_scales', ${JSON.stringify(DEFAULT_CATEGORY_SIZE_SCALES)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(DEFAULT_CATEGORY_SIZE_SCALES)}::jsonb, "updatedAt" = NOW();
      `;

      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_attrs', 'category_attributes', ${JSON.stringify(DEFAULT_CATEGORY_ATTRIBUTES)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(DEFAULT_CATEGORY_ATTRIBUTES)}::jsonb, "updatedAt" = NOW();
      `;

      return NextResponse.json({
        success: true,
        message: "Settings reset to defaults",
        sizeScales: DEFAULT_CATEGORY_SIZE_SCALES,
        attributes: DEFAULT_CATEGORY_ATTRIBUTES,
      });
    }

    if (sizeScales !== undefined) {
      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_scales', 'category_size_scales', ${JSON.stringify(sizeScales)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(sizeScales)}::jsonb, "updatedAt" = NOW();
      `;
    }

    if (attributes !== undefined) {
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
