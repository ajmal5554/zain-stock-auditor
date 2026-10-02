import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getTimestampedFilename } from "./constants";

export interface ExportRow {
  ID: string;
  Category: string;
  Brand: string;
  Pattern: string;
  Fabric: string;
  Sleeve: string;
  Size: string;
  Quantity: number;
  "MRP (₹)": number;
  "Total Value (₹)": number;
  Notes: string;
  "Last Updated": string;
}

export function downloadExcel(data: ExportRow[]): void {
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, // ID
    { wch: 14 }, // Category
    { wch: 18 }, // Brand
    { wch: 12 }, // Pattern
    { wch: 12 }, // Fabric
    { wch: 14 }, // Sleeve
    { wch: 10 }, // Size
    { wch: 10 }, // Quantity
    { wch: 12 }, // MRP
    { wch: 14 }, // Total Value
    { wch: 20 }, // Notes
    { wch: 20 }, // Last Updated
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Audit");

  // Add a summary sheet
  const totalPcs = data.reduce((sum, r) => sum + r.Quantity, 0);
  const totalValue = data.reduce((sum, r) => sum + r["Total Value (₹)"], 0);
  const uniqueStyles = new Set(
    data.map((r) => `${r.Category}-${r.Brand}-${r.Pattern}-${r["MRP (₹)"]}`)
  ).size;

  const summaryData = [
    { Metric: "Total Pieces Counted", Value: totalPcs },
    { Metric: "Unique Garment Styles", Value: uniqueStyles },
    { Metric: "Total Retail Inventory Value (₹)", Value: totalValue },
    { Metric: "Report Generated", Value: new Date().toLocaleString("en-IN") },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 35 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  const filename = getTimestampedFilename("Zain_Stock_Audit", "xlsx");
  XLSX.writeFile(wb, filename);
}

export function downloadCSV(data: ExportRow[]): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getTimestampedFilename("Zain_Stock_Audit", "csv");
  link.click();
  URL.revokeObjectURL(url);
}
