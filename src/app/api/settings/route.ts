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
      WHERE key IN ('category_size_scales', 'category_attributes', 'store_colors');
    `) as { key: string; value: unknown }[];

    let sizeScales: Record<string, unknown> | null = null;
    let attributes: Record<string, unknown> | null = null;
    let savedColors: string[] = [];

    for (const r of rows) {
      if (r.key === "category_size_scales" && r.value !== undefined && r.value !== null) {
        sizeScales = r.value as Record<string, unknown>;
      }
      if (r.key === "category_attributes" && r.value !== undefined && r.value !== null) {
        attributes = r.value as Record<string, unknown>;
      }
      if (r.key === "store_colors" && Array.isArray(r.value)) {
        savedColors = r.value.filter((c: unknown): c is string => typeof c === "string" && Boolean(c.trim()));
      }
    }

    // Auto-harvest colors from existing products in the store
    const prodRows = (await sql`
      SELECT DISTINCT notes, "customMeta" FROM "Product"
      WHERE notes IS NOT NULL OR "customMeta" IS NOT NULL;
    `) as { notes?: string; customMeta?: Record<string, unknown> }[];

    const harvestedColors = new Set<string>(savedColors);
    for (const p of prodRows) {
      if (p.customMeta && typeof p.customMeta === "object" && typeof p.customMeta.color === "string") {
        const c = p.customMeta.color.trim();
        if (c && c.toLowerCase() !== "null" && c.toLowerCase() !== "undefined") {
          harvestedColors.add(c);
        }
      }
      if (p.notes) {
        const parts = p.notes.split("•").map((s) => s.trim());
        if (parts.length > 1) {
          const colPart = parts[1].split("|")[0].trim();
          if (
            colPart &&
            !colPart.toLowerCase().includes("sleeve") &&
            !colPart.toLowerCase().includes("fit") &&
            colPart.length < 30
          ) {
            harvestedColors.add(colPart);
          }
        }
      }
    }

    const allColors = Array.from(harvestedColors).sort((a, b) => a.localeCompare(b));

    // Return whatever is in database (even if empty); only fallback if setting never initialized
    return NextResponse.json(
      {
        sizeScales: sizeScales ?? {},
        attributes: attributes ?? {},
        colors: allColors,
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
        colors: [],
        hasSavedSettings: false,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sizeScales, attributes, colors, action } = body;

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

    if (colors !== undefined && Array.isArray(colors)) {
      const cleanColors = Array.from(
        new Set(colors.map((c: unknown) => (typeof c === "string" ? c.trim() : "")).filter(Boolean))
      );
      await sql`
        INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
        VALUES ('st_colors', 'store_colors', ${JSON.stringify(cleanColors)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = ${JSON.stringify(cleanColors)}::jsonb, "updatedAt" = NOW();
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
