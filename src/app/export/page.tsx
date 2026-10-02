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
} from "lucide-react";
import { toast } from "@/components/toaster";
import { downloadExcel, downloadCSV, type ExportRow } from "@/lib/export";
import { formatINR } from "@/lib/constants";

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
        toast("No data to export", "info");
        return;
      }
      downloadExcel(data);
      toast(
        `Excel exported — ${data.length} rows`,
        "success"
      );
    } catch {
      toast("Export failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVExport = async () => {
    setLoading(true);
    try {
      const data = await fetchExportData();
      if (data.length === 0) {
        toast("No data to export", "info");
        return;
      }
      downloadCSV(data);
      toast(
        `CSV exported — ${data.length} rows`,
        "success"
      );
    } catch {
      toast("Export failed. Please try again.", "error");
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
      toast("Failed to load preview", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Export Center</h1>
        <p className="text-xs text-slate-400">
          Download your audit data as Excel or CSV
        </p>
      </header>

      {/* Export Cards */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleExcelExport}
          disabled={loading}
          className="card w-full p-5 flex items-center gap-4 hover:bg-slate-700/50 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">
              Export All to Excel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Full audit with summary sheet (.xlsx)
            </p>
          </div>
          {loading ? (
            <Loader2 size={20} className="animate-spin text-slate-400" />
          ) : (
            <Download size={20} className="text-slate-500" />
          )}
        </button>

        <button
          onClick={handleCSVExport}
          disabled={loading}
          className="card w-full p-5 flex items-center gap-4 hover:bg-slate-700/50 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
            <FileText size={24} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">
              Export to CSV
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Flat data for further processing (.csv)
            </p>
          </div>
          {loading ? (
            <Loader2 size={20} className="animate-spin text-slate-400" />
          ) : (
            <Download size={20} className="text-slate-500" />
          )}
        </button>
      </div>

      {/* Preview Button */}
      <button
        onClick={handlePreview}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-medium text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 transition-all mb-6"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <BarChart3 size={16} />
            Preview Export Data
          </span>
        )}
      </button>

      {/* Stats & Preview */}
      {stats && (
        <div className="space-y-4 animate-slide-up">
          <div className="grid grid-cols-3 gap-3">
            <div className="kpi-card">
              <Package size={18} className="mx-auto text-indigo-400 mb-1" />
              <div className="text-xl font-bold text-white">
                {stats.totalPcs.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">Pieces</div>
            </div>
            <div className="kpi-card">
              <BarChart3 size={18} className="mx-auto text-purple-400 mb-1" />
              <div className="text-xl font-bold text-white">
                {stats.uniqueStyles}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">Styles</div>
            </div>
            <div className="kpi-card">
              <IndianRupee
                size={18}
                className="mx-auto text-emerald-400 mb-1"
              />
              <div className="text-lg font-bold text-white">
                {formatINR(stats.totalValue)}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">Value</div>
            </div>
          </div>

          {/* Data Preview Table */}
          {preview && preview.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-3 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300">
                  Data Preview ({stats.rows} rows)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700/50 text-slate-400">
                      <th className="px-3 py-2 text-left font-medium">
                        Category
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Brand
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        Size
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        MRP
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-700/30 hover:bg-slate-700/20"
                      >
                        <td className="px-3 py-2 text-slate-300">
                          {row.Category}
                        </td>
                        <td className="px-3 py-2 text-white font-medium">
                          {row.Brand}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-300">
                          {row.Size}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-white">
                          {row.Quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">
                          {formatINR(row["MRP (₹)"])}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                          {formatINR(row["Total Value (₹)"])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <div className="p-3 text-center text-xs text-slate-500 border-t border-slate-700/30">
                    Showing 20 of {preview.length} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {preview && preview.length === 0 && (
            <div className="text-center py-8">
              <Package size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">
                No audit data yet. Start recording from the Audit tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Export Columns Info */}
      <div className="card p-4 mt-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Export Columns
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {[
            "ID",
            "Category",
            "Brand",
            "Pattern",
            "Fabric",
            "Sleeve",
            "Size",
            "Quantity",
            "MRP (₹)",
            "Total Value (₹)",
            "Notes",
            "Last Updated",
          ].map((col) => (
            <span
              key={col}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-700/50 text-slate-400"
            >
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
