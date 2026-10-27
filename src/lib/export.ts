import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getTimestampedFilename, isShirtCategory } from "./constants";

export interface ExportRow {
  ID: string;
  Category: string;
  Subtype: string;
  Brand: string;
  Pattern: string;
  Fabric: string;
  Collar: string;
  Pocket: string;
  Sleeve: string;
  Fit: string;
  Color: string;
  Border: string;
  Size: string;
  Quantity: number;
  "MRP (₹)": number;
  "Total Value (₹)": number;
  Notes: string;
  "Last Updated": string;
}

export interface ConsolidatedStyleExportRow {
  "Product ID": string;
  Category: string;
  Subtype: string;
  Brand: string;
  Pattern: string;
  Fabric: string;
  Collar: string;
  Pocket: string;
  Sleeve: string;
  Fit: string;
  Color: string;
  Border: string;
  "Size Breakdown": string;
  "Available Sizes": string;
  "Total Quantity": number;
  "MRP (₹)": number;
  "Total Value (₹)": number;
  Notes: string;
  "Last Updated": string;
}

export function extractProductAttributes(product: {
  category?: { name: string };
  customMeta?: any;
  notes?: string | null;
}) {
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

  const customPairs = Object.entries(meta)
    .filter(([k]) => !["subtype", "collar", "border", "pocket", "fit", "color"].includes(k) && meta[k])
    .map(([k, v]) => `${k}: ${v}`);

  if (customPairs.length > 0) {
    const customStr = customPairs.join(" • ");
    cleanNote = cleanNote ? `${customStr} | ${cleanNote}` : customStr;
  }

  return { fit, color, collar, subtype, border, pocket, cleanNote };
}

export function convertProductsToExportRows(
  products: any[],
  options?: {
    sizeFilter?: string;
    stockFilter?: string;
    matchesSizeFn?: (itemSize: string | null | undefined, filterSize: string) => boolean;
  }
): ExportRow[] {
  const { sizeFilter, stockFilter, matchesSizeFn } = options || {};

  return products.flatMap((product) => {
    const attrs = extractProductAttributes(product);

    return product.variants
      .filter((variant: any) => {
        if (sizeFilter) {
          if (matchesSizeFn) {
            if (!matchesSizeFn(variant.size, sizeFilter)) return false;
          } else {
            if (variant.size?.trim().toLowerCase() !== sizeFilter.trim().toLowerCase()) return false;
          }
        }
        if (stockFilter === "in_stock" && variant.quantity <= 0) return false;
        if (stockFilter === "low_stock" && (variant.quantity <= 0 || variant.quantity > 5)) return false;
        if (stockFilter === "out_of_stock" && variant.quantity > 0) return false;
        return true;
      })
      .map((variant: any) => ({
        ID: variant.id,
        Category: product.category?.name || "",
        Subtype: attrs.subtype,
        Brand: product.brand,
        Pattern: product.pattern || "",
        Fabric: product.fabric || "",
        Collar: attrs.collar,
        Pocket: attrs.pocket,
        Sleeve: product.sleeve || "",
        Fit: attrs.fit,
        Color: attrs.color,
        Border: attrs.border,
        Size: variant.size,
        Quantity: variant.quantity,
        "MRP (₹)": product.mrp,
        "Total Value (₹)": variant.quantity * product.mrp,
        Notes: attrs.cleanNote,
        "Last Updated": variant.updatedAt
          ? new Date(variant.updatedAt).toISOString().replace("T", " ").slice(0, 19)
          : new Date().toISOString().replace("T", " ").slice(0, 19),
      }));
  });
}

