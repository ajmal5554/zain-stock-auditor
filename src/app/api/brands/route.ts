import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POPULAR_RETAIL_BRANDS = [
  "Raymond",
  "Otto",
  "Allen Solly",
  "Ramraj",
  "Jockey",
  "VIP",
  "Dixcy",
  "Rupa",
  "Lux",
  "Amul Macho",
  "Peter England",
  "ColorPlus",
  "Louis Philippe",
  "Van Heusen",
  "Arrow",
  "Oxemberg",
  "Siyaram's",
  "Zodiac",
  "Turtle",
  "Blackberrys",
  "U.S. Polo",
  "Mufti",
  "Unbranded",
  "Local",
];

export async function GET() {
  try {
    const dbBrands = await prisma.product.findMany({
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });

    const dbBrandNames = dbBrands
      .map((b) => b.brand.trim())
      .filter((b) => b.length > 0);

    // Merge DB brands with popular menswear brands, deduplicate case-insensitively
    const brandMap = new Map<string, string>();

    // Add popular retail brands first
    for (const b of POPULAR_RETAIL_BRANDS) {
      brandMap.set(b.toLowerCase(), b);
    }

    // Add all database brands (takes precedence in casing)
    for (const b of dbBrandNames) {
      brandMap.set(b.toLowerCase(), b);
    }

    const allBrands = Array.from(brandMap.values()).sort((a, b) =>
      a.localeCompare(b)
    );

    return NextResponse.json(allBrands);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json(POPULAR_RETAIL_BRANDS);
  }
}
