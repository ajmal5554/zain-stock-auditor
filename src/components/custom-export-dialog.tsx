"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  Package,
  Check,
  Tag,
} from "lucide-react";
import { toast } from "@/components/toaster";
import {
  downloadExcel,
  downloadCSV,
  convertProductsToExportRows,
  convertProductsToConsolidatedRows,
  generateExportFilenamePrefix,
} from "@/lib/export";
import { formatINR } from "@/lib/constants";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface ActiveFiltersState {
  search?: string;
  categoryName?: string;
  brand?: string;
  size?: string;
  stock?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  fit?: string;
  color?: string;
  collar?: string;
  sleeve?: string;
  fabric?: string;
  pattern?: string;
  priceRange?: string;
}

interface CustomExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: ActiveFiltersState;
  activeFilterCount: number;
  filteredProducts: any[];
  filteredPcs: number;
  filteredStyles: number;
  filteredValue: number;
  totalStorePcs: number;
  totalStoreStyles: number;
  totalStoreValue: number;
  matchesSizeFn: (itemSize: string | null | undefined, filterSize: string) => boolean;
}

export function CustomExportDialog({
  open,
  onOpenChange,
  activeFilters,
  activeFilterCount,
  filteredProducts,
  filteredPcs,
  filteredStyles,
  filteredValue,
  totalStorePcs,
  totalStoreStyles,
  totalStoreValue,
  matchesSizeFn,
}: CustomExportDialogProps) {
  const [scope, setScope] = useState<"filtered" | "all">(
    activeFilterCount > 0 || activeFilters.search ? "filtered" : "all"
  );
  const [layout, setLayout] = useState<"itemized" | "consolidated">("itemized");
  const [loading, setLoading] = useState(false);

  // Auto-generate suggested file prefix based on current active filters
  const defaultPrefix = useMemo(() => {
    return generateExportFilenamePrefix(
      {
        brand: activeFilters.brand,
        category: activeFilters.categoryName,
        size: activeFilters.size,
        fit: activeFilters.fit,
        color: activeFilters.color,
        collar: activeFilters.collar,
      },
      scope
    );
  }, [activeFilters, scope]);

  const [customFilename, setCustomFilename] = useState(defaultPrefix);

  // Keep custom filename in sync when scope or filters change if user hasn't heavily customized
  const handleScopeChange = (newScope: "filtered" | "all") => {
    setScope(newScope);
    setCustomFilename(
      generateExportFilenamePrefix(
        {
          brand: activeFilters.brand,
          category: activeFilters.categoryName,
          size: activeFilters.size,
          fit: activeFilters.fit,
          color: activeFilters.color,
          collar: activeFilters.collar,
        },
        newScope
      )
    );
  };

  // Compile active filter chips
  const activeChips = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    if (activeFilters.categoryName) list.push({ label: "Category", value: activeFilters.categoryName });
    if (activeFilters.brand) list.push({ label: "Brand", value: activeFilters.brand });
    if (activeFilters.size) list.push({ label: "Size", value: activeFilters.size });
    if (activeFilters.fit) list.push({ label: "Fit", value: activeFilters.fit });
    if (activeFilters.color) list.push({ label: "Color", value: activeFilters.color });
    if (activeFilters.collar) list.push({ label: "Collar", value: activeFilters.collar });
    if (activeFilters.sleeve) list.push({ label: "Sleeve", value: activeFilters.sleeve });
    if (activeFilters.fabric) list.push({ label: "Fabric", value: activeFilters.fabric });
    if (activeFilters.pattern) list.push({ label: "Pattern", value: activeFilters.pattern });
    if (activeFilters.stock && activeFilters.stock !== "all") {
      const stockLabels: Record<string, string> = {
        in_stock: "In Stock (>0 pcs)",
        low_stock: "Low Stock (1-5 pcs)",
        out_of_stock: "Out of Stock (0 pcs)",
      };
      list.push({ label: "Stock", value: stockLabels[activeFilters.stock] || activeFilters.stock });
    }
    if (activeFilters.search) list.push({ label: "Search", value: `"${activeFilters.search}"` });
    return list;
  }, [activeFilters]);

  // Handle data compilation
  const getExportData = async () => {
    if (scope === "all") {
      // Fetch full store data from API to guarantee complete inventory
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Failed to fetch full inventory");
      const allRows = await res.json();
      return allRows;
    }

    // Filtered export using in-memory filtered products
    if (layout === "consolidated") {
      return convertProductsToConsolidatedRows(filteredProducts, {
        sizeFilter: activeFilters.size,
        stockFilter: activeFilters.stock,
        matchesSizeFn,
      });
    }

    return convertProductsToExportRows(filteredProducts, {
      sizeFilter: activeFilters.size,
      stockFilter: activeFilters.stock,
      matchesSizeFn,
    });
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const data = await getExportData();
      if (!data || data.length === 0) {
        toast("No matching items found to export", "info");
        return;
      }

      const prefix = (customFilename || defaultPrefix).trim();
      const sheetName = scope === "filtered" ? "Filtered Audit" : "Store Audit";

      downloadExcel(data, prefix, sheetName);
      toast(`Exported ${data.length} records to Excel workbook`, "success");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast("Export failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    setLoading(true);
    try {
      const data = await getExportData();
      if (!data || data.length === 0) {
        toast("No matching items found to export", "info");
        return;
      }

      const prefix = (customFilename || defaultPrefix).trim();
      downloadCSV(data, prefix);
      toast(`Exported ${data.length} records to CSV spreadsheet`, "success");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast("Export failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const currentStyles = scope === "filtered" ? filteredStyles : totalStoreStyles;
  const currentPcs = scope === "filtered" ? filteredPcs : totalStorePcs;
  const currentValue = scope === "filtered" ? filteredValue : totalStoreValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader className="text-left space-y-1 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Customized Inventory Export</span>
                {activeFilterCount > 0 && (
                  <Badge variant="subtle" className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border-emerald-200">
                    Filter-Aware
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Export verified stock files tailored to your selected brand, attributes, or size.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Active Filter Summary & Metrics Box ── */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-500">
              <Filter size={13} className="text-indigo-600" />
              <span>Current Inventory Filter Context</span>
            </span>
            <span className="text-[11px] font-bold text-indigo-700">
              {activeChips.length > 0 ? `${activeChips.length} active criteria` : "Showing all inventory"}
            </span>
          </div>

          {/* Filter Chips list */}
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {activeChips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                >
                  <span className="text-slate-400 text-[10px] uppercase font-bold">{chip.label}:</span>
                  <span className="font-bold text-slate-900">{chip.value}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No specific brand, size, or attribute filter is currently applied.
            </p>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
              <div className="text-base font-black text-slate-900">{currentStyles}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Garment Styles</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
              <div className="text-base font-black text-indigo-700">
                {currentPcs.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Total Pieces</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
              <div className="text-base font-black text-emerald-700 truncate">
                {formatINR(currentValue)}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Inventory Value</div>
            </div>
          </div>
        </div>

        {/* ── Export Scope Selector ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            1. Select Export Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Filtered Scope Card */}
            <button
              type="button"
              onClick={() => handleScopeChange("filtered")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 relative ${
                scope === "filtered"
                  ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  scope === "filtered"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {scope === "filtered" && <Check size={12} strokeWidth={3} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Filtered Selection Only</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="success" className="text-[9px] py-0 px-1 font-bold">
                      Recommended
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Exports only matching items ({filteredPcs} pcs)
                </div>
              </div>
            </button>

            {/* All Items Scope Card */}
            <button
              type="button"
              onClick={() => handleScopeChange("all")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 relative ${
                scope === "all"
                  ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  scope === "all"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {scope === "all" && <Check size={12} strokeWidth={3} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Entire Store Inventory</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Full database export ({totalStorePcs} pcs)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Table Structure / Granularity (Only relevant for filtered scope) ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            2. Report Layout & Breakdown
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Itemized Size Matrix */}
            <button
              type="button"
              onClick={() => setLayout("itemized")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                layout === "itemized"
                  ? "border-indigo-500 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  layout === "itemized"
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {layout === "itemized" && <Check size={12} strokeWidth={3} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Itemized Size Matrix</span>
                  <Badge variant="subtle" className="text-[9px] py-0 px-1 font-semibold">
                    1 Row / Size
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Exact size, quantity, and valuation per variant. Perfect for physical stock audits.
                </div>
              </div>
            </button>

            {/* Consolidated Style Matrix */}
            <button
              type="button"
              onClick={() => setLayout("consolidated")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                layout === "consolidated"
                  ? "border-indigo-500 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                  layout === "consolidated"
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {layout === "consolidated" && <Check size={12} strokeWidth={3} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Consolidated Garment Styles</span>
                  <Badge variant="subtle" className="text-[9px] py-0 px-1 font-semibold">
                    1 Row / Style
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Summarized by garment with combined size breakdown column (e.g. 38: 2, 40: 6).
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Filename Prefix Customization ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            3. File Name Prefix
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="e.g. Zain_Stock_MinisterWhite_Size40"
              className="text-xs font-mono h-9 bg-white"
            />
            <span className="text-xs text-slate-400 font-mono shrink-0">_YYYY-MM-DD.xlsx</span>
          </div>
        </div>

        {/* ── Primary Action Buttons ── */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              onClick={handleDownloadExcel}
              disabled={loading || currentPcs === 0}
              variant="success"
              size="default"
              className="w-full gap-2 font-bold py-2.5 shadow-xs"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              <span>Download Excel (.xlsx)</span>
            </Button>

            <Button
              onClick={handleDownloadCSV}
              disabled={loading || currentPcs === 0}
              variant="outline"
              size="default"
              className="w-full gap-2 font-bold py-2.5 text-slate-700 hover:text-slate-900 border-slate-300"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              <span>Download CSV (.csv)</span>
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <Link
              href="/export"
              onClick={() => onOpenChange(false)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Open Full Reports & Audit Hub</span>
              <ArrowRight size={13} />
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-500 hover:text-slate-700 text-xs h-8 px-2.5"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
