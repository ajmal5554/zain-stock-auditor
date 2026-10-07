"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  X,
  Search,
  Zap,
  Clock,
  Check,
  Sparkles,
  ArrowRight,
  ChevronDown,
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
  isShirtCategory,
  DEFAULT_POCKETS,
  getCategoryMrpPresets,
} from "@/lib/constants";
import { resolveCategoryAttributes } from "@/lib/store-defaults";
import { enqueueOffline, setupOfflineSync } from "@/lib/offline-queue";

import { Button } from "@/components/ui/button";
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

interface RecentAuditItem {
  id: string;
  category: string;
  brand: string;
  pieces: number;
  mrp: number;
  fit?: string | null;
  color?: string | null;
  time: string;
  variants?: { size: string; quantity: number }[];
}

export default function AuditPage() {
  const [recentAudits, setRecentAudits] = useState<RecentAuditItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showMrpDropdown, setShowMrpDropdown] = useState(false);
  const [storeProducts, setStoreProducts] = useState<
    {
      id: string;
      categoryId: string;
      brand: string;
      mrp: number;
      pattern?: string | null;
      fabric?: string | null;
      sleeve?: string | null;
      notes?: string | null;
      customMeta?: Record<string, any> | null;
      category?: { id: string; name: string };
      variants?: { id?: string; size: string; quantity: number }[];
    }[]
  >([]);
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
  >({});
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
        pockets?: string[];
        customAttributes?: Record<string, string[]>;
      }
    >
  >({});
  const [activeScaleId, setActiveScaleId] = useState<string>("");

  // Dynamic garment attribute selections
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [selectedCollar, setSelectedCollar] = useState<string | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<string | null>(null);
  const [selectedPocket, setSelectedPocket] = useState<string | null>(null);
  const [selectedCustomMeta, setSelectedCustomMeta] = useState<Record<string, string>>({});
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [storeColors, setStoreColors] = useState<string[]>([]);

  // Add Attribute Modal State
  const [isAddAttrDialogOpen, setIsAddAttrDialogOpen] = useState(false);
  const [modalAttrType, setModalAttrType] = useState<string>("pockets");
  const [modalCustomTypeName, setModalCustomTypeName] = useState("");
  const [modalAttrVal, setModalAttrVal] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // Form persistence & workflow
  const [hasDraft, setHasDraft] = useState(false);
  const [keepDetailsForNext, setKeepDetailsForNext] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zain_keep_details_for_next");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });
  const [lastSavedStyle, setLastSavedStyle] = useState<RecentAuditItem | null>(null);

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

    // Load cached settings & colors
    try {
      const cachedScales = localStorage.getItem("zain_category_size_scales");
      if (cachedScales) setStoreSizeScales(JSON.parse(cachedScales));
      const cachedAttrs = localStorage.getItem("zain_category_attributes");
      if (cachedAttrs) setStoreAttributes(JSON.parse(cachedAttrs));
      const cachedColors = localStorage.getItem("zain_store_colors");
      if (cachedColors) setStoreColors(JSON.parse(cachedColors));
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
        if (Array.isArray(data.colors) && data.colors.length > 0) {
          setStoreColors((prev) => {
            const merged = Array.from(new Set([...prev, ...data.colors]));
            try {
              localStorage.setItem("zain_store_colors", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});

    const cleanup = setupOfflineSync();
    return cleanup;
  }, []);

  // Fetch category-specific brands when category changes, or all brands initially
  useEffect(() => {
    const url = selectedCategoryName
      ? `/api/brands?category=${encodeURIComponent(selectedCategoryName)}`
      : "/api/brands";

    fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    })
      .then((r) => r.json())
      .then((data: ({ name: string; inCategory?: boolean } | string)[]) => {
        if (!Array.isArray(data)) return;
        const brandNames = data.map((b) => (typeof b === "string" ? b : b.name));
        // Keep order returned by API (category-matched first, then all other store brands)
        const seen = new Set<string>();
        const orderedBrands: string[] = [];
        for (const name of brandNames) {
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            orderedBrands.push(name);
          }
        }
        setBrands(orderedBrands);
        setFilteredBrands(orderedBrands);
      })
      .catch(() => {});
  }, [selectedCategoryName]);

  // Fetch store products to gather real-time MRP suggestions
  useEffect(() => {
    fetch("/api/products", {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStoreProducts(data);
        }
      })
      .catch(() => {});
  }, [saveCount]);

  // Analyze current stock MRPs and rank by MOST USED (highest frequency & piece count in current stock)
  const mrpSuggestions = useMemo(() => {
    // 1. Group current stock products by MRP for the selected category
    const catStockMap = new Map<number, { mrp: number; items: number; pieces: number }>();
    const allStockMap = new Map<number, { mrp: number; items: number; pieces: number }>();

    for (const p of storeProducts) {
      if (!p.mrp || p.mrp <= 0) continue;
      const price = p.mrp;
      const pieces = (p.variants || []).reduce((sum, v) => sum + (v.quantity || 0), 0);

      const catObj = categories.find((c) => c.id === p.categoryId);
      const isSelectedCat = Boolean(
        selectedCategoryName &&
        ((p.category?.name && p.category.name.toLowerCase() === selectedCategoryName.toLowerCase()) ||
         (catObj?.name && catObj.name.toLowerCase() === selectedCategoryName.toLowerCase()))
      );

      if (isSelectedCat) {
        const existing = catStockMap.get(price) || { mrp: price, items: 0, pieces: 0 };
        existing.items += 1;
        existing.pieces += pieces;
        catStockMap.set(price, existing);
      }

      const existingAll = allStockMap.get(price) || { mrp: price, items: 0, pieces: 0 };
      existingAll.items += 1;
      existingAll.pieces += pieces;
      allStockMap.set(price, existingAll);
    }

    // Include recent audits from current session so live newly added audits update the stats instantly!
    for (const audit of recentAudits) {
      if (!audit.mrp || audit.mrp <= 0) continue;
      const price = audit.mrp;
      const isSelectedCat = Boolean(
        selectedCategoryName &&
        audit.category.toLowerCase() === selectedCategoryName.toLowerCase()
      );
      if (isSelectedCat) {
        const existing = catStockMap.get(price) || { mrp: price, items: 0, pieces: 0 };
        existing.items += 1;
        existing.pieces += audit.pieces || 0;
        catStockMap.set(price, existing);
      }
      const existingAll = allStockMap.get(price) || { mrp: price, items: 0, pieces: 0 };
      existingAll.items += 1;
      existingAll.pieces += audit.pieces || 0;
      allStockMap.set(price, existingAll);
    }

    // Sort category stock MRPs by MOST USED (highest product count first, then highest pieces count)
    const catStockList = Array.from(catStockMap.values()).sort((a, b) => {
      if (b.items !== a.items) return b.items - a.items;
      return b.pieces - a.pieces;
    });

    // If category has stock items, these are our primary suggestions!
    if (catStockList.length > 0) {
      const maxItems = catStockList[0].items;

      return catStockList.map((item, index) => ({
        mrp: item.mrp,
        items: item.items,
        pieces: item.pieces,
        inCategory: true,
        isStorePrice: true,
        rank: index + 1,
        isTopUsed: item.items === maxItems,
      }));
    }

    // If category has no stock items yet, use most used MRPs across all current stock in the shop!
    const allStockList = Array.from(allStockMap.values()).sort((a, b) => {
      if (b.items !== a.items) return b.items - a.items;
      return b.pieces - a.pieces;
    });

    if (allStockList.length > 0) {
      const maxItems = allStockList[0].items;
      return allStockList.map((item, index) => ({
        mrp: item.mrp,
        items: item.items,
        pieces: item.pieces,
        inCategory: false,
        isStorePrice: true,
        rank: index + 1,
        isTopUsed: item.items === maxItems,
      }));
    }

    // Fallback only if store is completely empty (0 stock in database)
    const benchmarks = getCategoryMrpPresets(selectedCategoryName);
    return benchmarks.map((price) => ({
      mrp: price,
      items: 0,
      pieces: 0,
      inCategory: false,
      isStorePrice: false,
      rank: 999,
      isTopUsed: false,
    }));
  }, [storeProducts, selectedCategoryName, categories, recentAudits]);

  // Filtered MRP suggestions for typing / live search (preserves most-used order!)
  const filteredMrpSuggestions = useMemo(() => {
    if (!watchedMrp || watchedMrp === 0) {
      return mrpSuggestions;
    }
    const searchStr = String(watchedMrp);
    return mrpSuggestions.filter((item) => String(item.mrp).includes(searchStr));
  }, [watchedMrp, mrpSuggestions]);

  // Quick Pick chips: Show the most used stock MRPs in descending order of usage!
  const quickMrpChips = useMemo(() => {
    return mrpSuggestions.slice(0, 8);
  }, [mrpSuggestions]);

  const handleSelectMrp = useCallback(
    (price: number) => {
      setValue("mrp", price, { shouldValidate: true, shouldDirty: true });
      setShowMrpDropdown(false);
    },
    [setValue]
  );

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

      fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          categories: selectedCategoryName ? [selectedCategoryName] : ["*"],
        }),
      }).catch(() => {});

      setBrands((prev) => Array.from(new Set([trimmed, ...prev])));
      setFilteredBrands((prev) => Array.from(new Set([trimmed, ...prev])));
      setValue("brand", trimmed);
    },
    [selectedCategoryName, setValue]
  );

