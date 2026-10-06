import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BrandRow {
  id: string;
  name: string;
  categories: string[];
  createdAt?: string;
  updatedAt?: string;
}

function matchesCategory(categories: string[] | undefined, targetCategory: string): boolean {
  if (!categories || categories.length === 0) return true;
  if (categories.includes("*")) return true;

  const targetLower = targetCategory.toLowerCase().trim();
  const targetClean = targetLower.replace(/s\b|&.*$/g, "").trim();

  return categories.some((c) => {
    const cLower = c.toLowerCase().trim();
    if (cLower === targetLower) return true;
    const cClean = cLower.replace(/s\b|&.*$/g, "").trim();
    if (cClean && targetClean && (targetLower.includes(cClean) || cLower.includes(targetClean))) {
      return true;
    }
    return false;
  });
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category")?.trim();
    const strict = searchParams.get("strict") === "true";

    // 1. Fetch brands from Brand table
    const dbBrands = (await sql`
      SELECT id, name, categories FROM "Brand" ORDER BY name ASC;
    `) as BrandRow[];

    // 2. Fetch distinct brands from Product table to catch any products added during audits
    const productBrands = (await sql`
      SELECT DISTINCT brand as name FROM "Product"
      WHERE brand IS NOT NULL AND TRIM(brand) != '' AND LOWER(brand) NOT IN ('unbranded', 'local');
    `) as { name: string }[];

    // Merge distinct brands: create a map by lowercase name
    const brandMap = new Map<string, BrandRow>();
    for (const b of dbBrands) {
      if (b.name && b.name.trim()) {
        brandMap.set(b.name.trim().toLowerCase(), {
          id: b.id,
          name: b.name.trim(),
          categories: Array.isArray(b.categories) ? b.categories : [],
        });
      }
    }

    for (const pb of productBrands) {
      const trimmed = pb.name?.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!brandMap.has(key)) {
        brandMap.set(key, {
          id: "prod_" + key.replace(/[^a-z0-9]/g, "_"),
          name: trimmed,
          categories: ["*"],
        });
      }
    }

    const allBrands = Array.from(brandMap.values());

    if (categoryParam) {
      // Find category-specific brands from Product table as well
      const catProductBrands = (await sql`
        SELECT DISTINCT p.brand as name 
        FROM "Product" p
        JOIN "Category" c ON p."categoryId" = c.id
        WHERE (LOWER(c.name) = LOWER(${categoryParam}) OR c.name ILIKE ${'%' + categoryParam + '%'})
          AND p.brand IS NOT NULL AND TRIM(p.brand) != '';
      `) as { name: string }[];

      const catProdBrandSet = new Set(
        catProductBrands.map((cp) => cp.name.trim().toLowerCase())
      );

      const decorated = allBrands.map((b) => {
        const isMatched =
          matchesCategory(b.categories, categoryParam) ||
          catProdBrandSet.has(b.name.toLowerCase());
        return {
          ...b,
          inCategory: isMatched,
        };
      });

      if (strict) {
        const strictMatches = decorated.filter((b) => b.inCategory);
        return NextResponse.json(strictMatches, { headers: NO_CACHE_HEADERS });
      }

      // Prioritize category-matched brands first, followed by all other store brands
      decorated.sort((a, b) => {
        if (a.inCategory && !b.inCategory) return -1;
        if (!a.inCategory && b.inCategory) return 1;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json(decorated, { headers: NO_CACHE_HEADERS });
    }

    allBrands.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(allBrands, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json([], { headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const categories: string[] = Array.isArray(body.categories)
      ? body.categories.map((c: string) => c.trim()).filter(Boolean)
      : [];

    if (!name) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    const id = "brd_" + Math.random().toString(36).substring(2, 9);

    // Insert or update category list
    const existing = (await sql`
      SELECT id, name, categories FROM "Brand" WHERE LOWER(name) = LOWER(${name});
    `) as BrandRow[];

    if (existing.length > 0) {
      // Merge categories
      const existingCats = existing[0].categories || [];
      const mergedCats = Array.from(new Set([...existingCats, ...categories]));

      await sql`
        UPDATE "Brand"
        SET categories = ${mergedCats}, "updatedAt" = NOW()
        WHERE id = ${existing[0].id};
      `;

      return NextResponse.json(
        {
          id: existing[0].id,
          name: existing[0].name,
          categories: mergedCats,
          updated: true,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    await sql`
      INSERT INTO "Brand" (id, name, categories, "createdAt", "updatedAt")
      VALUES (${id}, ${name}, ${categories}, NOW(), NOW());
    `;

    return NextResponse.json({ id, name, categories, created: true }, { status: 201, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to create/update brand:", error);
    return NextResponse.json(
      { error: "Failed to save brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, categories } = body;

    if (!id && !name) {
      return NextResponse.json({ error: "Brand ID or Name is required" }, { status: 400 });
    }

    const cleanCategories = Array.isArray(categories)
      ? categories.map((c: string) => c.trim()).filter(Boolean)
      : [];

    if (id) {
      await sql`
        UPDATE "Brand"
        SET name = COALESCE(${name?.trim()}, name),
            categories = ${cleanCategories},
            "updatedAt" = NOW()
        WHERE id = ${id};
      `;
    } else {
      await sql`
        UPDATE "Brand"
        SET categories = ${cleanCategories},
            "updatedAt" = NOW()
        WHERE LOWER(name) = LOWER(${name.trim()});
      `;
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const name = searchParams.get("name")?.trim();
    const all = searchParams.get("all") === "true";

    // Bulk delete all brands
    if (all) {
      await sql`DELETE FROM "Brand";`;
      return NextResponse.json({ success: true, message: "All brands deleted" }, { headers: NO_CACHE_HEADERS });
    }

    // Bulk delete specific IDs or names if passed in JSON body
    let bodyIds: string[] = [];
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          bodyIds = body.ids.filter(Boolean);
        }
      } catch {}
    }

    if (bodyIds.length > 0) {
      await sql`DELETE FROM "Brand" WHERE id = ANY(${bodyIds}) OR name = ANY(${bodyIds});`;
      return NextResponse.json(
        { success: true, count: bodyIds.length },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!id && !name) {
      return NextResponse.json({ error: "Brand ID or Name is required" }, { status: 400 });
    }

    if (id && name) {
      await sql`DELETE FROM "Brand" WHERE id = ${id} OR LOWER(name) = LOWER(${name});`;
    } else if (id) {
      await sql`DELETE FROM "Brand" WHERE id = ${id};`;
    } else if (name) {
      await sql`DELETE FROM "Brand" WHERE LOWER(name) = LOWER(${name});`;
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
