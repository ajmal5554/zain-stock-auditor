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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category")?.trim();

    // Fetch brands from Brand table
    const dbBrands = (await sql`
      SELECT id, name, categories FROM "Brand" ORDER BY name ASC;
    `) as BrandRow[];

    // Fetch distinct brands from Product table
    const productBrands = (await sql`
      SELECT DISTINCT brand FROM "Product" WHERE brand IS NOT NULL AND brand != '';
    `) as { brand: string }[];

    if (categoryParam) {
      // Find category-specific brands:
      // Match if brand has categoryParam in categories array OR has '*' (universal)
      const matched = dbBrands.filter((b) => {
        if (!b.categories || b.categories.length === 0) return true;
        return (
          b.categories.includes("*") ||
          b.categories.some(
            (c) => c.toLowerCase() === categoryParam.toLowerCase()
          )
        );
      });

      // Also find brands already audited under this category
      const catProducts = (await sql`
        SELECT DISTINCT p.brand
        FROM "Product" p
        JOIN "Category" c ON p."categoryId" = c.id
        WHERE LOWER(c.name) = LOWER(${categoryParam})
        AND p.brand IS NOT NULL AND p.brand != '';
      `) as { brand: string }[];

      const brandMap = new Map<string, { id?: string; name: string; categories: string[] }>();

      // Add matched category brands
      for (const b of matched) {
        brandMap.set(b.name.toLowerCase(), b);
      }

      // Add brands from existing products in this category
      for (const pb of catProducts) {
        if (!brandMap.has(pb.brand.toLowerCase())) {
          brandMap.set(pb.brand.toLowerCase(), {
            name: pb.brand,
            categories: [categoryParam],
          });
        }
      }

      // If category has few or no brands matched, include default popular brands
      if (brandMap.size < 5) {
        for (const b of dbBrands) {
          if (!brandMap.has(b.name.toLowerCase())) {
            brandMap.set(b.name.toLowerCase(), b);
          }
        }
      }

      const results = Array.from(brandMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      return NextResponse.json(results);
    }

    // No category filter: return full catalog of brands
    const brandMap = new Map<string, { id?: string; name: string; categories: string[] }>();

    for (const b of dbBrands) {
      brandMap.set(b.name.toLowerCase(), b);
    }

    // Merge any brands found in Product that might not be in Brand table
    for (const pb of productBrands) {
      if (!brandMap.has(pb.brand.toLowerCase())) {
        brandMap.set(pb.brand.toLowerCase(), {
          name: pb.brand,
          categories: ["*"],
        });
      }
    }

    const allBrands = Array.from(brandMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json(allBrands);
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

    if (id) {
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
