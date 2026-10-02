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

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-32">
      {/* ── Header ── */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Export Center</span>
          <Badge variant="subtle" className="text-[10px]">
            SheetJS & PapaParse
          </Badge>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          One-click downloads of physical stock audit reports
        </p>
      </header>

      {/* ── Export Cards ── */}
      <div className="space-y-3 mb-6">
        {/* Excel Card */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white overflow-hidden hover:border-emerald-300 shadow-xs transition-all">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Export All to Excel
                  </h3>
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                    .xlsx
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full audit sheet + formatted summary sheet
                </p>
              </div>
            </div>

            <Button
              onClick={handleExcelExport}
              disabled={loading}
              variant="success"
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Download
            </Button>
          </div>
        </Card>

        {/* CSV Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white overflow-hidden hover:border-blue-300 shadow-xs transition-all">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
                <FileText size={24} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Export Filtered to CSV
                  </h3>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                    .csv
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fast, flat tabular spreadsheet file
                </p>
              </div>
            </div>

            <Button
              onClick={handleCSVExport}
              disabled={loading}
              variant="secondary"
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Download
            </Button>
          </div>
        </Card>
      </div>

      {/* ── In-browser Audit Preview ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Audit Sheet Preview
        </h2>
        <Button
          onClick={handlePreview}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Eye size={14} />
          )}
          Load Preview
        </Button>
      </div>

      {/* Stats summary if preview loaded */}
      {stats && (
        <Card className="mb-4 p-4 border-indigo-100 bg-indigo-50/70 shadow-xs animate-fade-in">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-base font-black text-slate-900">{stats.rows}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">
                Rows
              </div>
            </div>
            <div>
              <div className="text-base font-black text-slate-900">
                {stats.totalPcs}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">
                Pieces
              </div>
            </div>
            <div>
              <div className="text-base font-black text-slate-900">
                {stats.uniqueStyles}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">
                Styles
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-emerald-700 truncate">
                {formatINR(stats.totalValue)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">
                Valuation
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Preview Table */}
      {preview && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-xs animate-slide-up">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 15).map((row) => (
                  <TableRow key={row.ID}>
                    <TableCell className="font-semibold text-xs text-slate-900">
                      {row.Category}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      {row.Brand}
                    </TableCell>
                    <TableCell>
                      <Badge variant="subtle" className="text-[10px]">
                        {row.Size}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 text-xs">
                      {row.Quantity}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500">
                      ₹{row["MRP (₹)"]}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs text-emerald-700">
                      ₹{row["Total Value (₹)"]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.length > 15 && (
            <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-100 bg-slate-50/50">
              Showing 15 of {preview.length} rows. Full export includes all items.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
