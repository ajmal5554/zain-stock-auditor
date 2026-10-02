/** Size presets per category keyword */
export const SIZE_PRESETS: Record<string, string[]> = {
  shirt: ["38", "39", "40", "42", "44"],
  pant: ["30", "32", "34", "36", "38", "40"],
  trouser: ["30", "32", "34", "36", "38", "40"],
  mundu: ["Free Size"],
  accessory: ["Free Size"],
  accessories: ["Free Size"],
  innerwear: ["S", "M", "L", "XL", "XXL"],
  belt: ["Free Size"],
  default: ["S", "M", "L", "XL", "XXL"],
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
  "belt",
  "belts",
  "accessory",
  "accessories",
  "innerwear",
];

/** Pattern options */
export const PATTERNS = ["Plain", "Check", "Stripe", "Printed", "Self-Design"];

/** Sleeve options */
export const SLEEVES = ["Full Sleeve", "Half Sleeve", "Sleeveless"];

/** Fabric options */
export const FABRICS = ["Cotton", "Linen", "Poly-Blend", "Silk Blend", "Denim"];

/** Get size presets for a given category name */
export function getSizePresets(categoryName: string): string[] {
  const lower = categoryName.toLowerCase();
  for (const [key, sizes] of Object.entries(SIZE_PRESETS)) {
    if (lower.includes(key)) return sizes;
  }
  return SIZE_PRESETS.default;
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
