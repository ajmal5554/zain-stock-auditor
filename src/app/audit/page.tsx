"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

import {
  DEFAULT_CATEGORY_SIZE_SCALES,
  DEFAULT_CATEGORY_ATTRIBUTES,
} from "../../../scripts/seed-store-data";

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

  // Dynamic store settings from database / settings page
  const [storeSizeScales, setStoreSizeScales] = useState<
    Record<string, { id: string; name: string; sizes: string[]; default?: boolean }[]>
  >(DEFAULT_CATEGORY_SIZE_SCALES);
  const [storeAttributes, setStoreAttributes] = useState<
    Record<
      string,
      {
        subtypes?: string[];
        collars?: string[];
        sleeves?: string[];
        fits?: string[];
        fabrics?: string[];
        patterns?: string[];
        borders?: string[];
      }
    >
  >(DEFAULT_CATEGORY_ATTRIBUTES);
  const [activeScaleId, setActiveScaleId] = useState<string>("");

  // Dynamic garment attribute selections
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [selectedCollar, setSelectedCollar] = useState<string | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<string | null>(null);

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

  // Load categories and store settings on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => toast("Failed to load categories", "error"));

    // Load cached settings
    try {
      const cachedScales = localStorage.getItem("zain_category_size_scales");
      if (cachedScales) setStoreSizeScales(JSON.parse(cachedScales));
      const cachedAttrs = localStorage.getItem("zain_category_attributes");
      if (cachedAttrs) setStoreAttributes(JSON.parse(cachedAttrs));
    } catch {}

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.sizeScales && Object.keys(data.sizeScales).length > 0) {
          setStoreSizeScales(data.sizeScales);
          localStorage.setItem("zain_category_size_scales", JSON.stringify(data.sizeScales));
        }
        if (data.attributes && Object.keys(data.attributes).length > 0) {
          setStoreAttributes(data.attributes);
          localStorage.setItem("zain_category_attributes", JSON.stringify(data.attributes));
        }
      })
      .catch(() => {});

    const cleanup = setupOfflineSync();
    return cleanup;
  }, []);

  // Fetch category-specific brands when category changes
  useEffect(() => {
    if (!selectedCategoryName) return;

    const catParam = encodeURIComponent(selectedCategoryName);
    fetch(`/api/brands?category=${catParam}`)
      .then((r) => r.json())
      .then((data: ({ name: string } | string)[]) => {
        const brandNames = data.map((b) => (typeof b === "string" ? b : b.name));

        let custom: string[] = [];
        try {
          custom = JSON.parse(
            localStorage.getItem(`zain_cat_brands_${selectedCategoryName}`) || "[]"
          );
        } catch {}

        const merged = Array.from(new Set([...brandNames, ...custom])).sort((a, b) =>
          a.localeCompare(b)
        );
        setBrands(merged);
        setFilteredBrands(merged);
      })
      .catch(() => {});
  }, [selectedCategoryName]);

  // Save new brand into persistent suggestions and link to category
  const rememberBrand = useCallback(
    (brandName: string) => {
      const trimmed = brandName.trim();
      if (
        !trimmed ||
        trimmed.toLowerCase() === "unbranded" ||
        trimmed.toLowerCase() === "local"
      )
        return;

      // 1. Post to API to persist in database
      fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          categories: selectedCategoryName ? [selectedCategoryName] : ["*"],
        }),
      }).catch(() => {});

      // 2. Cache locally
      try {
        const key = selectedCategoryName
          ? `zain_cat_brands_${selectedCategoryName}`
          : "zain_custom_brands";
        const custom: string[] = JSON.parse(localStorage.getItem(key) || "[]");
        if (!custom.includes(trimmed)) {
          custom.push(trimmed);
          localStorage.setItem(key, JSON.stringify(custom));
        }
        setBrands((prev) =>
          Array.from(new Set([...prev, trimmed])).sort((a, b) => a.localeCompare(b))
        );
      } catch {}
    },
    [selectedCategoryName]
  );

