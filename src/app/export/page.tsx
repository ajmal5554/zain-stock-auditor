"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  BarChart3,
  Package,
  IndianRupee,
  Eye,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { downloadExcel, downloadCSV, type ExportRow } from "@/lib/export";
import { formatINR } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export default function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExportRow[] | null>(null);
  const [stats, setStats] = useState<{
    totalPcs: number;
    uniqueStyles: number;
    totalValue: number;
    rows: number;
  } | null>(null);

  const fetchExportData = async (): Promise<ExportRow[]> => {
    const res = await fetch("/api/export");
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      const data = await fetchExportData();
      if (data.length === 0) {
        toast("No data available to export", "info");
        return;
      }
      downloadExcel(data);
      toast(`Excel workbook downloaded (${data.length} rows)`, "success");
    } catch {
      toast("Export failed. Please check connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVExport = async () => {
    setLoading(true);
    try {
      const data = await fetchExportData();
      if (data.length === 0) {
        toast("No data available to export", "info");
        return;
      }
      downloadCSV(data);
      toast(`CSV spreadsheet downloaded (${data.length} rows)`, "success");
    } catch {
      toast("Export failed. Please check connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await fetchExportData();
      setPreview(data);
      const totalPcs = data.reduce((s, r) => s + r.Quantity, 0);
      const totalValue = data.reduce((s, r) => s + r["Total Value (₹)"], 0);
      const uniqueStyles = new Set(
        data.map(
          (r) => `${r.Category}-${r.Brand}-${r.Pattern}-${r["MRP (₹)"]}`
        )
      ).size;
      setStats({ totalPcs, uniqueStyles, totalValue, rows: data.length });
    } catch {
      toast("Failed to load audit preview", "error");
    } finally {
      setLoading(false);
    }
  };

  const [previewSearch, setPreviewSearch] = useState("");

  const filteredPreview = preview
    ? preview.filter(
        (r) =>
          r.Category.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Brand.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Size.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Fit?.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Color?.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Collar?.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Subtype?.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Border?.toLowerCase().includes(previewSearch.toLowerCase()) ||
          r.Notes?.toLowerCase().includes(previewSearch.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 pb-32 md:pb-16">
      {/* ── Responsive Header ── */}
      <header className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={26} />
              <span>Export & Audit Reports</span>
            </h1>
            <Badge variant="subtle" className="text-[10px] font-bold">
              Multi-Format
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Download formatted store inventory workbooks for Excel, accounting software, and physical records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleExcelExport}
            disabled={loading}
            variant="success"
            size="sm"
            className="gap-2 font-bold shadow-xs"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Export Excel (.xlsx)</span>
          </Button>
        </div>
      </header>

      {/* ── 2-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Download Cards & Export Options (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-3">
            {/* Excel Download Card */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white overflow-hidden hover:border-emerald-300 shadow-xs transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900">
                          Microsoft Excel Workbook
                        </CardTitle>
                        <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                          .xlsx
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Multi-sheet workbook with automated formulas
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 1: Full Itemized Inventory & Size Matrix</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 2: Category Valuation & Store Stock Summary</span>
                  </div>
                </div>

                <Button
                  onClick={handleExcelExport}
                  disabled={loading}
                  variant="success"
                  className="w-full gap-2 font-bold shadow-xs py-2.5"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Download Excel Workbook (.xlsx)
                </Button>
              </CardContent>
            </Card>

            {/* CSV Download Card */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-white overflow-hidden hover:border-blue-300 shadow-xs transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900">
                          Raw CSV Spreadsheet
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                          .csv
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Clean tabular comma-delimited data
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-slate-600">
                  Ideal for importing into Tally, ERP systems, Google Sheets, or custom retail inventory databases.
                </p>

                <Button
                  onClick={handleCSVExport}
                  disabled={loading}
                  variant="secondary"
                  className="w-full gap-2 font-bold shadow-xs py-2.5"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Download Flat CSV (.csv)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Audit Compatibility Info Card */}
          <Card className="p-4 bg-slate-50/80 border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-2">
              <Layers size={14} className="text-indigo-600" />
              <span>Report Specifications</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-500">
              <p>• Data fields: Category, Subtype, Brand, Pattern, Fabric, Collar, Sleeve, Fit, Color, Border, Size, Quantity, Retail MRP, Valuation, Notes.</p>
              <p>• Currency format: Indian Rupee (₹ INR) with standard Indian numbering formatting.</p>
              <p>• Live database sync: Direct extraction from Neon Cloud PostgreSQL production branch.</p>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Sheet Preview & Data Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye size={16} className="text-indigo-600" />
                  <span>Live Sheet Preview</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect audit rows before generating file downloads
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePreview}
                  disabled={loading}
                  variant={preview ? "outline" : "default"}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold shrink-0"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} />
                  )}
                  <span>{preview ? "Refresh Preview" : "Load Live Preview"}</span>
                </Button>
              </div>
            </div>

            {/* If stats available, show KPI summary */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 bg-indigo-50/40 border-b border-indigo-100">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-slate-900">{stats.rows}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Total Rows
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-indigo-700">
                    {stats.totalPcs.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Total Pieces
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 text-center">
                  <div className="text-lg font-black text-slate-900">
                    {stats.uniqueStyles}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Garment Styles
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 text-center">
                  <div className="text-sm sm:text-base font-black text-emerald-700 truncate">
                    {formatINR(stats.totalValue)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Valuation
                  </div>
                </div>
              </div>
            )}

            {/* Filter toolbar when preview is loaded */}
            {preview && (
              <div className="p-3 border-b border-slate-200 bg-white">
                <input
                  type="text"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  placeholder="Filter preview by brand, category, or size..."
                  className="w-full h-9 px-3 text-xs bg-slate-50 rounded-lg border border-slate-200 outline-none focus:bg-white focus:border-indigo-600 transition-colors"
                />
              </div>
            )}

            {/* Content area */}
            {!preview ? (
              <div className="py-16 px-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                  <BarChart3 size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Preview Not Loaded
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Click below to fetch and inspect the current audit records before exporting.
                </p>
                <Button
                  onClick={handlePreview}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} />
                  )}
                  Load Audit Records
                </Button>
              </div>
            ) : filteredPreview.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No rows match &quot;{previewSearch}&quot;
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto max-h-[460px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <TableRow>
                        <TableHead className="text-xs font-bold py-3 pl-4">Category</TableHead>
                        <TableHead className="text-xs font-bold">Brand</TableHead>
                        <TableHead className="text-xs font-bold">Attributes</TableHead>
                        <TableHead className="text-xs font-bold text-center">Size</TableHead>
                        <TableHead className="text-xs font-bold text-right">Qty</TableHead>
                        <TableHead className="text-xs font-bold text-right">MRP</TableHead>
                        <TableHead className="text-xs font-bold text-right pr-4">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreview.slice(0, 50).map((row, idx) => (
                        <TableRow key={row.ID || idx} className="hover:bg-slate-50/70 border-b border-slate-100 text-xs">
                          <TableCell className="font-semibold text-slate-900 py-2.5 pl-4">
                            {row.Category}
                          </TableCell>
                          <TableCell className="text-slate-800 font-medium">
                            {row.Brand}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {row.Subtype && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                                  {row.Subtype}
                                </span>
                              )}
                              {row.Collar && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-100">
                                  {row.Collar}
                                </span>
                              )}
                              {row.Border && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-semibold text-amber-700 border border-amber-100">
                                  {row.Border}
                                </span>
                              )}
                              {row.Fit && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-100">
                                  {row.Fit}
                                </span>
                              )}
                              {row.Color && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    row.Color.toLowerCase() === "white"
                                      ? "bg-slate-100 text-slate-800 border-slate-300"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {row.Color}
                                </span>
                              )}
                              {row.Pattern && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                  {row.Pattern}
                                </span>
                              )}
                              {row.Fabric && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                  {row.Fabric}
                                </span>
                              )}
                              {row.Sleeve && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                  {row.Sleeve}
                                </span>
                              )}
                              {row.Notes && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-50 text-[10px] font-normal italic text-slate-500">
                                  {row.Notes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="subtle" className="text-[10px] font-bold px-2 py-0">
                              {row.Size}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900">
                            {row.Quantity}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            ₹{row["MRP (₹)"]}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 pr-4">
                            ₹{row["Total Value (₹)"].toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-200 bg-slate-50/60">
                  Showing {Math.min(50, filteredPreview.length)} of {filteredPreview.length} preview rows. Full export file includes all items.
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
