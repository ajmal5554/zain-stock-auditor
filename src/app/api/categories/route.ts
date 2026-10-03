import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { categorySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

interface CategoryRow {
  id: string;
  name: string;
  count?: string | number;
}

export async function GET() {
  try {
    const categories = (await sql`
      SELECT c.id, c.name, COUNT(p.id) as product_count
      FROM "Category" c
      LEFT JOIN "Product" p ON c.id = p."categoryId"
      GROUP BY c.id, c.name
      ORDER BY c.name ASC;
    `) as { id: string; name: string; product_count: string | number }[];

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      _count: {
        products: parseInt(String(c.product_count || 0), 10),
      },
    }));

    return NextResponse.json(formatted, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = categorySchema.parse(body);
    const trimmedName = validated.name.trim();

    const existing = (await sql`
      SELECT id FROM "Category" WHERE LOWER(name) = LOWER(${trimmedName});
    `) as CategoryRow[];

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    const id = "cat_" + Math.random().toString(36).substring(2, 9);
    await sql`
      INSERT INTO "Category" (id, name, "createdAt")
      VALUES (${id}, ${trimmedName}, NOW());
    `;

    return NextResponse.json({ id, name: trimmedName }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Category ID and new name required" }, { status: 400 });
    }

    const trimmed = name.trim();

    // Check conflict
    const conflict = (await sql`
      SELECT id FROM "Category" WHERE LOWER(name) = LOWER(${trimmed}) AND id != ${id};
    `) as CategoryRow[];

    if (conflict.length > 0) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }

    await sql`
      UPDATE "Category"
      SET name = ${trimmed}
      WHERE id = ${id};
    `;

    return NextResponse.json({ success: true, id, name: trimmed });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Failed to update category", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const force = searchParams.get("force") === "true";

    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    // Get category name
    const catRows = (await sql`
      SELECT name FROM "Category" WHERE id = ${id};
    `) as { name: string }[];

    if (catRows.length === 0) {
      return NextResponse.json({ success: true, message: "Category not found or already deleted" });
    }

    const catName = catRows[0].name;

    // Check if category has products
    const productCheck = (await sql`
      SELECT COUNT(id) as cnt FROM "Product" WHERE "categoryId" = ${id};
    `) as { cnt: string | number }[];

    const count = parseInt(String(productCheck[0]?.cnt || 0), 10);
    if (count > 0 && !force) {
      return NextResponse.json(
        {
          error: `Cannot delete category: ${count} product style(s) are currently attached to it.`,
          hasProducts: true,
          productCount: count,
        },
        { status: 400 }
      );
    }

    if (count > 0 && force) {
      // Cascade delete product variants and products
      await sql`
        DELETE FROM "ProductVariant"
        WHERE "productId" IN (SELECT id FROM "Product" WHERE "categoryId" = ${id});
      `;
      await sql`
        DELETE FROM "Product" WHERE "categoryId" = ${id};
      `;
    }

    // Delete category
    await sql`DELETE FROM "Category" WHERE id = ${id};`;

    // Clean up category from brands
    const allBrands = (await sql`
      SELECT id, categories FROM "Brand" WHERE ${catName} = ANY(categories);
    `) as { id: string; categories: string[] }[];

    for (const b of allBrands) {
      const updatedCats = (b.categories || []).filter((c) => c !== catName);
      await sql`
        UPDATE "Brand"
        SET categories = ${updatedCats}, "updatedAt" = NOW()
        WHERE id = ${b.id};
      `;
    }

    // Clean up category from StoreSetting (size scales and attributes)
    const settings = (await sql`
      SELECT key, value FROM "StoreSetting"
      WHERE key IN ('category_size_scales', 'category_attributes');
    `) as { key: string; value: Record<string, unknown> }[];

    for (const s of settings) {
      if (s.value && typeof s.value === "object" && catName in s.value) {
        const updated = { ...s.value };
        delete updated[catName];
        await sql`
          UPDATE "StoreSetting"
          SET value = ${JSON.stringify(updated)}::jsonb, "updatedAt" = NOW()
          WHERE key = ${s.key};
        `;
      }
    }

    return NextResponse.json({ success: true, deletedCategory: catName });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
