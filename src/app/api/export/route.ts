import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          orderBy: { size: "asc" },
        },
      },
      orderBy: [
        { category: { name: "asc" } },
        { brand: "asc" },
        { mrp: "asc" },
      ],
    });

    // Flatten into export rows: one row per variant
    const rows = products.flatMap((product) => {
      const meta = (product.customMeta as Record<string, string>) || {};
      const fit =
        meta.fit ||
        product.notes?.match(/(Regular|Slim|Comfort)\s+Fit/i)?.[0] ||
        "";
      const color =
        meta.color ||
        (product.notes?.toLowerCase().includes("white")
          ? "White"
          : "Color");

      return product.variants.map((variant) => ({
        ID: variant.id,
        Category: product.category.name,
        Brand: product.brand,
        Pattern: product.pattern || "",
        Fabric: product.fabric || "",
        Sleeve: product.sleeve || "",
        Fit: fit,
        Color: color,
        Size: variant.size,
        Quantity: variant.quantity,
        "MRP (₹)": product.mrp,
        "Total Value (₹)": variant.quantity * product.mrp,
        Notes: product.notes || "",
        "Last Updated": variant.updatedAt.toISOString().replace("T", " ").slice(0, 19),
      }));
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch export data:", error);
    return NextResponse.json(
      { error: "Failed to fetch export data" },
      { status: 500 }
    );
  }
}
