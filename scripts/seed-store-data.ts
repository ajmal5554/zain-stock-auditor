import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export const DEFAULT_CATEGORIES = [
  "Formal Shirts",
  "Casual Shirts",
  "T-Shirts & Polos",
  "Trousers & Chinos",
  "Jeans & Denims",
  "Innerwears & Undergarments",
  "Boxers & Loungewear",
  "Mundus & Dhotis",
  "Kurtas & Traditional",
  "Suits & Blazers",
  "Accessories",
];

export const DEFAULT_BRANDS: { name: string; categories: string[] }[] = [
  {
    name: "Jockey",
    categories: ["Innerwears & Undergarments", "Boxers & Loungewear", "T-Shirts & Polos"],
  },
  {
    name: "VIP",
    categories: ["Innerwears & Undergarments", "Boxers & Loungewear"],
  },
  {
    name: "Dixcy Scott",
    categories: ["Innerwears & Undergarments", "T-Shirts & Polos"],
  },
  {
    name: "Rupa",
    categories: ["Innerwears & Undergarments", "Boxers & Loungewear"],
  },
  {
    name: "Lux Cozi",
    categories: ["Innerwears & Undergarments", "Boxers & Loungewear"],
  },
  {
    name: "Amul Macho",
    categories: ["Innerwears & Undergarments", "Boxers & Loungewear"],
  },
  {
    name: "Ramraj",
    categories: ["Mundus & Dhotis", "Kurtas & Traditional", "Formal Shirts", "Innerwears & Undergarments"],
  },
  {
    name: "MCR",
    categories: ["Mundus & Dhotis", "Kurtas & Traditional"],
  },
  {
    name: "Raymond",
    categories: ["Formal Shirts", "Trousers & Chinos", "Suits & Blazers"],
  },
  {
    name: "Peter England",
    categories: ["Formal Shirts", "Casual Shirts", "T-Shirts & Polos", "Trousers & Chinos"],
  },
  {
    name: "Van Heusen",
    categories: ["Formal Shirts", "Casual Shirts", "T-Shirts & Polos", "Suits & Blazers"],
  },
  {
    name: "Louis Philippe",
    categories: ["Formal Shirts", "Casual Shirts", "T-Shirts & Polos"],
  },
  {
    name: "Allen Solly",
    categories: ["Casual Shirts", "T-Shirts & Polos", "Trousers & Chinos"],
  },
  {
    name: "Otto",
    categories: ["Casual Shirts", "Formal Shirts", "T-Shirts & Polos"],
  },
  {
    name: "ColorPlus",
    categories: ["Casual Shirts", "Trousers & Chinos", "T-Shirts & Polos"],
  },
  {
    name: "Arrow",
    categories: ["Formal Shirts", "Trousers & Chinos"],
  },
  {
    name: "Siyaram's",
    categories: ["Formal Shirts", "Trousers & Chinos", "Suits & Blazers"],
  },
  {
    name: "Zodiac",
    categories: ["Formal Shirts", "Casual Shirts"],
  },
  {
    name: "Blackberrys",
    categories: ["Formal Shirts", "Suits & Blazers", "Trousers & Chinos"],
  },
  {
    name: "Turtle",
    categories: ["Casual Shirts", "Formal Shirts"],
  },
  {
    name: "Oxemberg",
    categories: ["Formal Shirts", "Casual Shirts"],
  },
  {
    name: "U.S. Polo",
    categories: ["T-Shirts & Polos", "Casual Shirts", "Jeans & Denims"],
  },
  {
    name: "Mufti",
    categories: ["Casual Shirts", "Jeans & Denims", "T-Shirts & Polos"],
  },
  {
    name: "Levis",
    categories: ["Jeans & Denims", "Casual Shirts", "T-Shirts & Polos"],
  },
  {
    name: "Killer",
    categories: ["Jeans & Denims", "Casual Shirts"],
  },
  {
    name: "Spykar",
    categories: ["Jeans & Denims", "T-Shirts & Polos"],
  },
  {
    name: "Unbranded",
    categories: ["*"],
  },
  {
    name: "Local Make",
    categories: ["*"],
  },
];

export const DEFAULT_CATEGORY_SIZE_SCALES: Record<
  string,
  { id: string; name: string; sizes: string[]; default?: boolean }[]
