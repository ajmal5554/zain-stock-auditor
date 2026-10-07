import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditEntrySchema } from "@/lib/schemas";
import { isShirtCategory } from "@/lib/constants";
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
        { fabric: { contains: search, mode: "insensitive" } },
        { sleeve: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        {
          variants: {
            some: { size: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const sort = searchParams.get("sort") || "created-desc";
    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };

    if (sort === "updated-desc") {
      orderBy = { updatedAt: "desc" };
    } else if (sort === "brand-asc") {
      orderBy = { brand: "asc" };
    } else if (sort === "brand-desc") {
      orderBy = { brand: "desc" };
    } else if (sort === "mrp-asc") {
      orderBy = { mrp: "asc" };
    } else if (sort === "mrp-desc") {
      orderBy = { mrp: "desc" };
    } else {
      orderBy = { createdAt: "desc" };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          orderBy: { size: "asc" },
        },
      },
      orderBy,
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

    // Determine effective color & fit:
    // If user explicitly selected color (e.g. "White", "Navy"), use it.
    // If not selected, store convention considers it "Color" / "Colored".
    const effectiveColor = validated.color?.trim() || "Color";
    const effectiveFit = validated.fit?.trim() || null;

    // Check category to determine if shirt defaults apply
    const categoryRecord = await prisma.category.findUnique({
      where: { id: validated.categoryId },
      select: { name: true },
    });
    const isShirt = categoryRecord?.name ? isShirtCategory(categoryRecord.name) : false;

    // Determine effective pocket:
    // For shirts, unselected pocket style defaults to "Single Pocket" per store convention.
    const rawPocket = validated.customMeta?.pocket?.trim();
    const effectivePocket = rawPocket || (isShirt ? "Single Pocket" : undefined);

    // Prepare customMeta and enriched notes where fit and color are considered notes
    const customMetaObj: Record<string, string> = {
      ...(validated.customMeta || {}),
      ...(effectiveFit ? { fit: effectiveFit } : {}),
      ...(effectivePocket ? { pocket: effectivePocket } : {}),
      color: effectiveColor,
    };

    const extraTags: string[] = [];
    if (effectiveFit) extraTags.push(effectiveFit);
    if (effectiveColor) extraTags.push(effectiveColor);

    let enrichedNotes = validated.notes?.trim() || null;
    if (extraTags.length > 0) {
      const prefix = extraTags.join(" • ");
      enrichedNotes = enrichedNotes ? `${prefix} | ${enrichedNotes}` : prefix;
    }

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
          notes: enrichedNotes ? { equals: enrichedNotes, mode: "insensitive" } : null,
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
            notes: enrichedNotes,
            customMeta: Object.keys(customMetaObj).length > 0 ? customMetaObj : undefined,
          },
        });
      } else {
        // If product already existed, auto-enrich any attribute that was previously missing (e.g. collar, subtype, border)
        const existingMeta = (productRecord.customMeta as Record<string, string>) || {};
        let needsUpdate = false;
        const mergedMeta: Record<string, string> = { ...existingMeta };

        if (!existingMeta.collar && customMetaObj.collar) {
          mergedMeta.collar = customMetaObj.collar;
          needsUpdate = true;
        }
        if (!existingMeta.subtype && customMetaObj.subtype) {
          mergedMeta.subtype = customMetaObj.subtype;
          needsUpdate = true;
        }
        if (!existingMeta.border && customMetaObj.border) {
          mergedMeta.border = customMetaObj.border;
          needsUpdate = true;
        }
        if (!existingMeta.pocket && customMetaObj.pocket) {
          mergedMeta.pocket = customMetaObj.pocket;
          needsUpdate = true;
        }
        if (needsUpdate) {
          productRecord = await tx.product.update({
            where: { id: productRecord.id },
            data: { customMeta: mergedMeta },
          });
        }
      }

      // Auto-link brand to this category so it appears under suggestions for this category
      if (
        validated.brand &&
        validated.brand !== "Unbranded" &&
        validated.brand !== "Local"
      ) {
        try {
          const cat = await tx.category.findUnique({
            where: { id: validated.categoryId },
            select: { name: true },
          });
          if (cat) {
            const existingBrand = await tx.brand.findUnique({
              where: { name: validated.brand },
            });
            if (existingBrand) {
              if (!existingBrand.categories.includes(cat.name) && !existingBrand.categories.includes("*")) {
                await tx.brand.update({
                  where: { id: existingBrand.id },
                  data: { categories: { push: cat.name } },
                });
              }
            } else {
              await tx.brand.create({
                data: {
                  name: validated.brand,
                  categories: [cat.name],
                },
              });
            }
          }
        } catch (brandErr) {
          console.warn("Brand auto-link warning:", brandErr);
        }
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

      await tx.product.update({
        where: { id: productRecord.id },
        data: { updatedAt: new Date() },
      });

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      brand,
      mrp,
      categoryId,
      pattern,
      fabric,
      sleeve,
      fit,
      color,
      collar,
      subtype,
      border,
      pocket,
      customMeta,
      userNote,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { notes: true, customMeta: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existingMeta = (existingProduct.customMeta as Record<string, string>) || {};
    const newMeta: Record<string, string> = { ...existingMeta };

    if (customMeta && typeof customMeta === "object") {
      Object.assign(newMeta, customMeta);
    }

    if (fit !== undefined) {
      if (fit) newMeta.fit = fit;
      else delete newMeta.fit;
    }
    if (color !== undefined) {
      if (color) newMeta.color = color;
      else delete newMeta.color;
    }
    if (collar !== undefined) {
      if (collar) newMeta.collar = collar;
      else delete newMeta.collar;
    }
    if (subtype !== undefined) {
      if (subtype) newMeta.subtype = subtype;
      else delete newMeta.subtype;
    }
    if (border !== undefined) {
      if (border) newMeta.border = border;
      else delete newMeta.border;
    }
    if (pocket !== undefined) {
      if (pocket) newMeta.pocket = pocket;
      else delete newMeta.pocket;
    }

    const data: Record<string, unknown> = {};
    if (brand !== undefined) data.brand = brand.trim() || "Unbranded";
    if (mrp !== undefined) data.mrp = Math.max(1, Math.floor(Number(mrp)));
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (pattern !== undefined) data.pattern = pattern;
    if (fabric !== undefined) data.fabric = fabric;
    if (sleeve !== undefined) data.sleeve = sleeve;

    // Recalculate notes if fit, color, or userNote was sent
    if (
      fit !== undefined ||
      color !== undefined ||
      userNote !== undefined ||
      collar !== undefined ||
      subtype !== undefined ||
      border !== undefined
    ) {
      const extraTags: string[] = [];
      if (newMeta.fit) extraTags.push(newMeta.fit);
      if (newMeta.color) extraTags.push(newMeta.color);

      const noteText = userNote !== undefined ? userNote.trim() : "";
      let finalNotes: string | null = null;
      if (extraTags.length > 0) {
        finalNotes = extraTags.join(" • ");
        if (noteText) finalNotes += ` | ${noteText}`;
      } else {
        finalNotes = noteText || null;
      }
      data.notes = finalNotes;
      data.customMeta = Object.keys(newMeta).length > 0 ? newMeta : undefined;
    } else if (notes !== undefined) {
      data.notes = notes;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        variants: {
          orderBy: { size: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { error: "Failed to update product details" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { error: "Failed to delete product from inventory" },
      { status: 500 }
    );
  }
}
