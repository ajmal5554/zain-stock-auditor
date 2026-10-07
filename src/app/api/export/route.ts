import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isShirtCategory } from "@/lib/constants";

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
        product.notes?.match(/(Regular|Slim|Comfort|Relaxed|Oversized|Classic)\s+Fit/i)?.[0] ||
        "";
      const color =
        meta.color ||
        (product.notes?.toLowerCase().includes("white")
          ? "White"
          : "Color");
      const collar = meta.collar || "";
      const subtype = meta.subtype || "";
      const border = meta.border || "";
      const isShirt = isShirtCategory(product.category?.name || "");
      const pocket =
        meta.pocket ||
        product.notes?.match(/(No Pocket|Single Pocket|Double Pocket)/i)?.[0] ||
        (isShirt ? "Single Pocket" : "");

      // Extract real user notes/remarks, excluding the fit • color tags
      let cleanNote = "";
      if (product.notes) {
        if (product.notes.includes("|")) {
          cleanNote = product.notes.split("|").slice(1).join("|").trim();
        } else {
          cleanNote = product.notes
            .replace(/(Regular|Slim|Comfort|Relaxed|Oversized|Classic)\s+Fit/gi, "")
            .replace(/•\s*(White|Color|[a-zA-Z\s]+)/gi, "")
            .replace(/^[\s•|]+|[\s•|]+$/g, "")
            .trim();
        }
      }

      // Collect any custom attributes (e.g. Rise, Closure, Button Type)
      const customPairs = Object.entries(meta)
        .filter(([k]) => !["subtype", "collar", "border", "pocket", "fit", "color"].includes(k) && meta[k])
        .map(([k, v]) => `${k}: ${v}`);

      if (customPairs.length > 0) {
        const customStr = customPairs.join(" • ");
        cleanNote = cleanNote ? `${customStr} | ${cleanNote}` : customStr;
      }

      return product.variants.map((variant) => ({
        ID: variant.id,
        Category: product.category.name,
        Subtype: subtype,
        Brand: product.brand,
        Pattern: product.pattern || "",
        Fabric: product.fabric || "",
        Collar: collar,
        Pocket: pocket,
        Sleeve: product.sleeve || "",
        Fit: fit,
        Color: color,
        Border: border,
        Size: variant.size,
        Quantity: variant.quantity,
        "MRP (₹)": product.mrp,
        "Total Value (₹)": variant.quantity * product.mrp,
        Notes: cleanNote,
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
