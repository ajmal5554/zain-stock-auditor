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
  LayoutGrid,
  List,
  ArrowDownToLine,
  ShoppingBag,
} from "lucide-react";
import { toast } from "@/components/toaster";
import {
  formatINR,
  PATTERNS,
  FABRICS,
  SLEEVES,
  FITS,
  POPULAR_COLORS,
  MUNDU_BORDERS,
  isInnerwearCategory,
  isMunduCategory,
} from "@/lib/constants";
import { resolveCategoryAttributes } from "@/lib/store-defaults";

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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
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
  customMeta?: Record<string, string> | null;
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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

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
  const [editFormCollar, setEditFormCollar] = useState<string | null>(null);
  const [editFormSubtype, setEditFormSubtype] = useState<string | null>(null);
  const [editFormBorder, setEditFormBorder] = useState<string | null>(null);
  const [editFormFit, setEditFormFit] = useState<string | null>(null);
  const [editFormColor, setEditFormColor] = useState<string | null>(null);
  const [editFormNotes, setEditFormNotes] = useState("");
  const [savingProductEdit, setSavingProductEdit] = useState(false);

  // Active category & attributes for the style being edited
  const selectedEditCategory = categories.find((c) => c.id === editFormCategoryId);
  const selectedEditCatName = selectedEditCategory?.name || "";
  const editCatAttrs = resolveCategoryAttributes(selectedEditCatName, {});

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

  // Instant optimistic adjustment for table +/- buttons
  const adjustVariantQuick = async (
    productId: string,
    variantId: string,
    delta: number
  ) => {
    const prod = products.find((p) => p.id === productId);
    const variant = prod?.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const newQty = Math.max(0, variant.quantity + delta);
    if (newQty === variant.quantity) return;

    // Optimistic update in UI
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, quantity: newQty } : v
              ),
            }
          : p
      )
    );

    try {
      const res = await fetch("/api/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: newQty }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast("Failed to update stock count", "error");
      fetchProducts(search, categoryFilter);
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
    setEditFormCollar(product.customMeta?.collar || null);
    setEditFormSubtype(product.customMeta?.subtype || null);
    setEditFormBorder(product.customMeta?.border || null);

    // Extract Fit: from customMeta.fit or regex match from notes
    const extractedFit =
      product.customMeta?.fit ||
      product.notes?.match(/(Regular|Slim|Comfort|Relaxed|Oversized|Classic)\s+Fit/i)?.[0] ||
      "Regular Fit";
    setEditFormFit(extractedFit);

    // Extract Color: from customMeta.color or notes
    let extractedColor = product.customMeta?.color || null;
    if (!extractedColor && product.notes) {
      if (/white/i.test(product.notes)) extractedColor = "White";
      else if (/color/i.test(product.notes)) extractedColor = "Color";
    }
    setEditFormColor(extractedColor || "Color");

    // Extract user notes excluding fit & color prefix
    let rawNotes = product.notes || "";
    if (rawNotes.includes("|")) {
      const parts = rawNotes.split("|");
      rawNotes = parts.slice(1).join("|").trim();
    } else {
      rawNotes = rawNotes
        .replace(/(Regular|Slim|Comfort|Relaxed|Oversized|Classic)\s+Fit/gi, "")
        .replace(/•\s*(White|Color|[a-zA-Z\s]+)/gi, "")
        .replace(/^[\s•|]+|[\s•|]+$/g, "")
        .trim();
    }
    setEditFormNotes(rawNotes);
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
          collar: editFormCollar,
          subtype: editFormSubtype,
          border: editFormBorder,
          fit: editFormFit,
          color: editFormColor,
          userNote: editFormNotes.trim(),
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

  const renderProductCard = (product: Product) => {
    const isExpanded = expandedIds.has(product.id);
    const totalQty = product.variants.reduce((s, v) => s + v.quantity, 0);

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
              {product.customMeta?.subtype && (
                <Badge variant="subtle" className="text-[10px] py-0 font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                  {product.customMeta.subtype}
                </Badge>
              )}
              {product.customMeta?.collar && (
                <Badge variant="subtle" className="text-[10px] py-0 font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {product.customMeta.collar}
                </Badge>
              )}
              {product.customMeta?.border && (
                <Badge variant="subtle" className="text-[10px] py-0 font-semibold bg-amber-50 text-amber-700 border-amber-200">
                  {product.customMeta.border}
                </Badge>
              )}
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
              {(product.customMeta?.fit || product.notes?.match(/(Regular|Slim|Comfort)\s+Fit/i)?.[0]) && (
                <Badge variant="subtle" className="text-[10px] py-0 font-semibold bg-purple-50 text-purple-700 border-purple-200">
                  {product.customMeta?.fit || product.notes?.match(/(Regular|Slim|Comfort)\s+Fit/i)?.[0]}
                </Badge>
              )}
              {(product.customMeta?.color || product.notes) && (
                <Badge
                  variant="subtle"
                  className={`text-[10px] py-0 font-bold ${
                    (product.customMeta?.color?.toLowerCase() === "white" || product.notes?.toLowerCase().includes("white"))
                      ? "bg-slate-100 text-slate-800 border-slate-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {product.customMeta?.color || (product.notes?.toLowerCase().includes("white") ? "White" : "Color")}
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
              {product.notes && (
                <span className="truncate text-slate-400">📍 {product.notes}</span>
              )}
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
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
                  >
                    <span className="font-extrabold text-sm text-slate-800 ml-1">
                      {v.size}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 animate-fade-in">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-28 md:pb-16">
      {/* ── Responsive Header ── */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Live Inventory & Stock Control</span>
              <Badge variant="subtle" className="text-[10px] font-bold uppercase tracking-wider">
                Real-time
              </Badge>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Storewide physical counts, SKU variations, inline adjustments & valuations
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchProducts(search, categoryFilter);
            }}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-semibold"
            title="Refresh counts"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Link href="/export">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <ArrowDownToLine size={14} />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </Link>

          <Link href="/audit">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <Plus size={14} />
              <span>Audit Rack</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* ── KPI Metric Cards Row (4 cards on desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Card className="p-4 bg-indigo-50/70 border-indigo-100 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalPcs.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Total Pcs in Store
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/70 border-emerald-100 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <IndianRupee size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 tracking-tight truncate">
              {formatINR(totalValue)}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Total Valuation (MRP)
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-50/70 border-purple-100 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {uniqueStyles}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Garment Styles / SKUs
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/70 border-amber-100 flex items-center gap-3.5 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {categories.length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Audited Categories
            </div>
          </div>
        </Card>
      </div>

      {/* ── Search & Filter Controls with View Mode Switcher ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, category, style, notes..."
              className="pl-10 text-xs h-10 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shrink-0"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop View Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List size={14} />
            <span>Table View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "cards"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards View</span>
          </button>
        </div>
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
        <>
          {/* Mobile Product Cards (always visible on phone) */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => renderProductCard(product))}
          </div>

          {/* Desktop Product Views */}
          <div className="hidden md:block">
            {viewMode === "table" ? (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-4">Garment / Brand</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Category</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Attributes</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">MRP</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs min-w-[280px]">Sizes in Stock (Quick Adjust)</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-center">Total Pcs</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Valuation</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const totalQty = product.variants.reduce((s, v) => s + v.quantity, 0);
                        const valuation = totalQty * product.mrp;
                        return (
                          <TableRow key={product.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                            <TableCell className="py-3.5 pl-4 font-semibold text-slate-900">
                              <div className="font-bold text-slate-900">{product.brand}</div>
                              {product.notes && (
                                <div className="text-[11px] text-slate-400 font-normal italic truncate max-w-[200px]">
                                  {product.notes}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-semibold text-[11px] px-2 py-0.5">
                                {product.category.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {product.customMeta?.subtype && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                                    {product.customMeta.subtype}
                                  </span>
                                )}
                                {product.customMeta?.collar && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-100">
                                    {product.customMeta.collar}
                                  </span>
                                )}
                                {product.customMeta?.border && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-semibold text-amber-700 border border-amber-100">
                                    {product.customMeta.border}
                                  </span>
                                )}
                                {product.pattern && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                    {product.pattern}
                                  </span>
                                )}
                                {product.fabric && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                    {product.fabric}
                                  </span>
                                )}
                                {product.sleeve && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                    {product.sleeve}
                                  </span>
                                )}
                                {(product.customMeta?.fit || product.notes?.match(/(Regular|Slim|Comfort)\s+Fit/i)?.[0]) && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-100">
                                    {product.customMeta?.fit || product.notes?.match(/(Regular|Slim|Comfort)\s+Fit/i)?.[0]}
                                  </span>
                                )}
                                {(product.customMeta?.color || product.notes) && (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    (product.customMeta?.color?.toLowerCase() === "white" || product.notes?.toLowerCase().includes("white"))
                                      ? "bg-slate-100 text-slate-800 border-slate-300"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}>
                                    {product.customMeta?.color || (product.notes?.toLowerCase().includes("white") ? "White" : "Color")}
                                  </span>
                                )}
                                {!product.pattern && !product.fabric && !product.sleeve && !product.customMeta && !product.notes && (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              ₹{product.mrp.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {product.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs group"
                                  >
                                    <span className="font-bold text-slate-700">{v.size}:</span>
                                    <span className="font-extrabold text-slate-900">{v.quantity}</span>
                                    <div className="flex items-center ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => adjustVariantQuick(product.id, v.id, -1)}
                                        disabled={v.quantity <= 0}
                                        className="w-4 h-4 rounded flex items-center justify-center hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                        title="Decrease 1"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => adjustVariantQuick(product.id, v.id, 1)}
                                        className="w-4 h-4 rounded flex items-center justify-center hover:bg-slate-200 text-slate-600"
                                        title="Increase 1"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs">
                                {totalQty}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-700 text-xs">
                              {formatINR(valuation)}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(product)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit Garment"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingProduct(product)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Product"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => renderProductCard(product))}
              </div>
            )}
          </div>
        </>
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

            {/* Category-Specific Attributes: Collar / Subtype / Border */}
            {!isInnerwearCategory(selectedEditCatName) && !isMunduCategory(selectedEditCatName) && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Collar / Neck Style</span>
                  {editFormCollar && (
                    <span className="text-[10px] text-blue-700 font-semibold lowercase">
                      ({editFormCollar})
                    </span>
                  )}
                </label>
                <select
                  value={editFormCollar || ""}
                  onChange={(e) => setEditFormCollar(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600"
                >
                  <option value="">None / Not Specified</option>
                  {(editCatAttrs.collars || [
                    "Regular Collar",
                    "Mandarin / Chinese Collar",
                    "Button-Down",
                    "Cutaway Collar",
                    "Cuban Collar",
                    "Polo / Collar",
                    "Round Neck",
                    "V-Neck",
                  ]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {editFormCollar &&
                    !(editCatAttrs.collars || [
                      "Regular Collar",
                      "Mandarin / Chinese Collar",
                      "Button-Down",
                      "Cutaway Collar",
                      "Cuban Collar",
                      "Polo / Collar",
                      "Round Neck",
                      "V-Neck",
                    ]).includes(editFormCollar) && (
                      <option value={editFormCollar}>{editFormCollar}</option>
                    )}
                </select>
              </div>
            )}

            {(isInnerwearCategory(selectedEditCatName) || editFormSubtype || (editCatAttrs.subtypes && editCatAttrs.subtypes.length > 0)) && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Garment Subtype</span>
                  {editFormSubtype && (
                    <span className="text-[10px] text-indigo-700 font-semibold lowercase">
                      ({editFormSubtype})
                    </span>
                  )}
                </label>
                <select
                  value={editFormSubtype || ""}
                  onChange={(e) => setEditFormSubtype(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600"
                >
                  <option value="">None / Not Specified</option>
                  {(editCatAttrs.subtypes || [
                    "Brief",
                    "Trunk",
                    "Boxer Brief",
                    "Vest (Sleeveless)",
                    "Gym Vest",
                    "Drawer",
                  ]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {editFormSubtype &&
                    !(editCatAttrs.subtypes || [
                      "Brief",
                      "Trunk",
                      "Boxer Brief",
                      "Vest (Sleeveless)",
                      "Gym Vest",
                      "Drawer",
                    ]).includes(editFormSubtype) && (
                      <option value={editFormSubtype}>{editFormSubtype}</option>
                    )}
                </select>
              </div>
            )}

            {(isMunduCategory(selectedEditCatName) || editFormBorder || (editCatAttrs.borders && editCatAttrs.borders.length > 0)) && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Border / Kasavu</span>
                  {editFormBorder && (
                    <span className="text-[10px] text-amber-700 font-semibold lowercase">
                      ({editFormBorder})
                    </span>
                  )}
                </label>
                <select
                  value={editFormBorder || ""}
                  onChange={(e) => setEditFormBorder(e.target.value || null)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600"
                >
                  <option value="">None / Not Specified</option>
                  {(editCatAttrs.borders || MUNDU_BORDERS).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {editFormBorder &&
                    !(editCatAttrs.borders || MUNDU_BORDERS).includes(editFormBorder) && (
                      <option value={editFormBorder}>{editFormBorder}</option>
                    )}
                </select>
              </div>
            )}

            {/* Dedicated Fit Style and Color Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Fit Style</span>
                  {editFormFit && (
                    <span className="text-[10px] text-purple-700 font-semibold lowercase">
                      ({editFormFit})
                    </span>
                  )}
                </label>
                <select
                  value={editFormFit || "Regular Fit"}
                  onChange={(e) => setEditFormFit(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600"
                >
                  {FITS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="Relaxed Fit">Relaxed Fit</option>
                  <option value="Oversized">Oversized</option>
                  <option value="Classic Fit">Classic Fit</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Color / Shade</span>
                  <span className={`text-[10px] font-bold ${
                    editFormColor?.toLowerCase() === "white" ? "text-slate-700" : "text-emerald-700"
                  }`}>
                    ({editFormColor || "Color"})
                  </span>
                </label>
                <select
                  value={editFormColor || "Color"}
                  onChange={(e) => setEditFormColor(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs outline-none focus:border-indigo-600"
                >
                  {POPULAR_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c === "Color" ? "Color (Colored Garment)" : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                Additional Notes / Rack Location (Optional)
              </label>
              <Input
                value={editFormNotes}
                onChange={(e) => setEditFormNotes(e.target.value)}
                placeholder="e.g. Rack A3, Double pocket, Chinese collar..."
                className="text-xs"
              />
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-400">Resulting Notes:</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {[editFormFit || "Regular Fit", editFormColor || "Color"].filter(Boolean).join(" • ")}
                  {editFormNotes.trim() ? ` | ${editFormNotes.trim()}` : ""}
                </span>
              </div>
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
