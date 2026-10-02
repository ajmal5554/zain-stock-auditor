import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { categorySchema } from "@/lib/schemas";

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

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
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

    if (!id) {
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    // Check if category has products
    const productCheck = (await sql`
      SELECT COUNT(id) as cnt FROM "Product" WHERE "categoryId" = ${id};
    `) as { cnt: string | number }[];

    const count = parseInt(String(productCheck[0]?.cnt || 0), 10);
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${count} product style(s) are currently attached to it.` },
        { status: 400 }
      );
    }

    await sql`DELETE FROM "Category" WHERE id = ${id};`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
