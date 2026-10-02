"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Package,
  Layers,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { formatINR } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  size: string;
  quantity: number;
  updatedAt: string;
}

interface Product {
  id: string;
  brand: string;
  pattern: string | null;
  fabric: string | null;
  sleeve: string | null;
  mrp: number;
  notes: string | null;
  category: Category;
  variants: Variant[];
  updatedAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [updatingVariant, setUpdatingVariant] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchProducts = useCallback(
    async (searchTerm: string = "", catId: string = "") => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set("search", searchTerm);
        if (catId) params.set("categoryId", catId);

        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProducts(data);
      } catch {
        toast("Failed to load inventory", "error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchProducts(search, categoryFilter);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, categoryFilter, fetchProducts]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (variant: Variant) => {
    setEditingVariant(variant.id);
    setEditValue(variant.quantity);
  };

  const saveEdit = async (variantId: string) => {
    setUpdatingVariant(true);
    try {
      const res = await fetch("/api/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity: Math.max(0, Math.floor(editValue)),
        }),
      });
      if (!res.ok) throw new Error();

      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId
              ? { ...v, quantity: Math.max(0, Math.floor(editValue)) }
              : v
          ),
        }))
      );
      toast("Stock quantity updated", "success");
    } catch {
      toast("Failed to update stock count", "error");
    } finally {
      setEditingVariant(null);
      setUpdatingVariant(false);
    }
  };

  // KPIs
  const totalPcs = products.reduce(
    (sum, p) => sum + p.variants.reduce((vs, v) => vs + v.quantity, 0),
    0
  );
  const uniqueStyles = products.length;
  const totalValue = products.reduce(
    (sum, p) =>
      sum + p.variants.reduce((vs, v) => vs + v.quantity * p.mrp, 0),
    0
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-32">
      {/* ── Header ── */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Live Inventory</span>
            <Badge variant="subtle" className="text-[10px] font-semibold">
              Real-time
            </Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Storewide physical counts & valuations
          </p>
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => {
            setLoading(true);
            fetchProducts(search, categoryFilter);
          }}
          disabled={loading}
          title="Refresh counts"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </header>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {/* Total Pieces */}
        <Card className="p-3.5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/20 text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 mb-2 border border-indigo-500/30">
            <Package size={16} />
          </div>
          <div className="text-xl font-black text-white tracking-tight">
            {totalPcs.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            Total Pcs
          </div>
        </Card>

        {/* Garment Styles */}
        <Card className="p-3.5 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/20 text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 mb-2 border border-purple-500/30">
            <Layers size={16} />
          </div>
          <div className="text-xl font-black text-white tracking-tight">
            {uniqueStyles}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            Styles
          </div>
        </Card>

        {/* Inventory Value */}
        <Card className="p-3.5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/20 text-center">
          <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/30">
            <IndianRupee size={16} />
          </div>
          <div className="text-sm font-black text-emerald-400 tracking-tight truncate">
            {formatINR(totalValue)}
          </div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            Value
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, pattern, size..."
            className="pl-10 text-xs h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-700/80 bg-slate-900/90 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Products List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Loading live stock data...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16 px-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-4 border border-slate-700">
            <Package size={28} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {search || categoryFilter
              ? "No matching garments found"
              : "No stock recorded yet"}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
            {search || categoryFilter
              ? "Try adjusting your search terms or filter."
              : "Scan racks and add physical counts to see live inventory analytics."}
          </p>
          <Link href="/audit">
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              Start Rack Audit
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isExpanded = expandedIds.has(product.id);
            const totalQty = product.variants.reduce(
              (s, v) => s + v.quantity,
              0
            );

            return (
              <Card
                key={product.id}
                className="overflow-hidden border-slate-800 transition-all hover:border-slate-700"
              >
                {/* Header card banner */}
                <button
                  type="button"
                  onClick={() => toggleExpand(product.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <Badge variant="default" className="text-[10px] py-0">
                        {product.category.name}
                      </Badge>
                      {product.pattern && (
                        <Badge variant="subtle" className="text-[10px] py-0">
                          {product.pattern}
                        </Badge>
                      )}
                      {product.fabric && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {product.fabric}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white truncate">
                      {product.brand}
                    </h3>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {product.sleeve && <span>{product.sleeve}</span>}
                      <span className="font-bold text-emerald-400">
                        ₹{product.mrp}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-black text-white">
                        {totalQty}
                      </div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        Pcs
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded variant breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60 p-3.5 space-y-2 animate-slide-up">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 mb-2">
                      <span>Size Breakdown</span>
                      <span>Tap quantity to edit</span>
                    </div>

                    <div className="space-y-1.5">
                      {product.variants.map((v) => {
                        const isEditing = editingVariant === v.id;
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="w-10 justify-center text-xs font-bold"
                              >
                                {v.size}
                              </Badge>
                            </div>

                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setEditValue((prev) => Math.max(0, prev - 1))
                                  }
                                >
                                  <Minus size={13} />
                                </Button>
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) =>
                                    setEditValue(parseInt(e.target.value) || 0)
                                  }
                                  className="w-14 h-8 text-center text-xs font-bold"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setEditValue((prev) => prev + 1)
                                  }
                                >
                                  <Plus size={13} />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="success"
                                  onClick={() => saveEdit(v.id)}
                                  disabled={updatingVariant}
                                >
                                  {updatingVariant ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => setEditingVariant(null)}
                                >
                                  <X size={13} />
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(v)}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-transparent transition-all group"
                              >
                                <span className="text-sm font-extrabold text-white">
                                  {v.quantity}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  pcs
                                </span>
                                <Edit3
                                  size={12}
                                  className="text-slate-500 group-hover:text-indigo-400 transition-colors"
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {product.notes && (
                      <p className="text-[11px] text-slate-400 pt-2 italic border-t border-slate-800/60">
                        Notes: {product.notes}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
