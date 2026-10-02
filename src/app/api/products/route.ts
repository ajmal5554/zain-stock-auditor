import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditEntrySchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId") || "";

    const where: Record<string, unknown> = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: "insensitive" } },
        { pattern: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        {
          variants: {
            some: { size: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          orderBy: { size: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = auditEntrySchema.parse(body);

    // Find existing product style or create new, then upsert each variant atomically
    const product = await prisma.$transaction(async (tx) => {
      let productRecord = await tx.product.findFirst({
        where: {
          categoryId: validated.categoryId,
          brand: { equals: validated.brand, mode: "insensitive" },
          pattern: validated.pattern ?? null,
          fabric: validated.fabric ?? null,
          sleeve: validated.sleeve ?? null,
          mrp: Math.floor(validated.mrp),
        },
      });

      if (!productRecord) {
        productRecord = await tx.product.create({
          data: {
            categoryId: validated.categoryId,
            brand: validated.brand,
            pattern: validated.pattern ?? null,
            fabric: validated.fabric ?? null,
            sleeve: validated.sleeve ?? null,
            mrp: Math.floor(validated.mrp),
            costPrice: validated.costPrice
              ? Math.floor(validated.costPrice)
              : null,
            notes: validated.notes ?? null,
          },
        });
      }

      // Upsert variants - if a duplicate productId+size exists,
      // increment existing quantity (handles re-counting from different racks)
      for (const variant of validated.variants) {
        if (variant.quantity > 0) {
          await tx.productVariant.upsert({
            where: {
              productId_size: {
                productId: productRecord.id,
                size: variant.size,
              },
            },
            create: {
              productId: productRecord.id,
              size: variant.size,
              quantity: Math.max(0, Math.floor(variant.quantity)),
            },
            update: {
              quantity: {
                increment: Math.max(0, Math.floor(variant.quantity)),
              },
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: productRecord.id },
        include: {
          category: true,
          variants: true,
        },
      });
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { error: "Failed to save audit entry" },
      { status: 500 }
    );
  }
}
