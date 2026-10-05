/**
 * Default starter constants for Store Setup
 * Pure constants without any database queries or execution side effects.
 */

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
  "Shirts": {
    collars: ["Regular Collar", "Mandarin / Chinese Collar", "Button-Down", "Cutaway Collar", "Cuban Collar"],
    sleeves: ["Full Sleeve", "Half Sleeve", "Roll-up Sleeve"],
    fits: ["Regular Fit", "Slim Fit", "Tailored Fit"],
    fabrics: ["Cotton", "Linen", "Cotton Blend", "Giza Cotton", "Oxford Cotton", "Lycra"],
    patterns: ["Plain", "Checks", "Stripes", "Printed", "Micro-Checks"],
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
  "T-Shirts & Polos": {
    collars: ["Polo / Collar", "Round Neck", "V-Neck", "Hooded / Hoodie", "Henley", "Mock Neck"],
    sleeves: ["Half Sleeve", "Full Sleeve", "Sleeveless"],
    fits: ["Regular Fit", "Slim Fit", "Oversized", "Relaxed Fit"],
    fabrics: ["100% Cotton", "Pique Cotton", "Cotton Spandex Blend", "Poly-Cotton Dry-Fit", "Slub Cotton"],
    patterns: ["Solid / Plain", "Stripes", "Graphic Print", "Colorblock", "Typography"],
  },
  "T-shirts": {
    collars: ["Polo / Collar", "Round Neck", "V-Neck", "Hooded / Hoodie", "Henley"],
    sleeves: ["Half Sleeve", "Full Sleeve", "Sleeveless"],
    fits: ["Regular Fit", "Slim Fit", "Oversized"],
    fabrics: ["100% Cotton", "Pique Cotton", "Dry-Fit Blend", "Cotton Spandex"],
    patterns: ["Solid / Plain", "Stripes", "Printed", "Graphic"],
  },
  "Trousers & Chinos": {
    fits: ["Slim Fit", "Regular Fit", "Relaxed Fit", "Comfort Fit", "Tapered"],
    fabrics: ["Cotton Chino", "Poly-Viscose Formal", "Cotton Lycra Stretch", "Linen Blend", "Corduroy"],
    patterns: ["Solid / Plain", "Cross Pocket", "Formal Pleated", "Checks", "Self-Design"],
  },
  "Trousers/Pants": {
    fits: ["Slim Fit", "Regular Fit", "Relaxed Fit", "Comfort Fit"],
    fabrics: ["Cotton Chino", "Poly-Viscose Formal", "Denim", "Linen Blend", "Cotton Lycra Stretch"],
    patterns: ["Solid / Plain", "Cross Pocket", "Formal Pleated", "Checks"],
  },
  "Jeans & Denims": {
    fits: ["Slim Fit", "Regular Straight", "Skinny Fit", "Tapered Fit", "Relaxed / Baggy"],
    fabrics: ["100% Cotton Denim", "Stretch Denim", "Raw Selvedge", "Washed Denim"],
    patterns: ["Clean / Plain", "Faded / Whiskered", "Distressed / Ripped", "Acid Wash"],
  },
  "Innerwears & Undergarments": {
    subtypes: ["Brief", "Trunk", "Boxer Brief", "Vest (Sleeveless)", "Gym Vest", "Drawer"],
    fabrics: ["100% Combed Cotton", "Ribbed Cotton", "Modal Blend", "Cotton Spandex", "Bamboo Cotton"],
    patterns: ["Solid / Plain", "Printed", "Striped Melange"],
  },
  "Innerwear": {
    subtypes: ["Brief", "Trunk", "Boxer Brief", "Vest (Sleeveless)", "Gym Vest", "Drawer"],
    fabrics: ["100% Combed Cotton", "Ribbed Cotton", "Modal Blend", "Cotton Spandex"],
    patterns: ["Solid / Plain", "Printed", "Striped Melange"],
  },
  "Boxers & Loungewear": {
    subtypes: ["Woven Boxer", "Knit Boxer", "Lounge Pant / Pyjama", "Track Pant", "Shorts"],
    fabrics: ["100% Cotton", "Modal", "Satin Cotton", "Linen Blend", "Hosiery Cotton"],
    patterns: ["Checks / Tartan", "Fun Prints", "Solid / Plain", "Stripes"],
  },
  "Mundus & Dhotis": {
    borders: ["Plain White", "Gold Kasavu Border", "Silver Zari Border", "Color Border", "Temple Border", "Kara Border", "Double Border"],
    fabrics: ["100% Handloom Cotton", "Pure Cotton (Double)", "Tissue Silk", "Art Silk", "Khadi Cotton"],
  },
  "Mundus": {
    borders: ["Plain White", "Gold Kasavu Border", "Silver Zari Border", "Color Border", "Double Border", "Kara Border"],
    fabrics: ["100% Handloom Cotton", "Pure Cotton (Double)", "Tissue Silk", "Art Silk"],
  },
  "Kurtas & Traditional": {
    collars: ["Mandarin / Chinese", "Round Neck", "Nehru Collar", "Button Collar"],
    sleeves: ["Full Sleeve", "Half Sleeve", "Roll-up Sleeve"],
    fabrics: ["100% Pure Cotton", "Pure Linen", "Silk Blend", "Khadi Cotton", "Jacquard Silk"],
    patterns: ["Solid / Plain", "Printed", "Embroidered", "Self-Textured", "Chikankari"],
  },
  "Suits & Blazers": {
    fits: ["Slim Fit", "Classic Fit", "Tailored Fit", "Super Slim"],
    fabrics: ["Poly-Wool Blend", "Pure Wool", "Linen Blend", "Cotton Velvet", "Tweed"],
    patterns: ["Solid / Plain", "Checks / Houndstooth", "Pinstripes", "Self-Jacquard"],
  },
  "Accessories": {
    subtypes: ["Belt (Leather)", "Wallet", "Tie", "Socks", "Handkerchief", "Cap", "Bowtie"],
    fabrics: ["Genuine Leather", "PU Leather", "100% Cotton", "Microfiber Silk", "Combed Cotton"],
    patterns: ["Solid / Plain", "Textured", "Printed", "Stripes"],
  },
};