type CategoryScale = { id: string; name: string; sizes: string[]; default?: boolean };

  // Available size scales for currently selected category
  const currentCategoryScales: CategoryScale[] = useMemo(() => {
    if (!selectedCategoryName) return [];
    if (storeSizeScales[selectedCategoryName] && storeSizeScales[selectedCategoryName].length > 0) {
      return storeSizeScales[selectedCategoryName];
    }
    if (isMunduCategory(selectedCategoryName)) {
      return DEFAULT_CATEGORY_SIZE_SCALES["Mundus & Dhotis"] || [];
    }
    if (isInnerwearCategory(selectedCategoryName)) {
      return DEFAULT_CATEGORY_SIZE_SCALES["Innerwears & Undergarments"] || [];
    }
    return [
      {
        id: "default_alpha",
        name: "Standard (S - 3XL)",
        sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
        default: true,
      },
    ];
  }, [storeSizeScales, selectedCategoryName]);

  // Apply default size scale when category changes
  useEffect(() => {
    if (currentCategoryScales.length > 0) {
      const defaultScale =
        currentCategoryScales.find((s: CategoryScale) => s.default) || currentCategoryScales[0];
      setActiveScaleId(defaultScale.id);
      setSizes(defaultScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
    }
  }, [selectedCategoryName, currentCategoryScales]);

  // Handle switching size scale (e.g. Adults 75-105 vs Kids 50-75)
  const handleScaleChange = (scale: CategoryScale) => {
    setActiveScaleId(scale.id);
    setSizes((prev) => {
      const existingWithCount = prev.filter((p) => p.quantity > 0);
      const newSizes = scale.sizes.map((s) => {
        const found = existingWithCount.find((e) => e.size === s);
        return found || { size: s, quantity: 0 };
      });
      for (const e of existingWithCount) {
        if (!newSizes.find((ns) => ns.size === e.size)) {
          newSizes.push(e);
        }
      }
      return newSizes;
    });
  };

  // Attributes for currently selected category
  const currentCategoryAttrs = useMemo(() => {
    if (!selectedCategoryName) return {};
    if (storeAttributes[selectedCategoryName]) {
      return storeAttributes[selectedCategoryName];
    }
    if (isMunduCategory(selectedCategoryName)) {
      return DEFAULT_CATEGORY_ATTRIBUTES["Mundus & Dhotis"] || {};
    }
    if (isInnerwearCategory(selectedCategoryName)) {
      return DEFAULT_CATEGORY_ATTRIBUTES["Innerwears & Undergarments"] || {};
    }
    return {};
  }, [storeAttributes, selectedCategoryName]);

  // Update category and sleeve visibility
  useEffect(() => {
    if (watchedCategoryId) {
      const cat = categories.find((c) => c.id === watchedCategoryId);
      if (cat) {
        setSelectedCategoryName(cat.name);
        setShowSleeve(shouldShowSleeve(cat.name));
        setSelectedSubtype(null);
        setSelectedCollar(null);
        setSelectedBorder(null);
        if (!shouldShowSleeve(cat.name)) {
          setValue("sleeve", null);
        }
      }
    }
  }, [watchedCategoryId, categories, setValue]);

  // Brand autocomplete & suggestions
  useEffect(() => {
    if (!watchedBrand || watchedBrand.trim() === "") {
      setFilteredBrands(brands);
    } else {
      const q = watchedBrand.toLowerCase().trim();
      const filtered = brands.filter((b) => b.toLowerCase().includes(q));
      setFilteredBrands(filtered);
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
      const customMeta: Record<string, string> = {};
      if (selectedSubtype) customMeta.subtype = selectedSubtype;
      if (selectedCollar) customMeta.collar = selectedCollar;
      if (selectedBorder) customMeta.border = selectedBorder;

      const payload = {
        ...data,
        customMeta: Object.keys(customMeta).length > 0 ? customMeta : undefined,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      setSaveCount((c) => c + 1);
      toast(
        `✓ Count saved! (${saveCount + 1} rack styles recorded)`,
        "success"
      );

      // Remember brand for instant suggestion under this category
      if (data.brand) {
        rememberBrand(data.brand);
      }

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

      if (currentCategoryScales.length > 0) {
        const activeScale =
          currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
          currentCategoryScales[0];
        setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
      }

      setTimeout(() => mrpInputRef.current?.focus(), 150);
    } catch {
      // Offline fallback: queue to localStorage
      const customMeta: Record<string, string> = {};
      if (selectedSubtype) customMeta.subtype = selectedSubtype;
      if (selectedCollar) customMeta.collar = selectedCollar;
      if (selectedBorder) customMeta.border = selectedBorder;

      const payload = {
        ...data,
        customMeta: Object.keys(customMeta).length > 0 ? customMeta : undefined,
      };

      enqueueOffline("/api/products", "POST", payload);
      toast("Saved offline — will sync once reconnected", "info");

      if (data.brand) {
        rememberBrand(data.brand);
      }

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

      if (currentCategoryScales.length > 0) {
        const activeScale =
          currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
          currentCategoryScales[0];
        setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-5 pb-28">
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

        <div className="flex items-center gap-2">
          {totalItemPieces > 0 && (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              variant="success"
              size="sm"
              className="h-8 gap-1.5 text-xs font-bold shadow-xs animate-fade-in"
            >
              {submitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Save ({totalItemPieces})</span>
            </Button>
          )}

          {saveCount > 0 && (
            <Badge variant="subtle" className="text-xs font-semibold px-2.5 py-1">
              {saveCount} Saved
            </Badge>
          )}
        </div>
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

        {/* ── Brand / Company Section with Instant Suggestions ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              2. Brand / Company Name
            </CardTitle>
            <CardDescription>
              Smart suggestions, custom brand memory & 1-tap unbranded chips
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
                      placeholder="Type brand or select from suggestions below..."
                      className="pl-10 text-sm"
                      autoComplete="off"
                      onFocus={() => {
                        setShowBrandDropdown(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowBrandDropdown(false), 250);
                      }}
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

              {/* Suggestions Dropdown (Opens on focus & updates dynamically) */}
              {showBrandDropdown && (
                <div className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto animate-slide-up divide-y divide-slate-100">
                  {watchedBrand &&
                    !brands.some(
                      (b) => b.toLowerCase() === watchedBrand.toLowerCase().trim()
                    ) && (
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-colors flex items-center justify-between"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          rememberBrand(watchedBrand);
                          setShowBrandDropdown(false);
                        }}
                      >
                        <span>+ Use &quot;{watchedBrand}&quot; as brand</span>
                        <Plus size={14} />
                      </button>
                    )}

                  {filteredBrands.slice(0, 15).map((b) => (
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

            {/* Quick 1-tap brand chips (Horizontal Scrollable) */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setValue("brand", "Unbranded");
                  setShowBrandDropdown(false);
                }}
                className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  watchedBrand === "Unbranded"
                    ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Zap size={11} className="text-amber-500 fill-amber-500" />
                Unbranded / No Brand
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue("brand", "Local");
                  setShowBrandDropdown(false);
                }}
                className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  watchedBrand === "Local"
                    ? "bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                Local Store Make
              </button>

              {brands
                .filter((b) => b !== "Unbranded" && b !== "Local")
                .slice(0, 8)
                .map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setValue("brand", b);
                      setShowBrandDropdown(false);
                    }}
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all ${
                      watchedBrand === b
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    }`}
                  >
                    {b}
                  </button>
                ))}
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
            {/* Subtypes / Garment Cut (e.g. Briefs, Trunks, Vests, Drawers) */}
            {currentCategoryAttrs.subtypes && currentCategoryAttrs.subtypes.length > 0 && (
              <div className="animate-fade-in pt-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Subtype / Garment Cut
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentCategoryAttrs.subtypes.map((st: string) => {
                    const isSelected = selectedSubtype === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedSubtype(isSelected ? null : st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Collar / Neck Style (e.g. Polo / Collar, Round Neck, Hooded / Hoodie, V-Neck, Henley) */}
            {currentCategoryAttrs.collars && currentCategoryAttrs.collars.length > 0 && (
              <div className="animate-fade-in pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                  Collar / Neck Style
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentCategoryAttrs.collars.map((col: string) => {
                    const isSelected = selectedCollar === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedCollar(isSelected ? null : col)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pattern */}
            <div className="pt-2 border-t border-slate-100">
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
                    {(currentCategoryAttrs.patterns || PATTERNS).map((p: string) => (
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
                      {(currentCategoryAttrs.sleeves || SLEEVES).map((s: string) => (
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
                    {(currentCategoryAttrs.fabrics || FABRICS).map((f: string) => (
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
                      {(currentCategoryAttrs.fits || FITS).map((fit: string) => (
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
                <div className="flex flex-wrap gap-1.5">
                  {(currentCategoryAttrs.borders || MUNDU_BORDERS).map((border: string) => {
                    const isSelected = selectedBorder === border;
                    return (
                      <button
                        key={border}
                        type="button"
                        onClick={() => setSelectedBorder(isSelected ? null : border)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {border}
                      </button>
                    );
                  })}
                </div>
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

        {/* ── MRP Price Card (Cursor & Scroll Safe) ── */}
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

        {/* ── Size & Physical Count Matrix + Integrated Save Action ── */}
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
            {/* Dynamic category size scale tabs */}
            {currentCategoryScales.length > 1 && (
              <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 mb-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                  {currentCategoryScales.map((sc: CategoryScale) => {
                    const isSelected = activeScaleId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleScaleChange(sc)}
                        className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                          isSelected
                            ? "bg-white text-indigo-700 shadow-2xs font-extrabold border border-indigo-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {sc.name}
                      </button>
                    );
                  })}
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
                const activeScale = currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId);
                const isPreset = activeScale
                  ? activeScale.sizes.includes(entry.size)
                  : true;

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

                    {/* Stepper buttons */}
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

            {/* Direct In-Matrix Save Summary & Action (Thumb-friendly, No overlapping floating bar) */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${totalItemPieces > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                  <span>{totalItemPieces} Pcs Counted</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  ₹{((watchedMrp || 0) * totalItemPieces).toLocaleString("en-IN")} total value
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || totalItemPieces === 0}
                variant="success"
                size="default"
                className="h-11 px-5 rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                <span>Save Rack</span>
              </Button>
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

        {/* ── Full-Width Primary Form Submission Action ── */}
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
      </form>
    </div>
  );
}
