"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Package,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { formatINR } from "@/lib/constants";

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
      toast("Quantity updated", "success");
    } catch {
      toast("Failed to update quantity", "error");
    } finally {
      setEditingVariant(null);
      setUpdatingVariant(false);
    }
  };

  // KPI calculations
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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-xl font-bold text-white mb-1">Live Inventory</h1>
        <p className="text-xs text-slate-400">
          Real-time stock counts across all categories
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="kpi-card animate-fade-in">
          <Package size={20} className="mx-auto text-indigo-400 mb-1.5" />
          <div className="text-2xl font-bold text-white">
            {totalPcs.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Total Pcs
          </div>
        </div>
        <div className="kpi-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <Layers size={20} className="mx-auto text-purple-400 mb-1.5" />
          <div className="text-2xl font-bold text-white">{uniqueStyles}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Styles
          </div>
        </div>
        <div className="kpi-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <IndianRupee size={20} className="mx-auto text-emerald-400 mb-1.5" />
          <div className="text-lg font-bold text-white">
            {formatINR(totalValue)}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
            Value
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, size, pattern..."
            className="input-field pl-10 py-2.5 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field w-auto py-2.5 text-sm pr-8 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><polyline points=%226,9 12,15 18,9%22/></svg>')] bg-[position:right_12px_center] bg-no-repeat"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            {search || categoryFilter
              ? "No products match your search"
              : "No products recorded yet. Start auditing!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isExpanded = expandedIds.has(product.id);
            const totalQty = product.variants.reduce(
              (s, v) => s + v.quantity,
              0
            );
            return (
              <div
                key={product.id}
                className="card overflow-hidden animate-slide-up"
              >
                {/* Product Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(product.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 font-medium">
                        {product.category.name}
                      </span>
                      {product.pattern && (
                        <span className="text-xs text-slate-500">
                          {product.pattern}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-sm truncate">
                      {product.brand}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {product.fabric && <span>{product.fabric}</span>}
                      {product.sleeve && <span>{product.sleeve}</span>}
                      <span className="text-emerald-400 font-medium">
                        {formatINR(product.mrp)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white">
                      {totalQty}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase">
                      pcs
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500 shrink-0" />
                  )}
                </button>

                {/* Expanded Variants */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-3 animate-slide-up">
                    <div className="space-y-1.5">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/30"
                        >
                          <span className="text-sm font-medium text-slate-300 w-16">
                            {variant.size}
                          </span>
                          {editingVariant === variant.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={editValue}
                                onChange={(e) =>
                                  setEditValue(parseInt(e.target.value) || 0)
                                }
                                className="w-16 text-center text-sm bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(variant.id);
                                  if (e.key === "Escape")
                                    setEditingVariant(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => saveEdit(variant.id)}
                                disabled={updatingVariant}
                                className="text-emerald-400 hover:text-emerald-300 p-1"
                              >
                                {updatingVariant ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check size={14} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVariant(null)}
                                className="text-slate-500 hover:text-slate-300 p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(variant)}
                              className="flex items-center gap-2 group"
                            >
                              <span className="text-sm font-bold text-white">
                                {variant.quantity}
                              </span>
                              <Edit3
                                size={12}
                                className="text-slate-600 group-hover:text-indigo-400 transition-colors"
                              />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {product.notes && (
                      <p className="text-xs text-slate-500 mt-2 px-1 italic">
                        {product.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
