"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { auditEntrySchema, type AuditEntryInput } from "@/lib/schemas";
import {
  PATTERNS,
  SLEEVES,
  FABRICS,
  getSizePresets,
  shouldShowSleeve,
} from "@/lib/constants";
import { enqueueOffline, setupOfflineSync } from "@/lib/offline-queue";

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

interface SizeEntry {
  size: string;
  quantity: number;
}

export default function AuditPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [showSleeve, setShowSleeve] = useState(true);
  const [saveCount, setSaveCount] = useState(0);

  const brandInputRef = useRef<HTMLInputElement>(null);
  const mrpInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AuditEntryInput>({
    resolver: zodResolver(auditEntrySchema),
    defaultValues: {
      categoryId: "",
      brand: "",
      pattern: null,
      fabric: null,
      sleeve: null,
      mrp: 0,
      costPrice: null,
      notes: null,
      variants: [],
    },
  });

  const watchedCategoryId = watch("categoryId");
  const watchedBrand = watch("brand");

  // Load categories and brands
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => toast("Failed to load categories", "error"));

    fetch("/api/brands")
      .then((r) => r.json())
      .then(setBrands)
      .catch(() => {});

    const cleanup = setupOfflineSync();
    return cleanup;
  }, []);

  // Update sizes when category changes
  useEffect(() => {
    if (watchedCategoryId) {
      const cat = categories.find((c) => c.id === watchedCategoryId);
      if (cat) {
        setSelectedCategoryName(cat.name);
        setShowSleeve(shouldShowSleeve(cat.name));
        const presets = getSizePresets(cat.name);
        setSizes(presets.map((s) => ({ size: s, quantity: 0 })));
        if (!shouldShowSleeve(cat.name)) {
          setValue("sleeve", null);
        }
      }
    }
  }, [watchedCategoryId, categories, setValue]);

  // Brand autocomplete
  useEffect(() => {
    if (watchedBrand && watchedBrand.length > 0) {
      const filtered = brands.filter((b) =>
        b.toLowerCase().includes(watchedBrand.toLowerCase())
      );
      setFilteredBrands(filtered);
      setShowBrandDropdown(filtered.length > 0);
    } else {
      setShowBrandDropdown(false);
    }
  }, [watchedBrand, brands]);

  // Update form variants whenever sizes change
  useEffect(() => {
    setValue("variants", sizes);
  }, [sizes, setValue]);

  const updateQuantity = useCallback(
    (index: number, delta: number) => {
      setSizes((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: Math.max(0, updated[index].quantity + delta),
        };
        return updated;
      });
    },
    []
  );

  const setQuantity = useCallback(
    (index: number, value: number) => {
      setSizes((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: Math.max(0, Math.floor(value)),
        };
        return updated;
      });
    },
    []
  );

  const addCustomSize = useCallback(() => {
    const trimmed = customSizeInput.trim();
    if (trimmed && !sizes.find((s) => s.size === trimmed)) {
      setSizes((prev) => [...prev, { size: trimmed, quantity: 0 }]);
      setCustomSizeInput("");
      setShowCustomSize(false);
    }
  }, [customSizeInput, sizes]);

  const removeSize = useCallback((index: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to create category", "error");
        return;
      }
      const cat = await res.json();
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setValue("categoryId", cat.id);
      setShowNewCategory(false);
      setNewCategoryName("");
      toast(`${cat.name} category added!`, "success");
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setCreatingCategory(false);
    }
  };

  const onSubmit = async (data: AuditEntryInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      setSaveCount((c) => c + 1);
      toast(`✓ Saved! (${saveCount + 1} items this session)`, "success");

      // Refresh brands list
      fetch("/api/brands")
        .then((r) => r.json())
        .then(setBrands)
        .catch(() => {});

      // Reset: clear sizes and quantity, keep category & brand for batch entry
      const currentCategoryId = data.categoryId;
      const currentBrand = data.brand;
      reset({
        categoryId: currentCategoryId,
        brand: currentBrand,
        pattern: null,
        fabric: null,
        sleeve: null,
        mrp: 0,
        costPrice: null,
        notes: null,
        variants: [],
      });

      // Reset sizes to category presets with 0 quantities
      const cat = categories.find((c) => c.id === currentCategoryId);
      if (cat) {
        const presets = getSizePresets(cat.name);
        setSizes(presets.map((s) => ({ size: s, quantity: 0 })));
      }

      // Focus MRP for next quick entry
      setTimeout(() => mrpInputRef.current?.focus(), 100);
    } catch {
      // Offline fallback: cache to localStorage
      enqueueOffline("/api/products", "POST", data);
      toast("Saved offline — will sync when connected", "info");

      // Still reset form
      const currentCategoryId = data.categoryId;
      const currentBrand = data.brand;
      reset({
        categoryId: currentCategoryId,
        brand: currentBrand,
        pattern: null,
        fabric: null,
        sleeve: null,
        mrp: 0,
        costPrice: null,
        notes: null,
        variants: [],
      });
      const cat = categories.find((c) => c.id === currentCategoryId);
      if (cat) {
        const presets = getSizePresets(cat.name);
        setSizes(presets.map((s) => ({ size: s, quantity: 0 })));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-36">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Zain Stock Auditor</h1>
            <p className="text-xs text-slate-400">Rapid Aisle Audit Mode</p>
          </div>
        </div>
        {saveCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400 animate-fade-in">
            <CheckCircle2 size={16} />
            <span>{saveCount} items recorded this session</span>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Category Selector ── */}
        <section className="card p-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setValue("categoryId", cat.id)}
                className={`pill-btn ${
                  watchedCategoryId === cat.id ? "pill-btn-active" : ""
                }`}
              >
                {cat.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="pill-btn flex items-center gap-1.5 border-dashed"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {errors.categoryId && (
            <p className="text-red-400 text-xs mt-2">
              {errors.categoryId.message}
            </p>
          )}

          {/* New Category Modal */}
          {showNewCategory && (
            <div className="mt-3 flex gap-2 animate-slide-up">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createCategory())}
                placeholder="Category name..."
                className="input-field flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={creatingCategory}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {creatingCategory ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategory(false)}
                className="px-2 text-slate-400 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </section>

        {/* ── Brand ── */}
        <section className="card p-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
            Brand
          </label>
          <div className="relative">
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  ref={brandInputRef}
                  type="text"
                  placeholder="Type brand name..."
                  className="input-field"
                  autoComplete="off"
                  onFocus={() => {
                    if (field.value && filteredBrands.length > 0) {
                      setShowBrandDropdown(true);
                    }
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowBrandDropdown(false), 200)
                  }
                />
              )}
            />
            {showBrandDropdown && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto animate-scale-in">
                {filteredBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setValue("brand", b);
                      setShowBrandDropdown(false);
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.brand && (
            <p className="text-red-400 text-xs mt-2">{errors.brand.message}</p>
          )}
        </section>

        {/* ── Attributes ── */}
        <section className="card p-4 space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Attributes
          </label>

          {/* Pattern */}
          <div>
            <span className="text-xs text-slate-500 mb-2 block">Pattern</span>
            <Controller
              name="pattern"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        field.onChange(field.value === p ? null : p)
                      }
                      className={`pill-btn text-xs ${
                        field.value === p ? "pill-btn-active" : ""
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Sleeve — conditionally hidden */}
          {showSleeve && (
            <div className="animate-fade-in">
              <span className="text-xs text-slate-500 mb-2 block">Sleeve</span>
              <Controller
                name="sleeve"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {SLEEVES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          field.onChange(field.value === s ? null : s)
                        }
                        className={`pill-btn text-xs ${
                          field.value === s ? "pill-btn-active" : ""
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* Fabric */}
          <div>
            <span className="text-xs text-slate-500 mb-2 block">Fabric</span>
            <Controller
              name="fabric"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {FABRICS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() =>
                        field.onChange(field.value === f ? null : f)
                      }
                      className={`pill-btn text-xs ${
                        field.value === f ? "pill-btn-active" : ""
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        </section>

        {/* ── MRP ── */}
        <section className="card p-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
            MRP (₹)
          </label>
          <Controller
            name="mrp"
            control={control}
            render={({ field }) => (
              <input
                ref={mrpInputRef}
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="input-field text-3xl font-bold text-center tracking-wide"
                value={field.value || ""}
                onFocus={(e) => {
                  if (e.target.value === "0") e.target.value = "";
                }}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  field.onChange(Math.max(0, val));
                }}
              />
            )}
          />
          {errors.mrp && (
            <p className="text-red-400 text-xs mt-2">{errors.mrp.message}</p>
          )}
        </section>

        {/* ── Size-Quantity Matrix ── */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sizes & Quantities
            </label>
            <button
              type="button"
              onClick={() => setShowCustomSize(true)}
              className="text-xs text-indigo-400 font-medium flex items-center gap-1 hover:text-indigo-300 transition-colors"
            >
              <Plus size={14} />
              Custom Size
            </button>
          </div>

          {showCustomSize && (
            <div className="flex gap-2 mb-3 animate-slide-up">
              <input
                type="text"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
                placeholder="e.g. 46, 3XL..."
                className="input-field flex-1 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={addCustomSize}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCustomSize(false)}
                className="px-2 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {sizes.map((entry, idx) => (
              <div
                key={`${entry.size}-${idx}`}
                className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-slate-200 w-16 text-center">
                  {entry.size}
                </span>
                <div className="flex items-center gap-1 flex-1 justify-center">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, -1)}
                    className="w-10 h-10 rounded-lg bg-slate-600 hover:bg-slate-500 flex items-center justify-center text-white transition-colors active:scale-90"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={entry.quantity}
                    onChange={(e) =>
                      setQuantity(idx, parseInt(e.target.value) || 0)
                    }
                    onFocus={(e) => e.target.select()}
                    className="w-16 text-center text-lg font-bold bg-transparent text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-colors active:scale-90"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeSize(idx)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {sizes.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">
              Select a category to load size presets
            </p>
          )}
          {errors.variants && (
            <p className="text-red-400 text-xs mt-2">
              {typeof errors.variants === "object" && "message" in errors.variants
                ? (errors.variants as { message?: string }).message
                : "At least one size must have quantity > 0"}
            </p>
          )}
        </section>

        {/* ── Notes ── */}
        <section className="card p-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
            Notes (optional)
          </label>
          <input
            {...register("notes")}
            type="text"
            placeholder="e.g. Chinese collar, Double pocket..."
            className="input-field text-sm"
          />
        </section>

        {/* ── Sticky Submit Bar ── */}
        <div className="sticky-action-bar">
          <button type="submit" disabled={submitting} className="success-btn">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </span>
            ) : (
              "Save & Scan Next Rack →"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
