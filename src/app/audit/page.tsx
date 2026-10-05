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
  Search,
  Zap,
  Clock,
  Check,
  Sparkles,
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
}

export default function AuditPage() {
  const [recentAudits, setRecentAudits] = useState<RecentAuditItem[]>([]);
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
      }
    >
  >({});
  const [activeScaleId, setActiveScaleId] = useState<string>("");

  // Dynamic garment attribute selections
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [selectedCollar, setSelectedCollar] = useState<string | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<string[]>([]);

  // Add Attribute Modal State
  const [isAddAttrDialogOpen, setIsAddAttrDialogOpen] = useState(false);
  const [modalAttrType, setModalAttrType] = useState<
    "fabrics" | "collars" | "sleeves" | "fits" | "patterns" | "subtypes" | "borders"
  >("fabrics");
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
      .then((data: ({ name: string } | string)[]) => {
        if (!Array.isArray(data)) return;
        const brandNames = data.map((b) => (typeof b === "string" ? b : b.name));
        const sorted = Array.from(new Set(brandNames)).sort((a, b) =>
          a.localeCompare(b)
        );
        setBrands(sorted);
        setFilteredBrands(sorted);
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

  // Attributes for currently selected category — uses store attributes with smart fallbacks
  const currentCategoryAttrs = useMemo(() => {
    return resolveCategoryAttributes(selectedCategoryName, storeAttributes);
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
      else if (k === "color") setValue("color", val);
    },
    [setValue]
  );

  // Add an attribute value directly from Audit page and persist to database
  const handleAddAttributeValue = useCallback(
    async (
      attrKey: "subtypes" | "collars" | "sleeves" | "fits" | "fabrics" | "patterns" | "borders",
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
      attrKey: "subtypes" | "collars" | "sleeves" | "fits" | "fabrics" | "patterns" | "borders",
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

  // Add custom color and auto-select
  const handleAddCustomColor = useCallback(
    (newColor: string) => {
      const trimmed = newColor.trim();
      if (!trimmed) return;
      setCustomColors((prev) => Array.from(new Set([...prev, trimmed])));
      setValue("color", trimmed);
      toast(`✓ Color "${trimmed}" selected`, "success");
    },
    [setValue]
  );

  // Modal Add Attribute Handler
  const handleModalAddAttribute = async () => {
    if (!modalAttrVal.trim() || !selectedCategoryName) return;
    setModalSaving(true);
    try {
      await handleAddAttributeValue(modalAttrType, modalAttrVal);
      setModalAttrVal("");
      setIsAddAttrDialogOpen(false);
    } finally {
      setModalSaving(false);
    }
  };

  // Combine popular colors with dynamically added colors
  const allColorOptions = useMemo(() => {
    return Array.from(new Set([...POPULAR_COLORS, ...customColors]));
  }, [customColors]);

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
    color?: "indigo" | "amber" | "slate";
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
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Brand / Company
            </label>
            <div className="relative">
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <Input
                      {...field}
                      ref={brandInputRef}
                      placeholder="Search or type brand name..."
                      className="pl-9 text-sm h-10"
                      autoComplete="off"
                      onFocus={() => setShowBrandDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBrandDropdown(false), 250)}
                    />
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => setValue("brand", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
              />

              {/* Dropdown */}
              {showBrandDropdown && (
                <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto animate-slide-up">
                  {watchedBrand &&
                    !brands.some((b) => b.toLowerCase() === watchedBrand.toLowerCase().trim()) && (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          rememberBrand(watchedBrand);
                          setShowBrandDropdown(false);
                        }}
                      >
                        <Plus size={13} />
                        Add &quot;{watchedBrand}&quot;
                      </button>
                    )}
                  {filteredBrands.slice(0, 12).map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
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

            {/* Quick brand chips */}
            {brands.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none pb-0.5">
                {brands.slice(0, 8).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setValue("brand", b);
                      setShowBrandDropdown(false);
                    }}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                      watchedBrand === b
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                MRP Price (₹)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-indigo-600 pointer-events-none">₹</span>
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
                        className="pl-9 text-xl font-bold h-12 text-center tracking-tight"
                        value={field.value ? String(field.value) : ""}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            field.onChange(0);
                            e.target.select();
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                        }}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "");
                          field.onChange(clean ? parseInt(clean, 10) : 0);
                        }}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs px-3 font-semibold"
                  onClick={() => setValue("mrp", Math.max(0, (watchedMrp || 0) + 100))}
                >
                  +100
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 text-xs px-3 font-semibold"
                  onClick={() => setValue("mrp", Math.max(0, (watchedMrp || 0) + 500))}
                >
                  +500
                </Button>
              </div>
              {errors.mrp && (
                <p className="text-rose-600 text-xs mt-1">{errors.mrp.message}</p>
              )}
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

          {/* Recent scans — compact */}
          {recentAudits.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Clock size={13} />
                  Recent
                </div>
                <span className="text-[10px] text-slate-400">{recentAudits.length} logged</span>
              </div>
              <div className="divide-y divide-slate-100">
                {recentAudits.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{item.brand}</span>
                      <span className="text-slate-400 ml-1.5">{item.category}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        ₹{item.mrp.toLocaleString("en-IN")} • {item.time}
                      </div>
                    </div>
                    <Badge variant="success" className="text-[11px] py-0 px-2 font-semibold">
                      {item.pieces}
                    </Badge>
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
                onChange={(e) => setModalAttrType(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none shadow-2xs"
              >
                <option value="fabrics">Fabric / Material (Cotton, Linen, Rayon...)</option>
                <option value="collars">Collar / Neck (Mandarin, Polo, Cuban...)</option>
                <option value="sleeves">Sleeve Style (Full, Half, Sleeveless...)</option>
                <option value="fits">Fit Type (Slim, Regular, Relaxed...)</option>
                <option value="patterns">Pattern / Print (Plain, Checks, Striped...)</option>
                <option value="subtypes">Subtype / Style (Brief, Trunk, Vest, Polo...)</option>
                <option value="borders">Mundu Border / Zari (Kasavu, Kara, Double...)</option>
              </select>
            </div>

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
                Current {modalAttrType} in {selectedCategoryName}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                {(currentCategoryAttrs[modalAttrType] || []).length === 0 ? (
                  <span className="text-xs text-slate-400 italic p-1">No options configured yet</span>
                ) : (
                  (currentCategoryAttrs[modalAttrType] || []).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-medium shadow-2xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeTag(modalAttrType, tag)}
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