> = {
  "Innerwears & Undergarments": [
    {
      id: "innerwear_adults",
      name: "Adults (75 - 105 cm)",
      sizes: ["75", "80", "85", "90", "95", "100", "105"],
      default: true,
    },
    {
      id: "innerwear_kids",
      name: "Kids (50 - 75 cm)",
      sizes: ["50", "55", "60", "65", "70", "75"],
    },
    {
      id: "innerwear_alpha",
      name: "Standard (S - 3XL)",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    },
    {
      id: "innerwear_waist",
      name: "Waist (30 - 42 in)",
      sizes: ["30", "32", "34", "36", "38", "40", "42"],
    },
  ],
  "T-Shirts & Polos": [
    {
      id: "tshirt_alpha",
      name: "Standard (S - 4XL)",
      sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"],
      default: true,
    },
    {
      id: "tshirt_kids",
      name: "Kids Ages (Years)",
      sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"],
    },
    {
      id: "tshirt_chest",
      name: "Numeric Chest (36 - 46)",
      sizes: ["36", "38", "40", "42", "44", "46"],
    },
  ],
  "Mundus & Dhotis": [
    {
      id: "mundu_std",
      name: "Standard Length",
      sizes: ["Single (2m)", "Double (4m)"],
      default: true,
    },
    {
      id: "mundu_kids",
      name: "Kids Mundu",
      sizes: ["Small (1.5m)", "Medium (1.75m)", "Standard (2m)"],
    },
    {
      id: "mundu_set",
      name: "Set Mundu",
      sizes: ["Standard Set", "Double Set"],
    },
  ],
  "Formal Shirts": [
    {
      id: "shirt_collar",
      name: "Collar Size (38 - 46 cm)",
      sizes: ["38", "39", "40", "42", "44", "46"],
      default: true,
    },
    {
      id: "shirt_alpha",
      name: "Standard Alpha (S - 3XL)",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    },
  ],
  "Casual Shirts": [
    {
      id: "casual_alpha",
      name: "Standard Alpha (S - 3XL)",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
      default: true,
    },
    {
      id: "casual_chest",
      name: "Chest (38 - 46)",
      sizes: ["38", "40", "42", "44", "46"],
    },
  ],
  "Trousers & Chinos": [
    {
      id: "trouser_waist",
      name: "Waist (28 - 44 in)",
      sizes: ["28", "30", "32", "34", "36", "38", "40", "42", "44"],
      default: true,
    },
  ],
  "Jeans & Denims": [
    {
      id: "jeans_waist",
      name: "Waist (28 - 44 in)",
      sizes: ["28", "30", "32", "34", "36", "38", "40", "42", "44"],
      default: true,
    },
  ],
  "Boxers & Loungewear": [
    {
      id: "boxer_waist",
      name: "Waist (30 - 42 in)",
      sizes: ["30", "32", "34", "36", "38", "40", "42"],
      default: true,
    },
    {
      id: "boxer_alpha",
      name: "Standard (S - 3XL)",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    },
  ],
  "Kurtas & Traditional": [
    {
      id: "kurta_sizes",
      name: "Chest / Collar (38 - 46)",
      sizes: ["38", "40", "42", "44", "46"],
      default: true,
    },
    {
      id: "kurta_alpha",
      name: "Standard Alpha (S - 3XL)",
      sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
    },
  ],
  "Suits & Blazers": [
    {
      id: "suit_chest",
      name: "Jacket Chest (36 - 48)",
      sizes: ["36", "38", "40", "42", "44", "46", "48"],
      default: true,
    },
  ],
  Accessories: [
    {
      id: "acc_free",
      name: "Free Size",
      sizes: ["Free Size"],
      default: true,
    },
    {
      id: "acc_std",
      name: "Standard (S - XL)",
      sizes: ["S", "M", "L", "XL"],
    },
  ],
};

export const DEFAULT_CATEGORY_ATTRIBUTES: Record<
  string,
  {
    subtypes?: string[];
    collars?: string[];
    sleeves?: string[];
    fits?: string[];
    fabrics?: string[];
    patterns?: string[];
    borders?: string[];
  }