type CategoryScale = { id: string; name: string; sizes: string[]; default?: boolean };

  // Available size scales for currently selected category
  const currentCategoryScales: CategoryScale[] = useMemo(() => {
    if (!selectedCategoryName) return [];
    if (storeSizeScales[selectedCategoryName] && storeSizeScales[selectedCategoryName].length > 0) {
      return storeSizeScales[selectedCategoryName];
    }
    // Case-insensitive lookup in user settings
    const targetNorm = selectedCategoryName.toLowerCase().replace(/s\b|&.*$/g, "").trim();
    for (const [key, scales] of Object.entries(storeSizeScales)) {
      const keyNorm = key.toLowerCase().replace(/s\b|&.*$/g, "").trim();
      if ((keyNorm === targetNorm || key.toLowerCase() === selectedCategoryName.toLowerCase()) && scales.length > 0) {
        return scales;
      }
    }
    // Minimal fallback ONLY if user has not configured any scale
    if (isMunduCategory(selectedCategoryName)) {
      return [{ id: "scale_mundu_default", name: "Type", sizes: ["Single", "Double"], default: true }];
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

  // Handle switching size scale
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

  // Dynamically harvest attributes from storeProducts (e.g. Satin, Corduroy, Double Pocket, Slim Fit)
  const harvestedCategoryAttrs = useMemo(() => {
    const fabrics = new Set<string>();
    const collars = new Set<string>();
    const pockets = new Set<string>();
    const fits = new Set<string>();
    const patterns = new Set<string>();
    const subtypes = new Set<string>();
    const borders = new Set<string>();
    const customAttrs: Record<string, Set<string>> = {};

    const targetCat = selectedCategoryName?.toLowerCase().trim();

    for (const p of storeProducts) {
      const pCat = p.category?.name?.toLowerCase().trim() || "";
      const matchesCat =
        !targetCat ||
        pCat === targetCat ||
        pCat.includes(targetCat.replace(/s\b|&.*$/g, "")) ||
        targetCat.includes(pCat.replace(/s\b|&.*$/g, ""));

      // Fabrics: all store fabrics or category fabrics
      if (p.fabric && p.fabric.trim()) fabrics.add(p.fabric.trim());
      if (p.pattern && p.pattern.trim() && matchesCat) patterns.add(p.pattern.trim());

      if (p.customMeta && typeof p.customMeta === "object") {
        const m = p.customMeta as Record<string, unknown>;
        if (typeof m.fabric === "string" && m.fabric.trim()) fabrics.add(m.fabric.trim());
        if (typeof m.collar === "string" && m.collar.trim() && matchesCat) collars.add(m.collar.trim());
        if (typeof m.pocket === "string" && m.pocket.trim() && matchesCat) pockets.add(m.pocket.trim());
        if (typeof m.fit === "string" && m.fit.trim()) fits.add(m.fit.trim());
        if (typeof m.subtype === "string" && m.subtype.trim() && matchesCat) subtypes.add(m.subtype.trim());
        if (typeof m.border === "string" && m.border.trim() && matchesCat) borders.add(m.border.trim());

        // Any custom attribute groups (e.g. pocket, wash, rise)
        for (const [k, v] of Object.entries(m)) {
          if (
            k !== "fabric" &&
            k !== "collar" &&
            k !== "pocket" &&
            k !== "fit" &&
            k !== "subtype" &&
            k !== "border" &&
            k !== "color" &&
            typeof v === "string" &&
            v.trim()
          ) {
            if (!customAttrs[k]) customAttrs[k] = new Set();
            customAttrs[k].add(v.trim());
          }
        }
      }

      // Check notes for fit (e.g. "Slim Fit • ...")
      if (p.notes) {
        const parts = p.notes.split("•").map((s) => s.trim());
        if (parts.length > 0 && parts[0].toLowerCase().includes("fit")) {
          fits.add(parts[0]);
        }
      }
    }

    return {
      fabrics: Array.from(fabrics),
      collars: Array.from(collars),
      pockets: Array.from(pockets),
      fits: Array.from(fits),
      patterns: Array.from(patterns),
      subtypes: Array.from(subtypes),
      borders: Array.from(borders),
      customAttributes: Object.fromEntries(
        Object.entries(customAttrs).map(([k, s]) => [k, Array.from(s)])
      ),
    };
  }, [storeProducts, selectedCategoryName]);

  // Attributes for currently selected category — merges store settings, fallbacks, AND harvested product attributes!
  const currentCategoryAttrs = useMemo(() => {
    const base = resolveCategoryAttributes(selectedCategoryName, storeAttributes);
    const customMerged: Record<string, string[]> = { ...(base.customAttributes || {}) };

    for (const [k, vals] of Object.entries(harvestedCategoryAttrs.customAttributes)) {
      customMerged[k] = Array.from(new Set([...(customMerged[k] || []), ...vals]));
    }

    return {
      ...base,
      subtypes: Array.from(new Set([...(base.subtypes || []), ...harvestedCategoryAttrs.subtypes])),
      collars: Array.from(new Set([...(base.collars || []), ...harvestedCategoryAttrs.collars])),
      pockets: Array.from(new Set([...(base.pockets || []), ...harvestedCategoryAttrs.pockets])),
      fits: Array.from(new Set([...(base.fits || []), ...harvestedCategoryAttrs.fits])),
      fabrics: Array.from(new Set([...(base.fabrics || []), ...harvestedCategoryAttrs.fabrics])),
      patterns: Array.from(new Set([...(base.patterns || []), ...harvestedCategoryAttrs.patterns])),
      borders: Array.from(new Set([...(base.borders || []), ...harvestedCategoryAttrs.borders])),
      customAttributes: customMerged,
    };
  }, [storeAttributes, selectedCategoryName, harvestedCategoryAttrs]);

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
        setSelectedPocket(null);
        setSelectedCustomMeta({});
        if (!shouldShowSleeve(cat.name)) {
          setValue("sleeve", null);
        }
      }
    }
  }, [watchedCategoryId, categories, setValue]);

  // Brands to display in dropdown:
  // Shows all store brands when opening dropdown, highlights exact matches,
  // or filters when actively typing a search query.
  const dropdownBrands = useMemo(() => {
    const q = (watchedBrand || "").trim().toLowerCase();
    if (!q) return brands;

    // Check if what's typed is an exact brand match (e.g. from draft or selection)
    const isExactMatch = brands.some((b) => b.toLowerCase() === q);
    if (isExactMatch) {
      // Show the selected brand first, followed by all other store brands
      const exact = brands.find((b) => b.toLowerCase() === q)!;
      const others = brands.filter((b) => b.toLowerCase() !== q);
      return [exact, ...others];
    }

    // Partial search: matching brands
    const matches = brands.filter((b) => b.toLowerCase().includes(q));
    return matches;
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

  // Helper to select an attribute in the form/state
  const selectAttributeValue = useCallback(
    (attrKey: string, val: string | null) => {
      const k = attrKey.toLowerCase();
      if (k === "patterns" || k === "pattern") setValue("pattern", val);
      else if (k === "fabrics" || k === "fabric") setValue("fabric", val);
      else if (k === "sleeves" || k === "sleeve") setValue("sleeve", val);
      else if (k === "fits" || k === "fit") setValue("fit", val);
      else if (k === "collars" || k === "collar") setSelectedCollar(val);
      else if (k === "subtypes" || k === "subtype") setSelectedSubtype(val);
      else if (k === "borders" || k === "border") setSelectedBorder(val);
      else if (k === "pockets" || k === "pocket") setSelectedPocket(val);
      else if (k === "color") setValue("color", val);
    },
    [setValue]
  );

  // Add an attribute value directly from Audit page and persist to database
  const handleAddAttributeValue = useCallback(
    async (
      attrKey: "subtypes" | "collars" | "sleeves" | "fits" | "fabrics" | "patterns" | "borders" | "pockets",
      val: string
    ) => {
      const trimmed = val.trim();
      if (!trimmed || !selectedCategoryName) return;

      const existingCatAttrs = currentCategoryAttrs;
      const existingList = existingCatAttrs[attrKey] || [];
      if (existingList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        toast(`"${trimmed}" is already an option`, "info");
        selectAttributeValue(attrKey, trimmed);
        return;
      }

      const updatedList = [...existingList, trimmed];
      const updatedCategoryAttrs = {
        ...existingCatAttrs,
        [attrKey]: updatedList,
      };

      const newStoreAttributes = {
        ...storeAttributes,
        [selectedCategoryName]: updatedCategoryAttrs,
      };

      setStoreAttributes(newStoreAttributes);
      try {
        localStorage.setItem("zain_category_attributes", JSON.stringify(newStoreAttributes));
      } catch {}

      selectAttributeValue(attrKey, trimmed);
      toast(`✓ Added "${trimmed}" to ${selectedCategoryName}`, "success");

      // Save to database
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: newStoreAttributes }),
      }).catch((e) => console.error("Failed to save attribute:", e));
    },
    [currentCategoryAttrs, selectedCategoryName, storeAttributes, selectAttributeValue]
  );

  // Remove an attribute option from the category
  const handleRemoveAttributeTag = useCallback(
    async (
      attrKey: "subtypes" | "collars" | "sleeves" | "fits" | "fabrics" | "patterns" | "borders" | "pockets",
      tagToRemove: string
    ) => {
      if (!selectedCategoryName) return;
      const existingCatAttrs = currentCategoryAttrs;
      const existingList = existingCatAttrs[attrKey] || [];
      const updatedList = existingList.filter((item) => item !== tagToRemove);

      const updatedCategoryAttrs = {
        ...existingCatAttrs,
        [attrKey]: updatedList,
      };

      const newStoreAttributes = {
        ...storeAttributes,
        [selectedCategoryName]: updatedCategoryAttrs,
      };

      setStoreAttributes(newStoreAttributes);
      try {
        localStorage.setItem("zain_category_attributes", JSON.stringify(newStoreAttributes));
      } catch {}

      toast(`Removed "${tagToRemove}"`, "info");

      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: newStoreAttributes }),
      }).catch(() => {});
    },
    [currentCategoryAttrs, selectedCategoryName, storeAttributes]
  );

  // Add custom color, auto-select, and persist to database & localStorage
  const handleAddCustomColor = useCallback(
    async (newColor: string) => {
      const trimmed = newColor.trim();
      if (!trimmed) return;
      setCustomColors((prev) => Array.from(new Set([...prev, trimmed])));
      setStoreColors((prev) => {
        const updated = Array.from(new Set([...prev, trimmed]));
        try {
          localStorage.setItem("zain_store_colors", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setValue("color", trimmed);
      toast(`✓ Color "${trimmed}" selected & saved`, "success");

      // Persist permanently to store settings
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: [trimmed] }),
      }).catch((e) => console.error("Failed to save color to settings:", e));
    },
    [setValue]
  );

  // Add option to custom attribute group
  const handleAddCustomAttributeOption = useCallback(
    async (groupName: string, val: string) => {
      const trimmed = val.trim();
      if (!trimmed || !selectedCategoryName) return;

      const existingCatAttrs = currentCategoryAttrs;
      const existingCustom = existingCatAttrs.customAttributes || {};
      const existingList = existingCustom[groupName] || [];
      if (existingList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        toast(`"${trimmed}" is already an option`, "info");
        setSelectedCustomMeta((prev) => ({ ...prev, [groupName]: trimmed }));
        return;
      }

      const updatedList = [...existingList, trimmed];
      const updatedCategoryAttrs = {
        ...existingCatAttrs,
        customAttributes: {
          ...existingCustom,
          [groupName]: updatedList,
        },
      };

      const newStoreAttributes = {
        ...storeAttributes,
        [selectedCategoryName]: updatedCategoryAttrs,
      };

      setStoreAttributes(newStoreAttributes);
      try {
        localStorage.setItem("zain_category_attributes", JSON.stringify(newStoreAttributes));
      } catch {}

      setSelectedCustomMeta((prev) => ({ ...prev, [groupName]: trimmed }));
      toast(`✓ Added "${trimmed}" to ${groupName}`, "success");

      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: newStoreAttributes }),
      }).catch(() => {});
    },
    [currentCategoryAttrs, selectedCategoryName, storeAttributes]
  );

  // Modal Add Attribute Handler
  const handleModalAddAttribute = async () => {
    if (!modalAttrVal.trim() || !selectedCategoryName) return;
    setModalSaving(true);
    try {
      if (modalAttrType === "new_custom") {
        const groupName = modalCustomTypeName.trim();
        if (!groupName) {
          toast("Please enter an attribute type name", "error");
          return;
        }
        await handleAddCustomAttributeOption(groupName, modalAttrVal);
        setModalCustomTypeName("");
        setModalAttrVal("");
        setIsAddAttrDialogOpen(false);
      } else if (modalAttrType.startsWith("custom:")) {
        const groupName = modalAttrType.replace("custom:", "");
        await handleAddCustomAttributeOption(groupName, modalAttrVal);
        setModalAttrVal("");
        setIsAddAttrDialogOpen(false);
      } else {
        await handleAddAttributeValue(modalAttrType as any, modalAttrVal);
        setModalAttrVal("");
        setIsAddAttrDialogOpen(false);
      }
    } finally {
      setModalSaving(false);
    }
  };

  // Current modal options based on selected attribute type
  const currentModalOptions = useMemo(() => {
    if (modalAttrType === "new_custom") return [];
    if (modalAttrType.startsWith("custom:")) {
      const g = modalAttrType.replace("custom:", "");
      return currentCategoryAttrs.customAttributes?.[g] || [];
    }
    return (currentCategoryAttrs as any)[modalAttrType] || [];
  }, [modalAttrType, currentCategoryAttrs]);

  const handleModalRemoveTag = async (tag: string) => {
    if (modalAttrType.startsWith("custom:")) {
      const g = modalAttrType.replace("custom:", "");
      const existing = currentCategoryAttrs.customAttributes?.[g] || [];
      const updatedList = existing.filter((t) => t !== tag);
      const updatedAttrs = {
        ...currentCategoryAttrs,
        customAttributes: {
          ...(currentCategoryAttrs.customAttributes || {}),
          [g]: updatedList,
        },
      };
      const newStore = { ...storeAttributes, [selectedCategoryName]: updatedAttrs };
      setStoreAttributes(newStore);
      try {
        localStorage.setItem("zain_category_attributes", JSON.stringify(newStore));
      } catch {}
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: newStore }),
      }).catch(() => {});
    } else if (modalAttrType !== "new_custom") {
      await handleRemoveAttributeTag(modalAttrType as any, tag);
    }
  };

  // Harvest all colors dynamically from storeProducts and recentAudits
  const harvestedProductColors = useMemo(() => {
    const set = new Set<string>();
    for (const p of storeProducts) {
      if (p.notes) {
        const parts = p.notes.split("•").map((s) => s.trim());
        if (parts.length > 1) {
          const col = parts[1].split("|")[0].trim();
          if (
            col &&
            col.length < 25 &&
            !col.toLowerCase().includes("sleeve") &&
            !col.toLowerCase().includes("fit")
          ) {
            set.add(col);
          }
        }
      }
      if (p.customMeta && typeof p.customMeta === "object" && p.customMeta.color) {
        const c = String(p.customMeta.color).trim();
        if (c && c.toLowerCase() !== "null" && c.toLowerCase() !== "undefined") {
          set.add(c);
        }
      }
    }
    for (const a of recentAudits) {
      if (a.color && a.color.trim()) {
        set.add(a.color.trim());
      }
    }
    return Array.from(set);
  }, [storeProducts, recentAudits]);

  // Combine popular colors with store colors, custom colors, and harvested product colors
  const allColorOptions = useMemo(() => {
    return Array.from(
      new Set([...POPULAR_COLORS, ...storeColors, ...customColors, ...harvestedProductColors])
    );
  }, [storeColors, customColors, harvestedProductColors]);

  // Clear current draft and form
  const handleClearForm = useCallback(() => {
    try {
      localStorage.removeItem("zain_audit_draft_v1");
    } catch {}
    setHasDraft(false);
    reset({
      categoryId: watchedCategoryId,
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
    });
    setSelectedSubtype(null);
    setSelectedCollar(null);
    setSelectedBorder(null);
    setSelectedPocket(null);
    setSelectedCustomMeta({});
    if (currentCategoryScales.length > 0) {
      const activeScale =
        currentCategoryScales.find((s) => s.id === activeScaleId) || currentCategoryScales[0];
      setSizes(activeScale.sizes.map((s) => ({ size: s, quantity: 0 })));
    }
    toast("Form reset", "info");
  }, [watchedCategoryId, currentCategoryScales, activeScaleId, reset]);

  // Auto-save form draft so navigating away never empties or wipes progress
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentValues = watch();
      const hasAnyValue =
        Boolean(currentValues.categoryId) ||
        Boolean(currentValues.brand) ||
        (currentValues.mrp && currentValues.mrp > 0) ||
        Boolean(currentValues.pattern) ||
        Boolean(currentValues.fabric) ||
        Boolean(currentValues.sleeve) ||
        Boolean(currentValues.fit) ||
        Boolean(currentValues.color) ||
        Boolean(selectedSubtype) ||
        Boolean(selectedCollar) ||
        Boolean(selectedBorder) ||
        Boolean(selectedPocket) ||
        Object.keys(selectedCustomMeta).length > 0 ||
        sizes.some((s) => s.quantity > 0);

      if (hasAnyValue) {
        setHasDraft(true);
        try {
          const draftPayload = {
            categoryId: currentValues.categoryId,
            brand: currentValues.brand,
            mrp: currentValues.mrp,
            pattern: currentValues.pattern,
            fabric: currentValues.fabric,
            sleeve: currentValues.sleeve,
            fit: currentValues.fit,
            color: currentValues.color,
            notes: currentValues.notes,
            selectedSubtype,
            selectedCollar,
            selectedBorder,
            selectedPocket,
            selectedCustomMeta,
            sizes,
            activeScaleId,
          };
          localStorage.setItem("zain_audit_draft_v1", JSON.stringify(draftPayload));
        } catch {}
      } else {
        setHasDraft(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    watchedCategoryId,
    watchedBrand,
    watchedMrp,
    watch,
    selectedSubtype,
    selectedCollar,
    selectedBorder,
    selectedPocket,
    selectedCustomMeta,
    sizes,
    activeScaleId,
  ]);

  // Restore draft if user was in the middle of auditing
  const restoredDraftRef = useRef(false);
  useEffect(() => {
    if (restoredDraftRef.current || categories.length === 0) return;
    try {
      const rawDraft = localStorage.getItem("zain_audit_draft_v1");
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.categoryId && categories.some((c) => c.id === draft.categoryId)) {
          setValue("categoryId", draft.categoryId);
        }
        if (draft.brand) setValue("brand", draft.brand);
        if (draft.mrp) setValue("mrp", draft.mrp);
        if (draft.pattern) setValue("pattern", draft.pattern);
        if (draft.fabric) setValue("fabric", draft.fabric);
        if (draft.sleeve) setValue("sleeve", draft.sleeve);
        if (draft.fit) setValue("fit", draft.fit);
        if (draft.color) setValue("color", draft.color);
        if (draft.notes) setValue("notes", draft.notes);
        if (draft.selectedSubtype) setSelectedSubtype(draft.selectedSubtype);
        if (draft.selectedCollar) setSelectedCollar(draft.selectedCollar);
        if (draft.selectedBorder) setSelectedBorder(draft.selectedBorder);
        if (draft.selectedPocket) setSelectedPocket(draft.selectedPocket);
        if (draft.selectedCustomMeta) setSelectedCustomMeta(draft.selectedCustomMeta);
        if (Array.isArray(draft.sizes) && draft.sizes.length > 0) {
          setSizes(draft.sizes);
        }
        if (draft.activeScaleId) setActiveScaleId(draft.activeScaleId);
        setHasDraft(true);
      }
    } catch {}
    restoredDraftRef.current = true;
  }, [categories, setValue]);

  const onSubmit = async (data: AuditEntryInput) => {
    setSubmitting(true);
    try {
      const isShirt = isShirtCategory(selectedCategoryName);
      const effectivePocket = selectedPocket || (isShirt ? "Single Pocket" : undefined);

      const customMeta: Record<string, string> = {
        ...selectedCustomMeta,
      };
      if (selectedSubtype) customMeta.subtype = selectedSubtype;
      if (selectedCollar) customMeta.collar = selectedCollar;
      if (selectedBorder) customMeta.border = selectedBorder;
      if (effectivePocket) customMeta.pocket = effectivePocket;

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

      const selectedCatObj = categories.find((c) => c.id === data.categoryId);
      const countedPieces = data.variants.reduce((s, v) => s + v.quantity, 0);
      const effectiveColor = data.color?.trim() || "Color";
      const effectiveFit = data.fit?.trim() || null;
      const newAuditItem: RecentAuditItem = {
        id: String(Date.now()),
        category: selectedCatObj?.name || "Garment",
        brand: data.brand,
        pieces: countedPieces,
        mrp: data.mrp,
        fit: effectiveFit,
        color: effectiveColor,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        variants: data.variants.filter((v) => v.quantity > 0),
      };

      setLastSavedStyle(newAuditItem);
      setRecentAudits((prev) => [newAuditItem, ...prev.slice(0, 4)]);
      setSaveCount((c) => c + 1);

      toast(
        `✓ Saved! ${countedPieces} pcs of ${data.brand} recorded`,
        "success"
      );

      // Remember brand for instant suggestion under this category
      if (data.brand) {
        rememberBrand(data.brand);
      }

      // Next item handling based on keepDetailsForNext setting
      if (keepDetailsForNext) {
        // Keep category, brand, MRP, and all attributes! Only reset size counts to 0
        if (currentCategoryScales.length > 0) {
          const activeScale =
            currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
            currentCategoryScales[0];
          setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
        }
      } else {
        // Full reset except category and brand
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
        setSelectedSubtype(null);
        setSelectedCollar(null);
        setSelectedBorder(null);
        setSelectedPocket(null);
        setSelectedCustomMeta({});

        if (currentCategoryScales.length > 0) {
          const activeScale =
            currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
            currentCategoryScales[0];
          setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
        }
      }

      // Clear draft storage
      try {
        localStorage.removeItem("zain_audit_draft_v1");
      } catch {}
      setHasDraft(false);

      setTimeout(() => {
        if (!keepDetailsForNext) {
          mrpInputRef.current?.focus();
        }
      }, 150);
    } catch {
      // Offline fallback: queue to localStorage
      const isShirt = isShirtCategory(selectedCategoryName);
      const effectivePocket = selectedPocket || (isShirt ? "Single Pocket" : undefined);

      const customMeta: Record<string, string> = {
        ...selectedCustomMeta,
      };
      if (selectedSubtype) customMeta.subtype = selectedSubtype;
      if (selectedCollar) customMeta.collar = selectedCollar;
      if (selectedBorder) customMeta.border = selectedBorder;
      if (effectivePocket) customMeta.pocket = effectivePocket;

      const payload = {
        ...data,
        customMeta: Object.keys(customMeta).length > 0 ? customMeta : undefined,
      };

      enqueueOffline("/api/products", "POST", payload);
      toast("Saved offline — will sync once reconnected", "info");

      const selectedCatObj = categories.find((c) => c.id === data.categoryId);
      const countedPieces = data.variants.reduce((s, v) => s + v.quantity, 0);
      const newAuditItem: RecentAuditItem = {
        id: String(Date.now()),
        category: selectedCatObj?.name || "Garment",
        brand: data.brand,
        pieces: countedPieces,
        mrp: data.mrp,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setLastSavedStyle(newAuditItem);
      setRecentAudits((prev) => [newAuditItem, ...prev.slice(0, 4)]);
      setSaveCount((c) => c + 1);

      if (data.brand) {
        rememberBrand(data.brand);
      }

      if (keepDetailsForNext) {
        if (currentCategoryScales.length > 0) {
          const activeScale =
            currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
            currentCategoryScales[0];
          setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
        }
      } else {
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
        setSelectedSubtype(null);
        setSelectedCollar(null);
        setSelectedBorder(null);

        if (currentCategoryScales.length > 0) {
          const activeScale =
            currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId) ||
            currentCategoryScales[0];
          setSizes(activeScale.sizes.map((s: string) => ({ size: s, quantity: 0 })));
        }
      }

      try {
        localStorage.removeItem("zain_audit_draft_v1");
      } catch {}
      setHasDraft(false);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, onSubmit]);

  /* ── Enhanced Chip selector helper with inline Quick-Add ── */
  const ChipSelector = ({
    label,
    options,
    value,
    onChange,
    onAdd,
    color = "indigo",
    badge,
  }: {
    label: string;
    options: string[];
    value: string | null;
    onChange: (v: string | null) => void;
    onAdd?: (newVal: string) => void;
    color?: "indigo" | "amber" | "slate" | "teal";
    badge?: React.ReactNode;
  }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [addInput, setAddInput] = useState("");

    if ((!options || options.length === 0) && !onAdd) return null;

    const colorMap = {
      indigo: {
        active: "bg-indigo-600 text-white border-indigo-600 shadow-xs",
        inactive: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      },
      amber: {
        active: "bg-amber-600 text-white border-amber-600 shadow-xs",
        inactive: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      },
      slate: {
        active: "bg-slate-800 text-white border-slate-800 shadow-xs",
        inactive: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      },
      teal: {
        active: "bg-teal-600 text-white border-teal-600 shadow-xs",
        inactive: "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      },
    };
    const c = colorMap[color];

    const handleCommitAdd = () => {
      const trimmed = addInput.trim();
      if (trimmed && onAdd) {
        onAdd(trimmed);
        setAddInput("");
        setIsAdding(false);
      }
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {label}
          </label>
          <div className="flex items-center gap-2">
            {badge}
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(options || []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? null : opt)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                value === opt ? c.active : c.inactive
              }`}
            >
              {opt}
            </button>
          ))}

          {onAdd && (
            isAdding ? (
              <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded-lg p-0.5 animate-slide-up">
                <input
                  type="text"
                  placeholder="New..."
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCommitAdd();
                    } else if (e.key === "Escape") {
                      setIsAdding(false);
                      setAddInput("");
                    }
                  }}
                  autoFocus
                  className="w-24 px-1.5 py-0.5 text-xs text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCommitAdd}
                  disabled={!addInput.trim()}
                  className="w-5 h-5 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40"
                  title="Add option"
                >
                  <Check size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setAddInput("");
                  }}
                  className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                  title="Cancel"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all border border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 bg-slate-50 hover:bg-white flex items-center gap-0.5"
                title={`Add new ${label}`}
              >
                <Plus size={11} />
                <span>Add</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 md:pt-8 pb-24 md:pb-12">
      {/* Header — minimal */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Rack Audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {saveCount > 0 ? `${saveCount} styles recorded this session` : "Count garments by size"}
          </p>
        </div>

        {totalItemPieces > 0 && (
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm h-10 px-5 rounded-lg shadow-sm"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span className="ml-1.5">Save ({totalItemPieces} pcs)</span>
          </Button>
        )}
      </header>

      {/* Recent save confirmation banner */}
      {lastSavedStyle && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <div className="text-xs min-w-0">
              <span className="font-bold">{lastSavedStyle.brand} ({lastSavedStyle.category})</span>
              <span className="text-emerald-700 ml-1.5 font-medium">
                • {lastSavedStyle.pieces} pcs recorded (₹{lastSavedStyle.mrp})
              </span>
              {(lastSavedStyle.fit || lastSavedStyle.color) && (
                <span className="text-emerald-800 ml-1.5 font-semibold bg-emerald-100/90 px-1.5 py-0.5 rounded text-[10px]">
                  {[lastSavedStyle.fit, lastSavedStyle.color].filter(Boolean).join(" • ")}
                </span>
              )}
              <span className="text-emerald-600 text-[10px] ml-1.5 hidden sm:inline">
                at {lastSavedStyle.time}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full shrink-0">
            Ready for next scan
          </span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Item details ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Category
              </label>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    <Plus size={13} />
                    New
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                    <DialogDescription>
                      Create a new garment category for your store
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <Input
                      placeholder="e.g. Kurtas, Suits, Jubbas..."
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
                    <Button type="button" variant="ghost" onClick={() => setIsCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={createCategory} disabled={creatingCategory || !newCategoryName.trim()}>
                      {creatingCategory && <Loader2 size={14} className="animate-spin mr-1" />}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = watchedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setValue("categoryId", cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {errors.categoryId && (
              <p className="text-rose-600 text-xs mt-2">{errors.categoryId.message}</p>
            )}
          </section>

          {/* Brand */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Brand / Company
              </label>
              {brands.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  {brands.length} store brands
                </span>
              )}
            </div>
            <div className="relative">
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <div className="relative flex items-center">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <Input
                      {...field}
                      ref={brandInputRef}
                      placeholder="Search or select brand..."
                      className="pl-9 pr-16 text-sm h-10 font-medium"
                      autoComplete="off"
                      onClick={() => setShowBrandDropdown(true)}
                      onFocus={(e) => {
                        setShowBrandDropdown(true);
                        e.target.select();
                      }}
                      onBlur={() => setTimeout(() => setShowBrandDropdown(false), 250)}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      {field.value && (
                        <button
                          type="button"
                          onClick={() => {
                            setValue("brand", "");
                            setShowBrandDropdown(true);
                            brandInputRef.current?.focus();
                          }}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                          title="Clear brand"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBrandDropdown((prev) => !prev);
                          if (!showBrandDropdown) {
                            brandInputRef.current?.focus();
                          }
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                          showBrandDropdown
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        title="Open brands dropdown"
                      >
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${
                            showBrandDropdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              />

              {/* Dropdown */}
              {showBrandDropdown && (
                <div className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-slide-up divide-y divide-slate-100">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-100">
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      Store Brands ({brands.length})
                    </span>
                    <span>{selectedCategoryName ? `${selectedCategoryName} & All` : "All Brands"}</span>
                  </div>

                  {/* If user typed a custom brand not in store, offer to add it */}
                  {watchedBrand &&
                    !brands.some((b) => b.toLowerCase() === watchedBrand.toLowerCase().trim()) && (
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 transition-colors flex items-center justify-between"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          rememberBrand(watchedBrand);
                          setShowBrandDropdown(false);
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Plus size={14} />
                          Add &quot;{watchedBrand.trim()}&quot; to store brands
                        </span>
                        <span className="text-[10px] text-indigo-500 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                          + Add Brand
                        </span>
                      </button>
                    )}

                  {dropdownBrands.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                      No brand matching &quot;{watchedBrand}&quot;. Click &quot;Add&quot; above to create it.
                    </div>
                  ) : (
                    dropdownBrands.map((b) => {
                      const isSelected =
                        watchedBrand && watchedBrand.toLowerCase().trim() === b.toLowerCase().trim();
                      return (
                        <button
                          key={b}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-indigo-50/80 text-indigo-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setValue("brand", b, { shouldValidate: true, shouldDirty: true });
                            setShowBrandDropdown(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{b}</span>
                            {isSelected && (
                              <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100 px-1.5 py-0.5 rounded">
                                Selected
                              </span>
                            )}
                          </span>
                          {isSelected && <Check size={14} className="text-indigo-600" />}
                        </button>
                      );
                    })
                  )}

                  {/* If search filtered the list, option to view all brands */}
                  {Boolean(watchedBrand && dropdownBrands.length < brands.length) && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-center text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors bg-slate-50/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setValue("brand", "");
                        brandInputRef.current?.focus();
                      }}
                    >
                      View all {brands.length} store brands →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick brand chips */}
            {brands.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
                {brands.slice(0, 16).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setValue("brand", b, { shouldValidate: true, shouldDirty: true });
                      setShowBrandDropdown(false);
                    }}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                      watchedBrand && watchedBrand.toLowerCase().trim() === b.toLowerCase().trim()
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {errors.brand && (
              <p className="text-rose-600 text-xs mt-2">{errors.brand.message}</p>
            )}
          </section>

          {/* Garment Attributes — shows store settings + quick add */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Attributes
                </label>
                <span className="text-[11px] text-slate-400">
                  {selectedCategoryName || "Category"} options
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddAttrDialogOpen(true)}
                  className="h-7 text-xs px-2.5 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Plus size={13} />
                  Add Attribute
                </Button>
                <a
                  href="/settings"
                  className="text-[11px] text-slate-400 hover:text-indigo-600 font-medium hidden sm:inline"
                >
                  Settings →
                </a>
              </div>
            </div>

            {/* Subtypes */}
            {((currentCategoryAttrs.subtypes && currentCategoryAttrs.subtypes.length > 0) || isInnerwear) && (
              <ChipSelector
                label="Subtype / Style"
                options={currentCategoryAttrs.subtypes || []}
                value={selectedSubtype}
                onChange={setSelectedSubtype}
                onAdd={(val) => handleAddAttributeValue("subtypes", val)}
              />
            )}

            {/* Collars */}
            {(!isMundu && ((currentCategoryAttrs.collars && currentCategoryAttrs.collars.length > 0) || !isInnerwear)) && (
              <ChipSelector
                label="Collar / Neck"
                options={currentCategoryAttrs.collars || []}
                value={selectedCollar}
                onChange={setSelectedCollar}
                onAdd={(val) => handleAddAttributeValue("collars", val)}
              />
            )}

            {/* Pocket Style */}
            {(!isMundu && !isInnerwear && ((currentCategoryAttrs.pockets && currentCategoryAttrs.pockets.length > 0) || isShirtCategory(selectedCategoryName))) && (
              <div className="animate-fade-in">
                <ChipSelector
                  label="Pocket Style"
                  badge={
                    selectedPocket ? (
                      <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        {selectedPocket}
                      </span>
                    ) : isShirtCategory(selectedCategoryName) ? (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Unselected: Default to Single Pocket
                      </span>
                    ) : undefined
                  }
                  options={currentCategoryAttrs.pockets || DEFAULT_POCKETS}
                  value={selectedPocket}
                  onChange={setSelectedPocket}
                  onAdd={(val) => handleAddAttributeValue("pockets", val)}
                  color="teal"
                />
              </div>
            )}

            {/* Dynamic Custom Attributes */}
            {Object.entries(currentCategoryAttrs.customAttributes || {}).map(([attrName, options]) => (
              <div key={attrName} className="animate-fade-in">
                <ChipSelector
                  label={attrName}
                  badge={
                    selectedCustomMeta[attrName] ? (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {selectedCustomMeta[attrName]}
                      </span>
                    ) : undefined
                  }
                  options={options || []}
                  value={selectedCustomMeta[attrName] || null}
                  onChange={(val) =>
                    setSelectedCustomMeta((prev) => {
                      const next = { ...prev };
                      if (val) next[attrName] = val;
                      else delete next[attrName];
                      return next;
                    })
                  }
                  onAdd={(val) => handleAddCustomAttributeOption(attrName, val)}
                  color="indigo"
                />
              </div>
            ))}

            {/* Pattern */}
            <ChipSelector
              label="Pattern"
              options={currentCategoryAttrs.patterns || PATTERNS}
              value={watch("pattern") || null}
              onChange={(val) => setValue("pattern", val)}
              onAdd={(val) => handleAddAttributeValue("patterns", val)}
            />

            {/* Sleeve */}
            {showSleeve && (
              <div className="animate-fade-in">
                <ChipSelector
                  label="Sleeve"
                  options={currentCategoryAttrs.sleeves || SLEEVES}
                  value={watch("sleeve") || null}
                  onChange={(val) => setValue("sleeve", val)}
                  onAdd={(val) => handleAddAttributeValue("sleeves", val)}
                />
              </div>
            )}

            {/* Fabric */}
            <ChipSelector
              label="Fabric"
              options={currentCategoryAttrs.fabrics || FABRICS}
              value={watch("fabric") || null}
              onChange={(val) => setValue("fabric", val)}
              onAdd={(val) => handleAddAttributeValue("fabrics", val)}
            />

            {/* Fit */}
            {!isMundu && (
              <div className="animate-fade-in">
                <ChipSelector
                  label="Fit"
                  badge={
                    watch("fit") ? (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {watch("fit")}
                      </span>
                    ) : undefined
                  }
                  options={currentCategoryAttrs.fits || FITS}
                  value={watch("fit") || null}
                  onChange={(val) => setValue("fit", val)}
                  onAdd={(val) => handleAddAttributeValue("fits", val)}
                />
              </div>
            )}

            {/* Mundu Border */}
            {isMundu && (
              <ChipSelector
                label="Mundu Border / Kasavu"
                options={currentCategoryAttrs.borders || MUNDU_BORDERS}
                value={selectedBorder}
                onChange={setSelectedBorder}
                onAdd={(val) => handleAddAttributeValue("borders", val)}
                color="amber"
              />
            )}

            {/* Color */}
            <ChipSelector
              label="Color"
              badge={
                watch("color") ? (
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                    {watch("color")}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Unselected: Default to Color
                  </span>
                )
              }
              options={allColorOptions}
              value={watch("color") || null}
              onChange={(val) => setValue("color", val)}
              onAdd={handleAddCustomColor}
              color="slate"
            />
          </section>

          {/* MRP + Notes — combined into one compact card */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  MRP Price (₹)
                </label>
                {watchedMrp && watchedMrp > 0 ? (
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    ₹{watchedMrp.toLocaleString("en-IN")}
                  </span>
                ) : null}
              </div>

              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-indigo-600 pointer-events-none">
                      ₹
                    </span>
                    <Controller
                      name="mrp"
                      control={control}
                      render={({ field }) => (
                        <Input
                          ref={mrpInputRef}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Select or enter MRP..."
                          className="pl-9 pr-8 text-xl font-bold h-12 text-center tracking-tight"
                          value={field.value ? String(field.value) : ""}
                          autoComplete="off"
                          onFocus={(e) => {
                            setShowMrpDropdown(true);
                            if (e.target.value === "0") {
                              field.onChange(0);
                              e.target.select();
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowMrpDropdown(false), 250)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                            if (e.key === "Escape") setShowMrpDropdown(false);
                          }}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, "");
                            field.onChange(clean ? parseInt(clean, 10) : 0);
                            setShowMrpDropdown(true);
                          }}
                        />
                      )}
                    />
                    {watchedMrp && watchedMrp > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setValue("mrp", 0);
                          setShowMrpDropdown(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-12 text-xs px-3 font-semibold"
                    onClick={() => setValue("mrp", Math.max(0, (watchedMrp || 0) + 100))}
                  >
                    +100
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-12 text-xs px-3 font-semibold"
                    onClick={() => setValue("mrp", Math.max(0, (watchedMrp || 0) + 500))}
                  >
                    +500
                  </Button>
                </div>

                {/* Suggestions Dropdown Popover */}
                {showMrpDropdown && (
                  <div className="absolute z-30 top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-slide-up max-h-64 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Sparkles size={11} className="text-amber-500" />
                        Most Used in Current Stock
                      </span>
                      <span>{selectedCategoryName ? `${selectedCategoryName} Stock` : "All Stock"}</span>
                    </div>

                    {/* If user typed a custom MRP not in suggestions, offer to use it directly */}
                    {Boolean(watchedMrp && watchedMrp > 0 && !mrpSuggestions.some((s) => s.mrp === watchedMrp)) && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 flex items-center justify-between transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectMrp(watchedMrp);
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Check size={13} />
                          Use new price: ₹{watchedMrp.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-indigo-500 font-normal">New</span>
                      </button>
                    )}

                    {filteredMrpSuggestions.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-slate-400">
                        No stock price matching &quot;{watchedMrp}&quot;. You can use this as a new price.
                      </div>
                    ) : (
                      filteredMrpSuggestions.map((item) => {
                        const isSelected = watchedMrp === item.mrp;
                        return (
                          <button
                            key={item.mrp}
                            type="button"
                            className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-indigo-50 text-indigo-900 font-bold"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectMrp(item.mrp);
                            }}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{item.mrp.toLocaleString("en-IN")}
                              </span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              )}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.isTopUsed && item.items > 0 ? (
                                <Badge variant="success" className="text-[10px] py-0 px-2 font-bold bg-emerald-100 text-emerald-800 border-emerald-200">
                                  ★ Most Used ({item.items} styles • {item.pieces} pcs)
                                </Badge>
                              ) : item.isStorePrice && item.items > 0 ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold text-slate-700 bg-slate-50">
                                  In Stock ({item.items} styles • {item.pieces} pcs)
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400">Standard</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {errors.mrp && (
                <p className="text-rose-600 text-xs mt-1">{errors.mrp.message}</p>
              )}

              {/* Quick MRP 1-tap chips row (Ranked by most used in stock) */}
              <div className="pt-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Sparkles size={12} className="text-amber-500" />
                    Most Used in Stock:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedCategoryName ? `${selectedCategoryName} Stock` : "All Stock"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {quickMrpChips.map((chip) => {
                    const isSelected = watchedMrp === chip.mrp;
                    return (
                      <button
                        key={chip.mrp}
                        type="button"
                        onClick={() => handleSelectMrp(chip.mrp)}
                        className={`shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 border-slate-200"
                        }`}
                      >
                        <span>₹{chip.mrp.toLocaleString("en-IN")}</span>
                        {chip.pieces > 0 && (
                          <span
                            className={`text-[10px] font-medium px-1 rounded ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : chip.isTopUsed
                                ? "bg-emerald-100 text-emerald-800 font-bold"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {chip.pieces} pcs
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Notes (optional)
              </label>
              <Input
                {...register("notes")}
                placeholder="Rack A3, Double pocket, Chinese collar..."
                className="text-xs h-9"
              />
            </div>
          </section>
        </div>

        {/* ── Right Column: Size Matrix + Save ── */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          {/* Size Matrix */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Size × Quantity
                </label>
                {totalItemPieces > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 mt-0.5 block">
                    {totalItemPieces} pieces • ₹{((watchedMrp || 0) * totalItemPieces).toLocaleString("en-IN")} value
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomSize(!showCustomSize)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-0.5"
              >
                <Plus size={13} />
                Custom
              </button>
            </div>

            {/* Scale tabs */}
            {currentCategoryScales.length > 1 && (
              <div className="flex items-center gap-1 mb-3 p-0.5 bg-slate-100 rounded-lg">
                {currentCategoryScales.map((sc: CategoryScale) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleScaleChange(sc)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all text-center ${
                      activeScaleId === sc.id
                        ? "bg-white text-indigo-700 shadow-sm font-semibold"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            )}

            {/* Custom size input */}
            {showCustomSize && (
              <div className="flex gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 mb-3 animate-slide-up">
                <Input
                  placeholder="e.g. 36, Free Size..."
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addCustomSize(); }
                  }}
                  className="h-8 text-xs"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={addCustomSize} className="h-8 text-xs">
                  Add
                </Button>
              </div>
            )}

            {/* Size rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {sizes.map((entry, index) => {
                const activeScale = currentCategoryScales.find((s: CategoryScale) => s.id === activeScaleId);
                const isPreset = activeScale ? activeScale.sizes.includes(entry.size) : true;
                const hasCount = entry.quantity > 0;

                return (
                  <div
                    key={entry.size}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                      hasCount
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {entry.size}
                      </span>
                      {!isPreset && (
                        <button type="button" onClick={() => removeSize(index)} className="text-slate-400 hover:text-rose-500">
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        disabled={entry.quantity <= 0}
                        className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={entry.quantity}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                        }}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "");
                          setQuantity(index, clean ? parseInt(clean, 10) : 0);
                        }}
                        className={`w-10 h-7 text-center font-bold text-xs rounded-md border outline-none transition-all ${
                          hasCount
                            ? "bg-white text-emerald-700 border-emerald-300"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        className="w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.variants && (
              <p className="text-rose-600 text-xs mt-2">{errors.variants.message}</p>
            )}
          </section>

          {/* Save Button — ONE clear action */}
          <Button
            type="submit"
            disabled={submitting || totalItemPieces === 0}
            className={`w-full h-12 rounded-xl text-sm font-bold transition-all ${
              totalItemPieces > 0
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            ) : totalItemPieces > 0 ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Save & Scan Next ({totalItemPieces} pcs)
                <kbd className="hidden sm:inline text-[10px] bg-emerald-700/30 px-1.5 py-0.5 rounded ml-2">
                  Ctrl+↵
                </kbd>
              </span>
            ) : (
              "Add sizes above to save"
            )}
          </Button>

          {/* Quick settings & Clear draft */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepDetailsForNext}
                onChange={(e) => {
                  setKeepDetailsForNext(e.target.checked);
                  try {
                    localStorage.setItem("zain_keep_details_for_next", String(e.target.checked));
                  } catch {}
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="font-medium text-slate-600">Keep style & price for next scan</span>
            </label>
            {hasDraft && (
              <button
                type="button"
                onClick={handleClearForm}
                className="text-[11px] text-slate-400 hover:text-rose-600 font-medium"
              >
                Clear form
              </button>
            )}
          </div>

          {/* Recent scans — compact with exact size breakdown */}
          {recentAudits.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock size={13} className="text-indigo-600" />
                  <span>Recently Audited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{recentAudits.length} logged</span>
                  <Link
                    href="/inventory?group=size&sort=updated-desc"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                    title="View all individual sizes in inventory in order of last scanned"
                  >
                    <span>View by Size</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {recentAudits.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 truncate">{item.brand}</span>
                          <span className="text-slate-400 text-[11px]">({item.category})</span>
                          <span className="text-slate-500 font-semibold text-[11px]">
                            ₹{item.mrp.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{item.time}</span>
                          {item.fit && <span>• {item.fit}</span>}
                          {item.color && <span>• {item.color}</span>}
                        </div>
                      </div>
                      <Badge variant="success" className="text-[11px] py-0.5 px-2 font-black shrink-0">
                        {item.pieces} pcs
                      </Badge>
                    </div>

                    {/* Exact sizes recorded in this scan */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-medium">Sizes:</span>
                        {item.variants.map((v) => (
                          <span
                            key={v.size}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-900"
                          >
                            <span>{v.size}:</span>
                            <span className="font-extrabold text-indigo-700">{v.quantity}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </form>

      {/* ── Add Attribute to Category Modal ── */}
      <Dialog open={isAddAttrDialogOpen} onOpenChange={setIsAddAttrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles size={18} className="text-indigo-600" />
              Manage Attributes: {selectedCategoryName || "Category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add new garment options directly from here. Saved instantly to your store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Attribute Type
              </label>
              <select
                value={modalAttrType}
                onChange={(e) => setModalAttrType(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none shadow-2xs"
              >
                <option value="pockets">Pocket Style (No Pocket, Single, Double...)</option>
                <option value="fabrics">Fabric / Material (Cotton, Linen, Rayon...)</option>
                <option value="collars">Collar / Neck (Mandarin, Polo, Cuban...)</option>
                <option value="sleeves">Sleeve Style (Full, Half, Sleeveless...)</option>
                <option value="fits">Fit Type (Slim, Regular, Relaxed...)</option>
                <option value="patterns">Pattern / Print (Plain, Checks, Striped...)</option>
                <option value="subtypes">Subtype / Style (Brief, Trunk, Vest, Polo...)</option>
                <option value="borders">Mundu Border / Zari (Kasavu, Kara, Double...)</option>
                {Object.keys(currentCategoryAttrs.customAttributes || {}).map((group) => (
                  <option key={group} value={`custom:${group}`}>
                    {group} (Custom Attribute)
                  </option>
                ))}
                <option value="new_custom">+ Create New Attribute Type...</option>
              </select>
            </div>

            {modalAttrType === "new_custom" && (
              <div className="animate-fade-in">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  New Attribute Type Name
                </label>
                <Input
                  placeholder="e.g. Rise, Closure, Button Type, Occasion..."
                  value={modalCustomTypeName}
                  onChange={(e) => setModalCustomTypeName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                New Option Value
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Linen Blend, Mandarin Collar, Comfort Fit..."
                  value={modalAttrVal}
                  onChange={(e) => setModalAttrVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleModalAddAttribute();
                    }
                  }}
                  autoFocus
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleModalAddAttribute}
                  disabled={!modalAttrVal.trim() || modalSaving}
                  className="h-9 text-xs px-3.5 gap-1 shrink-0"
                >
                  {modalSaving && <Loader2 size={13} className="animate-spin" />}
                  <Plus size={13} />
                  Add
                </Button>
              </div>
            </div>

            {/* List of current options for this type */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Current {modalAttrType.startsWith("custom:") ? modalAttrType.replace("custom:", "") : modalAttrType} in {selectedCategoryName}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {currentModalOptions.length === 0 ? (
                  <span className="text-xs text-slate-400 italic p-1">No options configured yet</span>
                ) : (
                  currentModalOptions.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium shadow-2xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleModalRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove option"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddAttrDialogOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
