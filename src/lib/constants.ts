/** Size presets per category keyword */
export const SIZE_PRESETS: Record<string, string[]> = {
  shirt: ["38", "39", "40", "42", "44", "46"],
  pant: ["30", "32", "34", "36", "38", "40", "42"],
  pants: ["30", "32", "34", "36", "38", "40", "42"],
  trouser: ["30", "32", "34", "36", "38", "40", "42"],
  trousers: ["30", "32", "34", "36", "38", "40", "42"],
  "trousers/pants": ["30", "32", "34", "36", "38", "40", "42"],
  mundu: ["Single", "Double"],
  mundus: ["Single", "Double"],
  dhoti: ["Single", "Double"],
  dhotis: ["Single", "Double"],
  lungi: ["Free Size"],
  innerwear: ["75", "80", "85", "90", "95", "100", "105"],
  accessory: ["Free Size"],
  accessories: ["Free Size"],
  belt: ["Free Size"],
  default: ["S", "M", "L", "XL", "XXL"],
};

/** Innerwear size scales for Indian retail */
export const INNERWEAR_SIZE_SCALES = {
  numeric: {
    label: "Numeric (75–105 cm)",
    description: "Standard Indian brands (VIP, Rupa, Lux, Amul Macho)",
    sizes: ["75", "80", "85", "90", "95", "100", "105", "110"],
  },
  waist: {
    label: "Waist (30–42 in)",
    description: "Trunks & Briefs (Jockey, Dixcy, Van Heusen)",
    sizes: ["30", "32", "34", "36", "38", "40", "42"],
  },
  alpha: {
    label: "Standard (S–3XL)",
    description: "Boxers & Loungewear",
    sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
  },
};

/** Categories that should NOT show sleeve options */
export const NO_SLEEVE_CATEGORIES = [
  "pants",
  "pant",
  "trousers",
  "trouser",
  "trousers/pants",
  "mundu",
  "mundus",
  "dhoti",
  "dhotis",
  "belt",
  "belts",
  "accessory",
  "accessories",
  "innerwear",
];

/** Pattern options */
export const PATTERNS = [
  "Plain",
  "Check",
  "Stripe",
  "Printed",
  "Self-Design",
  "Textured",
];

/** Sleeve options */
export const SLEEVES = ["Full Sleeve", "Half Sleeve", "Sleeveless"];

/** Fabric options */
export const FABRICS = [
  "Cotton",
  "Linen",
  "Poly-Blend",
  "Silk Blend",
  "Denim",
  "Hosiery",
  "Lycra",
];

/** Menswear Fit types */
export const FITS = ["Regular Fit", "Slim Fit", "Comfort Fit"];

/** Mundu Border / Kasavu types (Zain Gents Palace Kerala retail) */
export const MUNDU_BORDERS = [
  "Plain White",
  "Gold Kasavu",
  "Silver Kasavu",
  "Color Border",
  "Double Border",
  "Pocket Mundu",
];

/** Quick-pick common garment colors (Defaulting to Color if not White) */
export const POPULAR_COLORS = [
  "White",
  "Color",
  "Black",
  "Navy",
  "Sky Blue",
  "Grey",
  "Cream / Off-White",
  "Beige",
  "Maroon",
  "Olive Green",
];

/** Get size presets for a given category name */
export function getSizePresets(categoryName: string): string[] {
  const lower = categoryName.toLowerCase();
  for (const [key, sizes] of Object.entries(SIZE_PRESETS)) {
    if (lower.includes(key)) return sizes;
  }
  return SIZE_PRESETS.default;
}

/** Check if category is Mundu / Dhoti */
export function isMunduCategory(categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return lower.includes("mundu") || lower.includes("dhoti");
}

/** Check if category is Innerwear */
export function isInnerwearCategory(categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return lower.includes("innerwear") || lower.includes("vest") || lower.includes("brief");
}

/** Check if a category should show sleeve options */
export function shouldShowSleeve(categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return !NO_SLEEVE_CATEGORIES.some((cat) => lower.includes(cat));
}

/** Format currency for Indian Rupees */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Generate timestamped filename */
export function getTimestampedFilename(
  prefix: string,
  extension: string
): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${prefix}_${y}-${m}-${d}_${h}${min}.${extension}`;
}

export const POPULAR_RETAIL_BRANDS = [
  "Raymond",
  "Otto",
  "Allen Solly",
  "Ramraj",
  "Jockey",
  "VIP",
  "Dixcy Scott",
  "Rupa",
  "Lux Cozi",
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
  "Levis",
  "Killer",
  "MCR",
  "Unbranded",
  "Local",
];
