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
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { formatINR, PATTERNS, FABRICS, SLEEVES } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

  // In-line variant quantity editing
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [updatingVariant, setUpdatingVariant] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormBrand, setEditFormBrand] = useState("");
  const [editFormMrp, setEditFormMrp] = useState(0);
  const [editFormCategoryId, setEditFormCategoryId] = useState("");
  const [editFormPattern, setEditFormPattern] = useState<string | null>(null);
  const [editFormFabric, setEditFormFabric] = useState<string | null>(null);
  const [editFormSleeve, setEditFormSleeve] = useState<string | null>(null);
  const [editFormNotes, setEditFormNotes] = useState("");
  const [savingProductEdit, setSavingProductEdit] = useState(false);

  // Delete Product Confirmation State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Inline Variant edit
  const startEditVariant = (variant: Variant) => {
    setEditingVariant(variant.id);
    setEditValue(variant.quantity);
  };

  const saveEditVariant = async (variantId: string) => {
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

  // Delete individual variant size
  const handleDeleteVariant = async (productId: string, variantId: string, sizeName: string) => {
    if (!confirm(`Remove size ${sizeName} from this garment style?`)) return;

    try {
      const res = await fetch(`/api/variants?id=${variantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) }
            : p
        )
      );
      toast(`Size ${sizeName} removed`, "success");
    } catch {
      toast("Failed to delete size variant", "error");
    }
  };

  // Open Edit Product Dialog
  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditFormBrand(product.brand);
    setEditFormMrp(product.mrp);
    setEditFormCategoryId(product.category.id);
    setEditFormPattern(product.pattern);
    setEditFormFabric(product.fabric);
    setEditFormSleeve(product.sleeve);
    setEditFormNotes(product.notes || "");
  };

  // Submit Product Edit
  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    setSavingProductEdit(true);

    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          brand: editFormBrand.trim() || "Unbranded",
          mrp: editFormMrp,
          categoryId: editFormCategoryId,
          pattern: editFormPattern,
          fabric: editFormFabric,
          sleeve: editFormSleeve,
          notes: editFormNotes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error();
      const updated = await res.json();

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? updated : p))
      );
      toast("Garment details updated successfully", "success");
      setEditingProduct(null);
    } catch {
      toast("Failed to update garment details", "error");
    } finally {
      setSavingProductEdit(false);
    }
  };

  // Delete entire Product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/products?id=${deletingProduct.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      toast(`Deleted ${deletingProduct.brand} (${deletingProduct.category.name}) from inventory`, "success");
      setDeletingProduct(null);
    } catch {
      toast("Failed to delete item from inventory", "error");
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Live Inventory</span>
            <Badge variant="subtle" className="text-[10px] font-semibold">
              Real-time
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Storewide physical counts, edits & valuations
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
        <Card className="p-3.5 bg-indigo-50/70 border-indigo-100 text-center shadow-xs">
          <div className="w-8 h-8 mx-auto rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 mb-2">
            <Package size={16} />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {totalPcs.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Total Pcs
          </div>
        </Card>

        <Card className="p-3.5 bg-purple-50/70 border-purple-100 text-center shadow-xs">
          <div className="w-8 h-8 mx-auto rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 mb-2">
            <Layers size={16} />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {uniqueStyles}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Styles
          </div>
        </Card>

        <Card className="p-3.5 bg-emerald-50/70 border-emerald-100 text-center shadow-xs">
          <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-2">
            <IndianRupee size={16} />
          </div>
          <div className="text-sm font-black text-emerald-700 tracking-tight truncate">
            {formatINR(totalValue)}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10"
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
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500">Loading live stock data...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16 px-6 bg-white border-slate-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
            <Package size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            {search || categoryFilter
              ? "No matching garments found"
              : "No stock recorded yet"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
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
                className="overflow-hidden border-slate-200/90 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                {/* Header card banner */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(product.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <Badge variant="default" className="text-[10px] py-0 font-medium">
                        {product.category.name}
                      </Badge>
                      {product.pattern && (
                        <Badge variant="subtle" className="text-[10px] py-0 font-medium">
                          {product.pattern}
                        </Badge>
                      )}
                      {product.fabric && (
                        <Badge variant="outline" className="text-[10px] py-0 font-medium">
                          {product.fabric}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {product.brand}
                    </h3>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {product.sleeve && <span>{product.sleeve}</span>}
                      <span className="font-bold text-emerald-600">
                        ₹{product.mrp}
                      </span>
                    </div>
                  </button>

                  {/* Action buttons & quantity count */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <div className="text-lg font-black text-slate-900">
                        {totalQty}
                      </div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        Pcs
                      </div>
                    </div>

                    {/* Edit Garment Style Button */}
                    <button
                      type="button"
                      onClick={() => openEditProduct(product)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-colors"
                      title="Edit style details"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete Garment Style Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingProduct(product)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-colors"
                      title="Delete from inventory"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(product.id)}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded variant breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 space-y-2 animate-slide-up">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1 mb-2">
                      <span>Size Breakdown</span>
                      <span>Tap quantity to edit</span>
                    </div>

                    <div className="space-y-1.5">
                      {product.variants.map((v) => {
                        const isEditing = editingVariant === v.id;
                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs"
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
                                  onClick={() => saveEditVariant(v.id)}
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
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditVariant(v)}
                                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200/70 transition-all group"
                                >
                                  <span className="text-sm font-extrabold text-slate-900">
                                    {v.quantity}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    pcs
                                  </span>
                                  <Edit3
                                    size={12}
                                    className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(product.id, v.id, v.size)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                  title={`Remove ${v.size}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {product.notes && (
                      <p className="text-[11px] text-slate-500 pt-2 italic border-t border-slate-200">
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

      {/* ── Edit Product Dialog ── */}
      <Dialog
        open={Boolean(editingProduct)}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Garment Style</DialogTitle>
            <DialogDescription>
              Update product details, brand, or retail pricing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                Brand / Company
              </label>
              <Input
                value={editFormBrand}
                onChange={(e) => setEditFormBrand(e.target.value)}
                placeholder="Brand name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                  Retail MRP (₹)
                </label>
                <Input
                  type="number"
                  value={editFormMrp}
                  onChange={(e) => setEditFormMrp(Math.max(1, parseInt(e.target.value) || 0))}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                  Category
                </label>
                <select
                  value={editFormCategoryId}
                  onChange={(e) => setEditFormCategoryId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">
                  Pattern
                </label>
                <select
                  value={editFormPattern || ""}
                  onChange={(e) => setEditFormPattern(e.target.value || null)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none"
                >
                  <option value="">None</option>
                  {PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">
                  Fabric
                </label>
                <select
                  value={editFormFabric || ""}
                  onChange={(e) => setEditFormFabric(e.target.value || null)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none"
                >
                  <option value="">None</option>
                  {FABRICS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">
                  Sleeve
                </label>
                <select
                  value={editFormSleeve || ""}
                  onChange={(e) => setEditFormSleeve(e.target.value || null)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 outline-none"
                >
                  <option value="">None</option>
                  {SLEEVES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                Notes / Rack Description
              </label>
              <Input
                value={editFormNotes}
                onChange={(e) => setEditFormNotes(e.target.value)}
                placeholder="Rack notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProduct(null)}
              disabled={savingProductEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveProductEdit}
              disabled={savingProductEdit}
              className="gap-2"
            >
              {savingProductEdit && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-200">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-center">
              Delete Garment Style?
            </DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 font-bold">
                {deletingProduct?.brand} ({deletingProduct?.category.name})
              </strong>{" "}
              and all its counted sizes from inventory? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingProduct(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 size={15} className="animate-spin" />}
              Yes, Delete Style
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