export function convertProductsToConsolidatedRows(
  products: any[],
  options?: {
    sizeFilter?: string;
    stockFilter?: string;
    matchesSizeFn?: (itemSize: string | null | undefined, filterSize: string) => boolean;
  }
): ConsolidatedStyleExportRow[] {
  const { sizeFilter, stockFilter, matchesSizeFn } = options || {};

  return products
    .map((product) => {
      const attrs = extractProductAttributes(product);

      const matchingVariants = product.variants.filter((variant: any) => {
        if (sizeFilter) {
          if (matchesSizeFn) {
            if (!matchesSizeFn(variant.size, sizeFilter)) return false;
          } else {
            if (variant.size?.trim().toLowerCase() !== sizeFilter.trim().toLowerCase()) return false;
          }
        }
        if (stockFilter === "in_stock" && variant.quantity <= 0) return false;
        if (stockFilter === "low_stock" && (variant.quantity <= 0 || variant.quantity > 5)) return false;
        if (stockFilter === "out_of_stock" && variant.quantity > 0) return false;
        return true;
      });

      if (matchingVariants.length === 0) return null;

      const totalQty = matchingVariants.reduce((sum: number, v: any) => sum + v.quantity, 0);
      const sizeBreakdown = matchingVariants
        .map((v: any) => `${v.size}: ${v.quantity}`)
        .join(", ");
      const availableSizes = matchingVariants.map((v: any) => v.size).join(", ");

      return {
        "Product ID": product.id,
        Category: product.category?.name || "",
        Subtype: attrs.subtype,
        Brand: product.brand,
        Pattern: product.pattern || "",
        Fabric: product.fabric || "",
        Collar: attrs.collar,
        Pocket: attrs.pocket,
        Sleeve: product.sleeve || "",
        Fit: attrs.fit,
        Color: attrs.color,
        Border: attrs.border,
        "Size Breakdown": sizeBreakdown,
        "Available Sizes": availableSizes,
        "Total Quantity": totalQty,
        "MRP (₹)": product.mrp,
        "Total Value (₹)": totalQty * product.mrp,
        Notes: attrs.cleanNote,
        "Last Updated": product.updatedAt
          ? new Date(product.updatedAt).toISOString().replace("T", " ").slice(0, 19)
          : new Date().toISOString().replace("T", " ").slice(0, 19),
      };
    })
    .filter(Boolean) as ConsolidatedStyleExportRow[];
}

export function generateExportFilenamePrefix(
  filters: {
    brand?: string;
    category?: string;
    size?: string;
    fit?: string;
    color?: string;
    collar?: string;
  },
  scope: "filtered" | "all"
): string {
  if (scope === "all") return "Zain_Inventory_All";

  const parts = ["Zain_Stock"];
  if (filters.brand) parts.push(filters.brand.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.category) parts.push(filters.category.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.size) parts.push(`Size${filters.size.replace(/[^a-zA-Z0-9]/g, "")}`);
  if (filters.fit) parts.push(filters.fit.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.color) parts.push(filters.color.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.collar) parts.push(filters.collar.replace(/[^a-zA-Z0-9]/g, ""));

  if (parts.length === 1) parts.push("Filtered");
  return parts.join("_");
}

export function downloadExcel(
  data: any[],
  customPrefix?: string,
  sheetName = "Stock Audit"
): void {
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths based on keys and contents
  const keys = Object.keys(data[0]);
  ws["!cols"] = keys.map((key) => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(data.length, 60); i++) {
      const val = data[i][key];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Add a summary sheet
  const totalPcs = data.reduce(
    (sum, r) => sum + (Number(r.Quantity) || Number(r["Total Quantity"]) || 0),
    0
  );
  const totalValue = data.reduce(
    (sum, r) => sum + (Number(r["Total Value (₹)"]) || 0),
    0
  );
  const uniqueStyles = new Set(
    data.map(
      (r) =>
        `${r.Category || ""}-${r.Brand || ""}-${r.Pattern || ""}-${r["MRP (₹)"] || ""}`
    )
  ).size;

  const summaryData = [
    { Metric: "Total Pieces Counted", Value: totalPcs },
    { Metric: "Unique Garment Styles", Value: uniqueStyles },
    { Metric: "Total Retail Inventory Value (₹)", Value: totalValue },
    {
      Metric: "Report Scope",
      Value: customPrefix ? customPrefix.replace(/_/g, " ") : "Store Inventory",
    },
    { Metric: "Report Generated", Value: new Date().toLocaleString("en-IN") },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  const filename = getTimestampedFilename(customPrefix || "Zain_Stock_Audit", "xlsx");
  XLSX.writeFile(wb, filename);
}

export function downloadCSV(data: any[], customPrefix?: string): void {
  if (!data || data.length === 0) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getTimestampedFilename(customPrefix || "Zain_Stock_Audit", "csv");
  link.click();
  URL.revokeObjectURL(url);
}