/**
 * Resolves category attributes with full fallback cascade:
 * 1. Exact user custom attributes from database
 * 2. Normalized / case-insensitive user custom attributes
 * 3. Exact system defaults
 * 4. Normalized system defaults
 * 5. Garment type keyword heuristic
 * 6. Non-empty general apparel fallback
 */
export function resolveCategoryAttributes(
  catName: string,
  customAttrsMap?: Record<
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
  >
): {
  subtypes?: string[];
  collars?: string[];
  sleeves?: string[];
  fits?: string[];
  fabrics?: string[];
  patterns?: string[];
  borders?: string[];
} {
  if (!catName || !catName.trim()) return {};

  const trimmed = catName.trim();

  // Helper to check if attribute object has any non-empty arrays
  const hasValues = (obj: any): boolean => {
    if (!obj || typeof obj !== "object") return false;
    return Object.values(obj).some((arr) => Array.isArray(arr) && arr.length > 0);
  };

  // 1. Direct match in user's saved settings
  if (customAttrsMap && customAttrsMap[trimmed] && hasValues(customAttrsMap[trimmed])) {
    return customAttrsMap[trimmed];
  }

  // 2. Case-insensitive / normalized match in user's saved settings
  if (customAttrsMap) {
    const targetNorm = trimmed.toLowerCase().replace(/s\b|&.*$|\/.*$/g, "").trim();
    for (const [key, attrs] of Object.entries(customAttrsMap)) {
      const keyNorm = key.toLowerCase().replace(/s\b|&.*$|\/.*$/g, "").trim();
      if (
        (keyNorm === targetNorm || key.toLowerCase() === trimmed.toLowerCase()) &&
        hasValues(attrs)
      ) {
        return attrs;
      }
    }
  }

  // 3. Direct match in system defaults
  if (DEFAULT_CATEGORY_ATTRIBUTES[trimmed] && hasValues(DEFAULT_CATEGORY_ATTRIBUTES[trimmed])) {
    return DEFAULT_CATEGORY_ATTRIBUTES[trimmed];
  }

  // 4. Case-insensitive / normalized match in system defaults
  const targetNorm = trimmed.toLowerCase().replace(/s\b|&.*$|\/.*$/g, "").trim();
  for (const [key, attrs] of Object.entries(DEFAULT_CATEGORY_ATTRIBUTES)) {
    const keyNorm = key.toLowerCase().replace(/s\b|&.*$|\/.*$/g, "").trim();
    if (
      (keyNorm === targetNorm || key.toLowerCase() === trimmed.toLowerCase()) &&
      hasValues(attrs)
    ) {
      return attrs;
    }
  }

  // 5. Keyword heuristic match
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("pant") ||
    lower.includes("trouser") ||
    lower.includes("chino") ||
    lower.includes("jean") ||
    lower.includes("denim")
  ) {
    return (
      DEFAULT_CATEGORY_ATTRIBUTES["Trousers & Chinos"] || {
        fits: ["Slim Fit", "Regular Fit", "Relaxed Fit"],
        fabrics: ["Cotton Chino", "Denim", "Poly-Viscose Formal"],
        patterns: ["Plain", "Cross Pocket", "Formal Pleated"],
      }
    );
  }
  if (lower.includes("t-shirt") || lower.includes("tshirt") || lower.includes("polo")) {
    return DEFAULT_CATEGORY_ATTRIBUTES["T-Shirts & Polos"];
  }
  if (lower.includes("shirt")) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Shirts"] || DEFAULT_CATEGORY_ATTRIBUTES["Formal Shirts"];
  }
  if (
    lower.includes("inner") ||
    lower.includes("undergarment") ||
    lower.includes("brief") ||
    lower.includes("vest")
  ) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Innerwears & Undergarments"];
  }
  if (
    lower.includes("boxer") ||
    lower.includes("lounge") ||
    lower.includes("pyjama") ||
    lower.includes("short")
  ) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Boxers & Loungewear"];
  }
  if (lower.includes("mundu") || lower.includes("dhoti") || lower.includes("lungi")) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Mundus & Dhotis"];
  }
  if (
    lower.includes("kurta") ||
    lower.includes("traditional") ||
    lower.includes("jubba") ||
    lower.includes("sherwani")
  ) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Kurtas & Traditional"];
  }
  if (
    lower.includes("suit") ||
    lower.includes("blazer") ||
    lower.includes("coat") ||
    lower.includes("jacket")
  ) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Suits & Blazers"];
  }
  if (
    lower.includes("access") ||
    lower.includes("belt") ||
    lower.includes("wallet") ||
    lower.includes("tie") ||
    lower.includes("sock")
  ) {
    return DEFAULT_CATEGORY_ATTRIBUTES["Accessories"];
  }

  // 6. Generic garment fallback — NEVER empty!
  return {
    fabrics: ["Cotton", "Linen", "Cotton Blend", "Synthetic"],
    patterns: ["Plain", "Checks", "Stripes", "Printed"],
    fits: ["Regular Fit", "Slim Fit"],
  };
}

