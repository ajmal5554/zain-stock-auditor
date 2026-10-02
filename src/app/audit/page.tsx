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
  ShoppingBag,
  IndianRupee,
  Search,
  Tag,
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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
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
  const watchedMrp = watch("mrp");

  // Calculate current item pieces
  const totalItemPieces = sizes.reduce((sum, s) => sum + s.quantity, 0);

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

  // Sync sizes with react-hook-form
  useEffect(() => {
    setValue("variants", sizes);
  }, [sizes, setValue]);

  const updateQuantity = useCallback((index: number, delta: number) => {
    setSizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: Math.max(0, updated[index].quantity + delta),
      };
      return updated;
    });
  }, []);

  const setQuantity = useCallback((index: number, value: number) => {
    setSizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: Math.max(0, Math.floor(value)),
      };
      return updated;
    });
  }, []);

  const addCustomSize = useCallback(() => {
    const trimmed = customSizeInput.trim();
    if (trimmed && !sizes.find((s) => s.size === trimmed)) {
      setSizes((prev) => [...prev, { size: trimmed, quantity: 1 }]);
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
      setCategories((prev) =>
        [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))
      );
      setValue("categoryId", cat.id);
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
      toast(`${cat.name} category created!`, "success");
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
      toast(
        `✓ Count saved! (${saveCount + 1} rack styles recorded)`,
        "success"
      );

      // Refresh brands list
      fetch("/api/brands")
        .then((r) => r.json())
        .then(setBrands)
        .catch(() => {});

      // Clear quantities & sizes, preserve Category and Brand for rapid batch entry
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

      setTimeout(() => mrpInputRef.current?.focus(), 150);
    } catch {
      // Offline fallback: queue to localStorage
      enqueueOffline("/api/products", "POST", data);
      toast("Saved offline — will sync once reconnected", "info");

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
    <div className="max-w-lg mx-auto px-4 pt-5 pb-36">
      {/* ── Header ── */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white">
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Zain Gents Palace
              </h1>
              <Badge variant="success" className="text-[10px] py-0 px-2">
                Live
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Aisle Physical Audit Terminal
            </p>
          </div>
        </div>

        {saveCount > 0 && (
          <Badge variant="default" className="gap-1 px-3 py-1 font-bold">
            <CheckCircle2 size={13} />
            <span>{saveCount} Saved</span>
          </Badge>
        )}
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ── Category Section ── */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                1. Garment Category
              </CardTitle>
              <CardDescription>
                {selectedCategoryName
                  ? `Selected: ${selectedCategoryName}`
                  : "Tap to select aisle section"}
              </CardDescription>
            </div>

            <Dialog
              open={isCategoryDialogOpen}
              onOpenChange={setIsCategoryDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs border-dashed text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  <Plus size={14} />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a custom category for store sections (e.g. Kurtas,
                    Blazers, Ties).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Input
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createCategory();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCategoryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={createCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                  >
                    {creatingCategory && (
                      <Loader2 size={16} className="animate-spin mr-1" />
                    )}
                    Save Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = watchedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setValue("categoryId", cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none cursor-pointer border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 font-bold"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {errors.categoryId && (
              <p className="text-rose-600 text-xs mt-2 font-medium">
                {errors.categoryId.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Brand Section ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              2. Brand Name
            </CardTitle>
            <CardDescription>
              Smart autocomplete from inventory records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <Input
                      {...field}
                      ref={brandInputRef}
                      placeholder="e.g. Raymond, Otto, Allen Solly, Local..."
                      className="pl-10 text-sm"
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
                  </div>
                )}
              />

              {showBrandDropdown && (
                <div className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto animate-slide-up divide-y divide-slate-100">
                  {filteredBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setValue("brand", b);
                        setShowBrandDropdown(false);
                      }}
                    >
                      <span>{b}</span>
                      <Tag size={12} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.brand && (
              <p className="text-rose-600 text-xs mt-2 font-medium">
                {errors.brand.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Garment Attributes ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              3. Garment Attributes
            </CardTitle>
            <CardDescription>
              One-tap segmented attribute selectors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pattern */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Pattern
              </span>
              <Controller
                name="pattern"
                control={control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || null)}
                    variant="outline"
                  >
                    {PATTERNS.map((p) => (
                      <ToggleGroupItem key={p} value={p}>
                        {p}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </div>

            {/* Sleeve — auto-hidden for pants, mundus, etc. */}
            {showSleeve && (
              <div className="animate-fade-in pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Sleeve Type
                </span>
                <Controller
                  name="sleeve"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || null)}
                      variant="outline"
                    >
                      {SLEEVES.map((s) => (
                        <ToggleGroupItem key={s} value={s}>
                          {s}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </div>
            )}

            {/* Fabric */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Fabric Material
              </span>
              <Controller
                name="fabric"
                control={control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    value={field.value || ""}
                    onValueChange={(val) => field.onChange(val || null)}
                    variant="outline"
                  >
                    {FABRICS.map((f) => (
                      <ToggleGroupItem key={f} value={f}>
                        {f}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── MRP Price Card ── */}
        <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50/60 via-white to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-indigo-900 font-bold">
                4. Retail MRP Price (₹)
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Whole Rupee
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-600 pointer-events-none">
                  ₹
                </div>
                <Controller
                  name="mrp"
                  control={control}
                  render={({ field }) => (
                    <Input
                      ref={mrpInputRef}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      className="pl-10 text-center text-3xl font-extrabold h-16 tracking-tight bg-white border-indigo-200 text-slate-900 shadow-xs focus-visible:ring-indigo-500/20"
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
              </div>

              {/* Quick price increment buttons */}
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 font-bold"
                  onClick={() =>
                    setValue("mrp", Math.max(0, (watchedMrp || 0) + 100))
                  }
                >
                  +₹100
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 font-bold"
                  onClick={() =>
                    setValue("mrp", Math.max(0, (watchedMrp || 0) + 500))
                  }
                >
                  +₹500
                </Button>
              </div>
            </div>
            {errors.mrp && (
              <p className="text-rose-600 text-xs mt-2 font-medium">
                {errors.mrp.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Size & Quantity Matrix ── */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                5. Size & Physical Count Matrix
              </CardTitle>
              <CardDescription>
                {totalItemPieces > 0 ? (
                  <span className="text-emerald-600 font-bold">
                    {totalItemPieces} pieces ready to save
                  </span>
                ) : (
                  "Adjust rack quantities per size"
                )}
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustomSize(!showCustomSize)}
              className="gap-1 text-xs border-dashed text-indigo-600 border-indigo-300"
            >
              <Plus size={14} />
              Custom
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {showCustomSize && (
              <div className="flex gap-2 p-3 rounded-xl bg-slate-50 border border-indigo-200 animate-slide-up">
                <Input
                  placeholder="e.g. 36, 46, Free Size..."
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSize();
                    }
                  }}
                  className="h-9 text-xs"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomSize}
                  className="h-9"
                >
                  Add Size
                </Button>
              </div>
            )}

            {/* Matrix grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sizes.map((entry, idx) => {
                const hasCount = entry.quantity > 0;
                return (
                  <div
                    key={`${entry.size}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                      hasCount
                        ? "bg-indigo-50/60 border-indigo-200 shadow-2xs"
                        : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          hasCount
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        {entry.size}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, -1)}
                        disabled={entry.quantity <= 0}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                      >
                        <Minus size={15} />
                      </button>

                      <input
                        type="number"
                        inputMode="numeric"
                        value={entry.quantity}
                        onChange={(e) =>
                          setQuantity(idx, parseInt(e.target.value) || 0)
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-12 text-center text-base font-extrabold bg-transparent text-slate-900 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, 1)}
                        className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs"
                      >
                        <Plus size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeSize(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Remove size"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {sizes.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-6">
                Please select a category above to load size presets.
              </p>
            )}

            {errors.variants && (
              <p className="text-rose-600 text-xs mt-2 font-medium">
                {typeof errors.variants === "object" &&
                "message" in errors.variants
                  ? (errors.variants as { message?: string }).message
                  : "At least one size must have a quantity > 0"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Notes ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              6. Garment Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              {...register("notes")}
              placeholder="e.g. Double pocket, Chinese collar, Slim fit..."
              className="text-xs"
            />
          </CardContent>
        </Card>

        {/* ── Sticky Bottom Bar ── */}
        <div className="fixed bottom-16 left-0 right-0 p-3 z-30 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Button
              type="submit"
              disabled={submitting || totalItemPieces === 0}
              variant="success"
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-emerald-600/25 flex items-center justify-between px-6"
            >
              {submitting ? (
                <span className="flex items-center gap-2 mx-auto">
                  <Loader2 size={20} className="animate-spin" />
                  Recording Stock...
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    <span>Save & Scan Next Rack</span>
                  </div>
                  <Badge variant="subtle" className="bg-black/20 text-white font-bold text-xs px-2.5">
                    {totalItemPieces} Pcs
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
