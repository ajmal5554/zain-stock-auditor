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
  Zap,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { auditEntrySchema, type AuditEntryInput } from "@/lib/schemas";
import {
  PATTERNS,
  SLEEVES,
  FABRICS,
  FITS,
  MUNDU_BORDERS,
  POPULAR_COLORS,
  INNERWEAR_SIZE_SCALES,
  getSizePresets,
  shouldShowSleeve,
  isMunduCategory,
  isInnerwearCategory,
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

  // Innerwear size scale state: numeric (75-105 cm), waist (30-42 in), alpha (S-3XL)
  const [innerwearScale, setInnerwearScale] = useState<"numeric" | "waist" | "alpha">("numeric");

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
      fit: null,
      color: null,
      mrp: 0,
      costPrice: null,
      notes: null,
      variants: [],
    },
  });

  const watchedCategoryId = watch("categoryId");
  const watchedBrand = watch("brand");
  const watchedMrp = watch("mrp");

  const isMundu = isMunduCategory(selectedCategoryName);
  const isInnerwear = isInnerwearCategory(selectedCategoryName);

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

  // Set sizes based on category and innerwear scale
  const applyCategorySizes = useCallback(
    (catName: string, scale: "numeric" | "waist" | "alpha" = innerwearScale) => {
      if (isMunduCategory(catName)) {
        setSizes([
          { size: "Single", quantity: 0 },
          { size: "Double", quantity: 0 },
        ]);
      } else if (isInnerwearCategory(catName)) {
        const scaleSizes = INNERWEAR_SIZE_SCALES[scale].sizes;
        setSizes(scaleSizes.map((s) => ({ size: s, quantity: 0 })));
      } else {
        const presets = getSizePresets(catName);
        setSizes(presets.map((s) => ({ size: s, quantity: 0 })));
      }
    },
    [innerwearScale]
  );

  // Update sizes when category changes
  useEffect(() => {
    if (watchedCategoryId) {
      const cat = categories.find((c) => c.id === watchedCategoryId);
      if (cat) {
        setSelectedCategoryName(cat.name);
        setShowSleeve(shouldShowSleeve(cat.name));
        applyCategorySizes(cat.name, innerwearScale);
        if (!shouldShowSleeve(cat.name)) {
          setValue("sleeve", null);
        }
      }
    }
  }, [watchedCategoryId, categories, setValue, applyCategorySizes, innerwearScale]);

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

  const handleInnerwearScaleChange = (scale: "numeric" | "waist" | "alpha") => {
    setInnerwearScale(scale);
    const scaleSizes = INNERWEAR_SIZE_SCALES[scale].sizes;
    setSizes((prev) => {
      const existingWithCount = prev.filter((p) => p.quantity > 0);
      const newSizes = scaleSizes.map((s) => {
        const found = existingWithCount.find((e) => e.size === s);
        return found || { size: s, quantity: 0 };
      });
      // Preserve any custom or non-standard sizes that already had counts
      for (const e of existingWithCount) {
        if (!newSizes.find((ns) => ns.size === e.size)) {
          newSizes.push(e);
        }
      }
      return newSizes;
    });
  };

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
        fit: null,
        color: null,
        mrp: 0,
        costPrice: null,
        notes: null,
        variants: [],
      });

      const cat = categories.find((c) => c.id === currentCategoryId);
      if (cat) {
        applyCategorySizes(cat.name, innerwearScale);
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
        fit: null,
        color: null,
        mrp: 0,
        costPrice: null,
        notes: null,
        variants: [],
      });
      const cat = categories.find((c) => c.id === currentCategoryId);
      if (cat) {
        applyCategorySizes(cat.name, innerwearScale);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-44">
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
              <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">
                Live
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Aisle Physical Audit Terminal
            </p>
          </div>
        </div>

        {saveCount > 0 && (
          <Badge variant="subtle" className="text-xs font-semibold px-2.5 py-1">
            {saveCount} Saved
          </Badge>
        )}
      </header>

      {/* ── Audit Entry Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ── Category Section ── */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                1. Garment Category
              </CardTitle>
              <CardDescription>
                Tap to select aisle section
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
                  <DialogTitle>Add Custom Garment Category</DialogTitle>
                  <DialogDescription>
                    Create a new section category for your store
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Input
                    placeholder="e.g. Kurtas, Jubbas, Suits..."
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

        {/* ── Brand / Company Section ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              2. Brand / Company
            </CardTitle>
            <CardDescription>
              Select brand or tap Unbranded for local / generic stock
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
                      placeholder="e.g. Raymond, Otto, VIP (or leave blank for Unbranded)"
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
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => setValue("brand", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      >
                        <X size={15} />
                      </button>
                    )}
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

            {/* Quick 1-tap buttons for items without a company/brand */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setValue("brand", "Unbranded");
                  setShowBrandDropdown(false);
                }}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all border ${
                  watchedBrand === "Unbranded"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Zap size={12} className="text-amber-500 fill-amber-500" />
                <span>No Brand / Unbranded</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue("brand", "Local");
                  setShowBrandDropdown(false);
                }}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all border ${
                  watchedBrand === "Local"
                    ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <span>Local Store Make</span>
              </button>
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

            {/* Sleeve — auto-hidden for pants, mundus, accessories */}
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

            {/* Fabric Material */}
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

            {/* Fit Type — for shirts and trousers */}
            {!isMundu && (
              <div className="pt-2 border-t border-slate-100 animate-fade-in">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Fit Type
                </span>
                <Controller
                  name="fit"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || null)}
                      variant="outline"
                    >
                      {FITS.map((fit) => (
                        <ToggleGroupItem key={fit} value={fit}>
                          {fit}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </div>
            )}

            {/* Mundu Border / Kasavu — for Mundu section */}
            {isMundu && (
              <div className="pt-2 border-t border-slate-100 animate-fade-in">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Mundu Border / Kasavu
                </span>
                <Controller
                  name="fit"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || null)}
                      variant="outline"
                    >
                      {MUNDU_BORDERS.map((border) => (
                        <ToggleGroupItem key={border} value={border}>
                          {border}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}
                />
              </div>
            )}

            {/* Quick Color Picker */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                Color / Shade (Optional)
              </span>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COLORS.map((col) => {
                      const isSelected = field.value === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => field.onChange(isSelected ? null : col)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {col}
                        </button>
                      );
                    })}
                  </div>
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      className="pl-10 text-center text-3xl font-extrabold h-16 tracking-tight bg-white border-indigo-200 text-slate-900 shadow-xs focus-visible:ring-indigo-500/20"
                      value={field.value ? String(field.value) : ""}
                      onFocus={(e) => {
                        if (e.target.value === "0") {
                          field.onChange(0);
                          e.target.select();
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        // Strip any non-digits so mouse wheel/cursor movement can NEVER alter value
                        const clean = e.target.value.replace(/[^0-9]/g, "");
                        field.onChange(clean ? parseInt(clean, 10) : 0);
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
                ) : isMundu ? (
                  "Mundu single / double counts"
                ) : isInnerwear ? (
                  "Select brand size system and add counts"
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
            {/* Innerwear brand size system scale tabs */}
            {isInnerwear && (
              <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 space-y-1 mb-2">
                <div className="flex items-center gap-1">
                  {(["numeric", "waist", "alpha"] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => handleInnerwearScaleChange(sc)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                        innerwearScale === sc
                          ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {INNERWEAR_SIZE_SCALES[sc].label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 text-center px-2">
                  {INNERWEAR_SIZE_SCALES[innerwearScale].description}
                </div>
              </div>
            )}

            {/* Custom size input */}
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

            {/* Size Steppers Matrix */}
            <div className="space-y-2">
              {sizes.map((entry, index) => {
                const isPreset =
                  isMundu ||
                  (isInnerwear
                    ? INNERWEAR_SIZE_SCALES[innerwearScale].sizes.includes(entry.size)
                    : getSizePresets(selectedCategoryName).includes(entry.size));

                return (
                  <div
                    key={entry.size}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      entry.quantity > 0
                        ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-center text-sm font-extrabold text-slate-800 tracking-tight">
                        {entry.size}
                      </span>
                      {!isPreset && (
                        <button
                          type="button"
                          onClick={() => removeSize(index)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* High-throughput mobile stepper */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        disabled={entry.quantity <= 0}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Minus size={16} />
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={entry.quantity}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "");
                          setQuantity(index, clean ? parseInt(clean, 10) : 0);
                        }}
                        className={`w-14 h-10 text-center font-extrabold text-lg rounded-xl border transition-all outline-none ${
                          entry.quantity > 0
                            ? "bg-white text-emerald-800 border-emerald-400 font-black shadow-2xs"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.variants && (
              <p className="text-rose-600 text-xs mt-2 font-medium">
                {errors.variants.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Notes / Rack Location ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              6. Audit Notes / Rack Location (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              {...register("notes")}
              placeholder="e.g. Rack A3, Double pocket, Chinese collar, Box 4..."
              className="text-xs"
            />
          </CardContent>
        </Card>

        {/* ── Primary In-Flow Action Button (Always at end of form) ── */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={submitting || totalItemPieces === 0}
            variant="success"
            size="lg"
            className="w-full h-14 rounded-2xl text-base font-bold shadow-md shadow-emerald-600/20 flex items-center justify-between px-6"
          >
            {submitting ? (
              <span className="flex items-center gap-2 mx-auto">
                <Loader2 size={20} className="animate-spin" />
                Recording Stock...
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} />
                  <span>Save & Scan Next Rack</span>
                </div>
                <Badge
                  variant="subtle"
                  className="bg-black/20 text-white font-bold text-xs px-2.5 py-0.5"
                >
                  {totalItemPieces} Pcs
                </Badge>
              </>
            )}
          </Button>
          {totalItemPieces === 0 && (
            <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
              Add count to at least one size above to save this rack
            </p>
          )}
        </div>

        {/* ── Sticky Mobile Action Bar (ONLY shown when pieces > 0) ── */}
        {totalItemPieces > 0 && (
          <div className="fixed bottom-[64px] left-0 right-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] py-2.5 px-4 animate-slide-up">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{totalItemPieces} Pcs Counted</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  ₹{((watchedMrp || 0) * totalItemPieces).toLocaleString("en-IN")} total value
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                variant="success"
                size="default"
                className="h-11 px-5 rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                <span>Save Rack</span>
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