> = {
  "Innerwears & Undergarments": {
    subtypes: ["Brief", "Trunk", "Boxer Brief", "Vest (Sleeveless)", "Gym Vest", "Drawer"],
    fabrics: ["100% Combed Cotton", "Ribbed Cotton", "Modal Blend", "Cotton Spandex", "Bamboo Cotton"],
    patterns: ["Solid / Plain", "Printed", "Striped Melange"],
  },
  "T-Shirts & Polos": {
    collars: ["Polo / Collar", "Round Neck", "V-Neck", "Hooded / Hoodie", "Henley", "Mock Neck"],
    sleeves: ["Half Sleeve", "Full Sleeve", "Sleeveless"],
    fits: ["Regular Fit", "Slim Fit", "Oversized", "Relaxed Fit"],
    fabrics: ["100% Cotton", "Pique Cotton", "Cotton Spandex Blend", "Poly-Cotton Dry-Fit", "Slub Cotton"],
    patterns: ["Solid / Plain", "Stripes", "Graphic Print", "Colorblock", "Typography"],
  },
  "Formal Shirts": {
    collars: ["Regular Collar", "Cutaway Collar", "Button-Down", "Mandarin / Chinese"],
    sleeves: ["Full Sleeve", "Half Sleeve"],
    fits: ["Slim Fit", "Regular / Classic Fit", "Tailored Fit"],
    fabrics: ["100% Giza Cotton", "Pure Linen", "Cotton Blend", "Oxford Cotton", "Fil-a-Fil", "Silk Blend"],
    patterns: ["Solid / Plain", "Stripes", "Checks", "Micro-Checks", "Self-Textured"],
  },
  "Casual Shirts": {
    collars: ["Casual Spread", "Button-Down", "Mandarin / Chinese", "Cuban / Camp Collar", "Hooded"],
    sleeves: ["Full Sleeve", "Half Sleeve", "Roll-up Sleeve"],
    fits: ["Slim Fit", "Relaxed Fit", "Boxy Fit"],
    fabrics: ["Pure Linen", "Washed Cotton", "Denim / Chambray", "Corduroy", "Flannel", "Cotton Lycra"],
    patterns: ["Checks / Plaid", "Printed / Floral", "Stripes", "Solid / Plain", "Tie-Dye"],
  },
  "Mundus & Dhotis": {
    borders: ["Plain White", "Gold Kasavu Border", "Silver Zari Border", "Color Border", "Temple Border", "Kara Border"],
    fabrics: ["100% Handloom Cotton", "Pure Cotton (Double)", "Tissue Silk", "Art Silk", "Khadi Cotton"],
  },
  "Boxers & Loungewear": {
    subtypes: ["Woven Boxer", "Knit Boxer", "Lounge Pant / Pyjama", "Track Pant", "Shorts"],
    fabrics: ["100% Cotton", "Modal", "Satin Cotton", "Linen Blend"],
    patterns: ["Checks / Tartan", "Fun Prints", "Solid / Plain", "Stripes"],
  },
};

async function seedStore() {
  console.log("🚀 Seeding store defaults into Neon...");

  // 1. Categories
  console.log("Seeding categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await sql`SELECT id FROM "Category" WHERE name = ${cat};`;
    if (existing.length === 0) {
      const id = "cat_" + Math.random().toString(36).substring(2, 9);
      await sql`INSERT INTO "Category" (id, name, "createdAt") VALUES (${id}, ${cat}, NOW());`;
      console.log(`  + Category: ${cat}`);
    }
  }

  // 2. Brands with Categories
  console.log("Seeding brands with category mappings...");
  for (const b of DEFAULT_BRANDS) {
    const id = "brd_" + Math.random().toString(36).substring(2, 9);
    await sql`
      INSERT INTO "Brand" (id, name, categories, "createdAt", "updatedAt")
      VALUES (${id}, ${b.name}, ${b.categories}, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET categories = ${b.categories}, "updatedAt" = NOW();
    `;
    console.log(`  + Brand: ${b.name} -> [${b.categories.join(", ")}]`);
  }

  // 3. Store Settings (Size Scales & Attributes)
  console.log("Seeding store settings (size scales & attributes)...");
  await sql`
    INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
    VALUES ('st_scales', 'category_size_scales', ${JSON.stringify(DEFAULT_CATEGORY_SIZE_SCALES)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(DEFAULT_CATEGORY_SIZE_SCALES)}::jsonb, "updatedAt" = NOW();
  `;

  await sql`
    INSERT INTO "StoreSetting" (id, key, value, "updatedAt")
    VALUES ('st_attrs', 'category_attributes', ${JSON.stringify(DEFAULT_CATEGORY_ATTRIBUTES)}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(DEFAULT_CATEGORY_ATTRIBUTES)}::jsonb, "updatedAt" = NOW();
  `;

  console.log("✅ Store seeding completed successfully!");
}

seedStore().catch(console.error);
