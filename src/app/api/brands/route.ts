import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { POPULAR_RETAIL_BRANDS } from "@/lib/constants";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category")?.trim();

    // Fetch brands exclusively from Brand table (single source of truth)
    const dbBrands = (await sql`
      SELECT id, name, categories FROM "Brand" ORDER BY name ASC;
    `) as BrandRow[];

    if (categoryParam) {
      // Return brands specifically configured for this category (or universal '*')
      const matched = dbBrands.filter((b) =>
        matchesCategory(b.categories, categoryParam)
      );

      return NextResponse.json(matched);
    }

    // No category filter: return all registered brands in directory
    return NextResponse.json(dbBrands);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    // Fallback to static list if database connection error
    const fallback = POPULAR_RETAIL_BRANDS.map((name: string) => ({
      name,
      categories: ["*"],
    }));
    return NextResponse.json(fallback);
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

      return NextResponse.json({
        id: existing[0].id,
        name: existing[0].name,
        categories: mergedCats,
        updated: true,
      });
    }

    await sql`
      INSERT INTO "Brand" (id, name, categories, "createdAt", "updatedAt")
      VALUES (${id}, ${name}, ${categories}, NOW(), NOW());
    `;

    return NextResponse.json({ id, name, categories, created: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create/update brand:", error);
    return NextResponse.json(
      { error: "Failed to save brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    if (!id && !name) {
      return NextResponse.json({ error: "Brand ID or Name is required" }, { status: 400 });
    }

    if (id && name) {
      await sql`DELETE FROM "Brand" WHERE id = ${id} OR LOWER(name) = LOWER(${name.trim()});`;
    } else if (id) {
      await sql`DELETE FROM "Brand" WHERE id = ${id};`;
    } else if (name) {
      await sql`DELETE FROM "Brand" WHERE LOWER(name) = LOWER(${name.trim()});`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
