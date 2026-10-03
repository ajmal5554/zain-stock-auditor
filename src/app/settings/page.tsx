"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Tag,
  Shirt,
  Layers,
  Plus,
  Trash2,
  Check,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  FolderPlus,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/toaster";

interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

interface BrandItem {
  id?: string;
  name: string;
  categories: string[];
}

interface SizeScale {
  id: string;
  name: string;
  sizes: string[];
  default?: boolean;
}

type SizeScalesMap = Record<string, SizeScale[]>;

interface CategoryAttributes {
  subtypes?: string[];
  collars?: string[];
  sleeves?: string[];
  fits?: string[];
  fabrics?: string[];
  patterns?: string[];
  borders?: string[];
}

type AttributesMap = Record<string, CategoryAttributes>;

// Recommended starter templates (ONLY loaded when user clicks "Load Starter Template")
const STARTER_TEMPLATES: Record<string, { scales: SizeScale[]; attrs: CategoryAttributes }> = {
  shirt: {
    scales: [
      { id: "scale_shirt_alpha", name: "Alpha (S - 3XL)", sizes: ["S", "M", "L", "XL", "XXL", "3XL"], default: true },
      { id: "scale_shirt_collar", name: "Collar Sizes (38 - 44)", sizes: ["38", "39", "40", "42", "44"] },
    ],
    attrs: {
      sleeves: ["Full Sleeve", "Half Sleeve"],
      collars: ["Regular Collar", "Mandarin / Chinese Collar", "Button-Down"],
      fits: ["Regular Fit", "Slim Fit"],
      fabrics: ["Cotton", "Linen", "Cotton Blend"],
      patterns: ["Plain", "Checks", "Stripes"],
    },
  },
  tshirt: {
    scales: [
      { id: "scale_tshirt_std", name: "Standard (S - 3XL)", sizes: ["S", "M", "L", "XL", "XXL", "3XL"], default: true },
    ],
    attrs: {
      collars: ["Round Neck", "Polo / Collar", "V-Neck", "Hooded / Hoodie"],
      sleeves: ["Half Sleeve", "Full Sleeve", "Sleeveless"],
      fits: ["Regular Fit", "Slim Fit", "Oversized"],
      fabrics: ["100% Cotton", "Pique Cotton", "Dry-Fit"],
      patterns: ["Solid / Plain", "Printed", "Stripes"],
    },
  },
  innerwear: {
    scales: [
      { id: "scale_inner_adult", name: "Adults (75 - 100 cm)", sizes: ["75", "80", "85", "90", "95", "100"], default: true },
      { id: "scale_inner_kids", name: "Kids (50 - 75 cm)", sizes: ["50", "55", "60", "65", "70", "75"] },
      { id: "scale_inner_waist", name: "Waist (30 - 40 in)", sizes: ["30", "32", "34", "36", "38", "40"] },
    ],
    attrs: {
      subtypes: ["Brief", "Trunk", "Boxer Brief", "Vest (Sleeveless)", "Gym Vest", "Drawer"],
      fabrics: ["100% Cotton", "Ribbed Cotton", "Modal Blend"],
      patterns: ["Solid / Plain", "Printed"],
    },
  },
  mundu: {
    scales: [
      { id: "scale_mundu_std", name: "Type", sizes: ["Single", "Double"], default: true },
    ],
    attrs: {
      borders: ["Plain White", "Gold Kasavu", "Silver Kasavu", "Color Border", "Double Border"],
      fabrics: ["Cotton Handloom", "Double Cotton", "Tissue Silk"],
    },
  },
  pants: {
    scales: [
      { id: "scale_pants_waist", name: "Waist (28 - 42 in)", sizes: ["28", "30", "32", "34", "36", "38", "40", "42"], default: true },
    ],
    attrs: {
      fits: ["Slim Fit", "Regular Fit", "Relaxed Fit"],
      fabrics: ["Cotton Chino", "Denim", "Poly-Viscose Formal"],
      patterns: ["Plain", "Cross Pocket", "Formal Pleated"],
    },
  },
};

function getTemplateKey(catName: string): string {
  const lower = catName.toLowerCase();
  if (lower.includes("t-shirt") || lower.includes("polo")) return "tshirt";
  if (lower.includes("shirt")) return "shirt";
  if (lower.includes("innerwear") || lower.includes("undergarment") || lower.includes("brief") || lower.includes("boxer")) return "innerwear";
  if (lower.includes("mundu") || lower.includes("dhoti") || lower.includes("lungi")) return "mundu";
  if (lower.includes("pant") || lower.includes("trouser") || lower.includes("jean")) return "pants";
  return "tshirt";
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"brands" | "scales" | "attributes" | "categories">("brands");

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [sizeScales, setSizeScales] = useState<SizeScalesMap>({});
  const [attributes, setAttributes] = useState<AttributesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Brand Management State
  const [brandSearch, setBrandSearch] = useState("");
  const [brandCategoryFilter, setBrandCategoryFilter] = useState<string>("ALL");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandCategories, setNewBrandCategories] = useState<string[]>([]);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [editBrandCategories, setEditBrandCategories] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandItem | null>(null);
  const [isDeleteBrandOpen, setIsDeleteBrandOpen] = useState(false);
  const [isClearAllBrandsOpen, setIsClearAllBrandsOpen] = useState(false);

  // Size Scale State
  const [selectedScaleCategory, setSelectedScaleCategory] = useState<string>("");
  const [newScaleName, setNewScaleName] = useState("");
  const [newScaleSizesInput, setNewScaleSizesInput] = useState("");
  const [isAddScaleOpen, setIsAddScaleOpen] = useState(false);
  const [scaleSizeInput, setScaleSizeInput] = useState<Record<string, string>>({});

  // Attribute State
  const [selectedAttrCategory, setSelectedAttrCategory] = useState<string>("");
  const [newAttrValue, setNewAttrValue] = useState<Record<string, string>>({});

  // Category Manager State
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryToRename, setCategoryToRename] = useState<Category | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleteCatOpen, setIsDeleteCatOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState(false);

  // Load Data from Backend
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData: Category[] = await catRes.json();
        setCategories(catData);
        if (catData.length > 0) {
          setSelectedScaleCategory((prev) => (prev && catData.some((c) => c.name === prev) ? prev : catData[0].name));
          setSelectedAttrCategory((prev) => (prev && catData.some((c) => c.name === prev) ? prev : catData[0].name));
        }
      }

      const brandRes = await fetch("/api/brands");
      if (brandRes.ok) {
        const brandData: (BrandItem | string)[] = await brandRes.json();
        const formatted: BrandItem[] = (brandData || []).map((b) => {
          if (typeof b === "string") return { name: b, categories: ["*"] };
          return { id: b.id, name: b.name, categories: b.categories || ["*"] };
        });
        setBrands(formatted);
      }

      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSizeScales(settingsData.sizeScales || {});
        setAttributes(settingsData.attributes || {});
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist Settings to Backend
  const saveAllSettings = async (updatedScales?: SizeScalesMap, updatedAttrs?: AttributesMap) => {
    setSaving(true);
    try {
      const payload: { sizeScales?: SizeScalesMap; attributes?: AttributesMap } = {};
      if (updatedScales !== undefined) payload.sizeScales = updatedScales;
      if (updatedAttrs !== undefined) payload.attributes = updatedAttrs;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");

      if (updatedScales !== undefined) {
        localStorage.setItem("zain_category_size_scales", JSON.stringify(updatedScales));
      }
      if (updatedAttrs !== undefined) {
        localStorage.setItem("zain_category_attributes", JSON.stringify(updatedAttrs));
      }
      toast.success("Saved successfully");
    } catch {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════ BRAND ACTIONS ═══════════════════════════════
  const handleAddBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      toast.error("Enter a brand name");
      return;
    }
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          categories: newBrandCategories.length > 0 ? newBrandCategories : ["*"],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const saved = await res.json();
      setBrands((prev) => {
        const existingIdx = prev.findIndex((b) => b.name.toLowerCase() === trimmed.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], categories: saved.categories || ["*"] };
          return updated;
        }
        return [...prev, { id: saved.id, name: trimmed, categories: saved.categories || ["*"] }].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      setNewBrandName("");
      setNewBrandCategories([]);
      toast.success(`Brand "${trimmed}" saved!`);
    } catch {
      toast.error("Failed to add brand");
    }
  };

  const handleConfirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    try {
      const url = `/api/brands?id=${brandToDelete.id || ""}&name=${encodeURIComponent(brandToDelete.name)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setBrands((prev) => prev.filter((b) => b.name !== brandToDelete.name));
      toast.success(`"${brandToDelete.name}" permanently deleted`);
    } catch {
      toast.error("Failed to delete brand");
    } finally {
      setIsDeleteBrandOpen(false);
      setBrandToDelete(null);
    }
  };

  const handleClearAllBrands = async () => {
    try {
      for (const b of brands) {
        await fetch(`/api/brands?id=${b.id || ""}&name=${encodeURIComponent(b.name)}`, { method: "DELETE" });
      }
      setBrands([]);
      toast.success("All brands cleared");
    } catch {
      toast.error("Failed to clear some brands");
    } finally {
      setIsClearAllBrandsOpen(false);
    }
  };

  const handleSaveEditBrand = async () => {
    if (!editingBrand) return;
    try {
      const res = await fetch("/api/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBrand.id,
          name: editingBrand.name,
          categories: editBrandCategories.length > 0 ? editBrandCategories : ["*"],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setBrands((prev) =>
        prev.map((b) => (b.name === editingBrand.name ? { ...b, categories: editBrandCategories } : b))
      );
      setIsEditDialogOpen(false);
      setEditingBrand(null);
      toast.success(`Updated ${editingBrand.name}`);
    } catch {
      toast.error("Failed to update");
    }
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(brandSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (brandCategoryFilter === "ALL") return true;
      if (b.categories.includes("*")) return true;
      return b.categories.some((c) => c.toLowerCase() === brandCategoryFilter.toLowerCase());
    });
  }, [brands, brandSearch, brandCategoryFilter]);

  // ═══════════════════════════════ SIZE SCALE ACTIONS ═══════════════════════════════
  const currentCategoryScales: SizeScale[] = useMemo(() => {
    if (!selectedScaleCategory) return [];
    return sizeScales[selectedScaleCategory] || [];
  }, [sizeScales, selectedScaleCategory]);

  const handleLoadStarterScales = () => {
    if (!selectedScaleCategory) return;
    const templateKey = getTemplateKey(selectedScaleCategory);
    const template = STARTER_TEMPLATES[templateKey];
    if (!template) return;
    const updated = { ...sizeScales, [selectedScaleCategory]: template.scales };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    toast.success(`Loaded starter sizes for ${selectedScaleCategory}`);
  };

  const handleAddScaleToCategory = () => {
    const trimmedName = newScaleName.trim();
    if (!trimmedName || !selectedScaleCategory) {
      toast.error("Provide a scale name");
      return;
    }
    const sizes = newScaleSizesInput.split(/[, ]+/).map((s) => s.trim()).filter(Boolean);
    if (sizes.length === 0) {
      toast.error("Enter at least one size");
      return;
    }
    const newScale: SizeScale = {
      id: "scale_" + Math.random().toString(36).substring(2, 9),
      name: trimmedName,
      sizes,
      default: (sizeScales[selectedScaleCategory] || []).length === 0,
    };
    const updated = {
      ...sizeScales,
      [selectedScaleCategory]: [...(sizeScales[selectedScaleCategory] || []), newScale],
    };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    setNewScaleName("");
    setNewScaleSizesInput("");
    setIsAddScaleOpen(false);
    toast.success(`Added scale "${trimmedName}"`);
  };

  const handleRemoveScale = (scaleId: string) => {
    if (!selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    const updatedCategoryScales = existing.filter((s) => s.id !== scaleId);
    const updated = { ...sizeScales, [selectedScaleCategory]: updatedCategoryScales };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    toast.success("Scale removed");
  };

  const handleAddSizeToScale = (scaleId: string) => {
    const inputVal = (scaleSizeInput[scaleId] || "").trim();
    if (!inputVal || !selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    const updatedCategoryScales = existing.map((s) => {
      if (s.id === scaleId) {
        if (s.sizes.includes(inputVal)) return s;
        return { ...s, sizes: [...s.sizes, inputVal] };
      }
      return s;
    });
    const updated = { ...sizeScales, [selectedScaleCategory]: updatedCategoryScales };
    setSizeScales(updated);
    setScaleSizeInput((prev) => ({ ...prev, [scaleId]: "" }));
    saveAllSettings(updated, undefined);
  };

  const handleRemoveSizeFromScale = (scaleId: string, sizeToRemove: string) => {
    if (!selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    const updatedCategoryScales = existing.map((s) => {
      if (s.id === scaleId) return { ...s, sizes: s.sizes.filter((sz) => sz !== sizeToRemove) };
      return s;
    });
    const updated = { ...sizeScales, [selectedScaleCategory]: updatedCategoryScales };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
  };

  const handleClearCategoryScales = () => {
    if (!selectedScaleCategory) return;
    const updated = { ...sizeScales, [selectedScaleCategory]: [] };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    toast.success(`Cleared all sizes for ${selectedScaleCategory}`);
  };

  // ═══════════════════════════════ ATTRIBUTE ACTIONS ═══════════════════════════════
  const currentCategoryAttrs: CategoryAttributes = useMemo(() => {
    if (!selectedAttrCategory) return {};
    return attributes[selectedAttrCategory] || {};
  }, [attributes, selectedAttrCategory]);

  const handleLoadStarterAttrs = () => {
    if (!selectedAttrCategory) return;
    const templateKey = getTemplateKey(selectedAttrCategory);
    const template = STARTER_TEMPLATES[templateKey];
    if (!template) return;
    const updated = { ...attributes, [selectedAttrCategory]: template.attrs };
    setAttributes(updated);
    saveAllSettings(undefined, updated);
    toast.success(`Loaded starter attributes for ${selectedAttrCategory}`);
  };

  const handleAddAttributeTag = (attrType: keyof CategoryAttributes) => {
    const val = (newAttrValue[attrType] || "").trim();
    if (!val || !selectedAttrCategory) return;
    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];
    if (currentList.includes(val)) {
      toast.error(`"${val}" already exists`);
      return;
    }
    const updated = {
      ...attributes,
      [selectedAttrCategory]: { ...currentCatAttrs, [attrType]: [...currentList, val] },
    };
    setAttributes(updated);
    setNewAttrValue((prev) => ({ ...prev, [attrType]: "" }));
    saveAllSettings(undefined, updated);
  };

  const handleRemoveAttributeTag = (attrType: keyof CategoryAttributes, tag: string) => {
    if (!selectedAttrCategory) return;
    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];
    const updated = {
      ...attributes,
      [selectedAttrCategory]: { ...currentCatAttrs, [attrType]: currentList.filter((t) => t !== tag) },
    };
    setAttributes(updated);
    saveAllSettings(undefined, updated);
  };

  const handleClearCategoryAttrs = () => {
    if (!selectedAttrCategory) return;
    const updated = { ...attributes, [selectedAttrCategory]: {} };
    setAttributes(updated);
    saveAllSettings(undefined, updated);
    toast.success(`Cleared all attributes for ${selectedAttrCategory}`);
  };

  // ═══════════════════════════════ CATEGORY ACTIONS ═══════════════════════════════
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Enter a category name");
      return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const created = await res.json();
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      toast.success(`Category "${trimmed}" created!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleRenameCategory = async () => {
    if (!categoryToRename || !renameInput.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryToRename.id, name: renameInput.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryToRename.id ? { ...c, name: renameInput.trim() } : c))
      );
      setIsRenameOpen(false);
      setCategoryToRename(null);
      toast.success("Category renamed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeletingCat(true);
    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}&force=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      const catName = categoryToDelete.name;

      // Clean local categories
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));

      // Clean local size scales
      const updatedScales = { ...sizeScales };
      delete updatedScales[catName];
      setSizeScales(updatedScales);

      // Clean local attributes
      const updatedAttrs = { ...attributes };
      delete updatedAttrs[catName];
      setAttributes(updatedAttrs);

      // Clean local brands
      setBrands((prev) =>
        prev.map((b) => ({
          ...b,
          categories: b.categories.filter((c) => c !== catName),
        }))
      );

      toast.success(`Category "${catName}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCat(false);
      setIsDeleteCatOpen(false);
      setCategoryToDelete(null);
    }
  };

  /* ── Tag List Helper ── */
  const TagList = ({
    items,
    onRemove,
    color = "slate",
  }: {
    items: string[];
    onRemove: (item: string) => void;
    color?: string;
  }) => {
    const colorMap: Record<string, string> = {
      slate: "bg-slate-100 text-slate-700 border-slate-200",
      indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
      blue: "bg-blue-50 text-blue-700 border-blue-100",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return (
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${
              colorMap[color] || colorMap.slate
            }`}
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-current opacity-50 hover:opacity-100 hover:text-red-600 font-bold ml-0.5"
              title="Delete tag"
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-400 italic py-1">No options configured</span>}
      </div>
    );
  };

  /* ── Category Selector Helper ── */
  const CategorySelector = ({
    selected,
    onSelect,
    countFn,
  }: {
    selected: string;
    onSelect: (name: string) => void;
    countFn?: (name: string) => string;
  }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
          Select Category
        </label>
        <span className="text-[10px] text-slate-400">{categories.length} total</span>
      </div>
      <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.name)}
            className={`text-left text-xs px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors ${
              selected === c.name
                ? "bg-indigo-600 text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="truncate">{c.name}</span>
            {countFn && (
              <span className={`text-[10px] ml-2 shrink-0 ${selected === c.name ? "text-indigo-100" : "text-slate-400"}`}>
                {countFn(c.name)}
              </span>
            )}
          </button>
        ))}
        {categories.length === 0 && (
          <div className="text-xs text-slate-400 py-3 text-center">No categories yet</div>
        )}
      </div>
    </div>
  );

  const TABS = [
    { id: "brands" as const, label: "Brands", icon: Tag, count: brands.length },
    { id: "scales" as const, label: "Sizes", icon: Shirt },
    { id: "attributes" as const, label: "Attributes", icon: Layers },
    { id: "categories" as const, label: "Categories", icon: FolderPlus, count: categories.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 md:pt-8 pb-24 md:pb-12">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Settings & Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your store&apos;s custom brands, size scales, attributes, and categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1.5"
            onClick={loadData}
            disabled={loading}
          >
            <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
            Sync
          </Button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`py-2 px-3.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === id ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════ BRANDS TAB ═══════════════════════════════════════ */}
      {activeTab === "brands" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Add Brand */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Plus size={15} className="text-indigo-600" />
                Add Brand
              </h3>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Brand Name
                </label>
                <Input
                  placeholder="e.g. Zara, H&M, VIP, Jockey..."
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBrand();
                    }
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Assign Categories
                </label>
                <div className="border border-slate-200 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => setNewBrandCategories([])}
                    className={`w-full text-xs text-left p-1.5 rounded font-medium transition-colors ${
                      newBrandCategories.length === 0
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Universal (All Categories)
                  </button>
                  {categories.map((c) => {
                    const isChecked = newBrandCategories.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setNewBrandCategories((prev) =>
                            prev.includes(c.name) ? prev.filter((cat) => cat !== c.name) : [...prev, c.name]
                          )
                        }
                        className={`w-full text-xs text-left p-1.5 rounded flex items-center justify-between transition-colors ${
                          isChecked
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{c.name}</span>
                        {isChecked && <Check size={13} className="text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleAddBrand} className="w-full h-9 text-xs font-semibold gap-1.5">
                <Plus size={14} /> Add Brand
              </Button>
            </section>

            {brands.length > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-700">Clear Directory</div>
                  <div className="text-[11px] text-slate-400">Remove all {brands.length} brands</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsClearAllBrandsOpen(true)}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Right: Brand Directory */}
          <div className="lg:col-span-8 space-y-3">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <select
                value={brandCategoryFilter}
                onChange={(e) => setBrandCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories ({brands.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-400 px-1">
              Showing {filteredBrands.length} of {brands.length} brands
            </div>

            {/* Brands Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBrands.map((b) => (
                <div
                  key={b.name}
                  className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2 hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">{b.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.categories.includes("*") || b.categories.length === 0 ? (
                        <span className="text-[10px] text-slate-400">All categories</span>
                      ) : (
                        b.categories.slice(0, 3).map((cat) => (
                          <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {cat}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrand(b);
                        setEditBrandCategories(b.categories);
                        setIsEditDialogOpen(true);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBrandToDelete(b);
                        setIsDeleteBrandOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title={`Delete ${b.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredBrands.length === 0 && (
                <div className="sm:col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  No brands found. Use &quot;Add Brand&quot; on the left to add one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ SIZE SCALES TAB ═══════════════════════════════════════ */}
      {activeTab === "scales" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            <CategorySelector
              selected={selectedScaleCategory}
              onSelect={setSelectedScaleCategory}
              countFn={(name) => `${sizeScales[name]?.length || 0} scale${(sizeScales[name]?.length || 0) !== 1 ? "s" : ""}`}
            />

            {selectedScaleCategory && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadStarterScales}
                  className="w-full text-xs h-8 gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  <Sparkles size={13} />
                  Load Starter Sizes for {selectedScaleCategory}
                </Button>
                {currentCategoryScales.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearCategoryScales}
                    className="w-full text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Clear All Sizes
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {selectedScaleCategory || "Category"} <span className="text-slate-400 font-normal">sizes</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  These size scales will appear when auditing {selectedScaleCategory}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddScaleOpen(true)}
                disabled={!selectedScaleCategory}
                className="h-8 text-xs gap-1"
              >
                <Plus size={13} /> Add Scale
              </Button>
            </div>

            {currentCategoryScales.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                <p className="text-xs text-slate-500">
                  No size scales configured for <strong>{selectedScaleCategory}</strong>.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" onClick={() => setIsAddScaleOpen(true)} className="text-xs h-8">
                    <Plus size={13} className="mr-1" /> Add Custom Scale
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleLoadStarterScales} className="text-xs h-8 text-indigo-600">
                    <Sparkles size={13} className="mr-1" /> Load Recommended Sizes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentCategoryScales.map((scale) => (
                  <div key={scale.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-800">{scale.name}</span>
                        {scale.default && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium border border-emerald-200">
                            Default
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScale(scale.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Delete scale"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {scale.sizes.map((sz) => (
                          <span
                            key={sz}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <span>{sz}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeFromScale(scale.id, sz)}
                              className="text-slate-400 hover:text-red-500 font-bold ml-0.5"
                              title="Delete size"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {scale.sizes.length === 0 && (
                          <span className="text-xs text-slate-400 italic">No sizes in this scale</span>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <Input
                          placeholder="Add size (e.g. XL, 38)..."
                          value={scaleSizeInput[scale.id] || ""}
                          onChange={(e) => setScaleSizeInput((prev) => ({ ...prev, [scale.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSizeToScale(scale.id);
                            }
                          }}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSizeToScale(scale.id)}
                          className="h-8 text-xs px-3 shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ ATTRIBUTES TAB ═══════════════════════════════════════ */}
      {activeTab === "attributes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
            <CategorySelector
              selected={selectedAttrCategory}
              onSelect={setSelectedAttrCategory}
              countFn={(name) => `${Object.values(attributes[name] || {}).flat().length} tags`}
            />

            {selectedAttrCategory && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadStarterAttrs}
                  className="w-full text-xs h-8 gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  <Sparkles size={13} />
                  Load Starter Attributes for {selectedAttrCategory}
                </Button>
                {Object.values(currentCategoryAttrs).flat().length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearCategoryAttrs}
                    className="w-full text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Clear All Attributes
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {selectedAttrCategory || "Category"} <span className="text-slate-400 font-normal">attributes</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Only tags listed below will appear in the Audit screen for {selectedAttrCategory}.
                </p>
              </div>
            </div>

            {/* Attribute cards */}
            {(
              [
                { key: "subtypes" as const, label: "Subtypes (Brief, Trunk, Vest, Hoodie...)", color: "indigo", placeholder: "Add subtype..." },
                { key: "collars" as const, label: "Collar / Neck Styles", color: "blue", placeholder: "Add collar style..." },
                { key: "sleeves" as const, label: "Sleeve Options", color: "slate", placeholder: "Add sleeve..." },
                { key: "fabrics" as const, label: "Fabrics & Materials", color: "amber", placeholder: "Add fabric..." },
                { key: "patterns" as const, label: "Patterns & Prints", color: "slate", placeholder: "Add pattern..." },
                { key: "fits" as const, label: "Fit Types (Slim, Regular, Relaxed...)", color: "indigo", placeholder: "Add fit..." },
                { key: "borders" as const, label: "Borders & Edges (Kasavu, Kara...)", color: "amber", placeholder: "Add border style..." },
              ] as const
            ).map(({ key, label, color, placeholder }) => (
              <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">{label}</label>
                  {(currentCategoryAttrs[key] || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...attributes,
                          [selectedAttrCategory]: { ...currentCategoryAttrs, [key]: [] },
                        };
                        setAttributes(updated);
                        saveAllSettings(undefined, updated);
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <TagList
                  items={currentCategoryAttrs[key] || []}
                  onRemove={(tag) => handleRemoveAttributeTag(key, tag)}
                  color={color}
                />
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder={placeholder}
                    value={newAttrValue[key] || ""}
                    onChange={(e) => setNewAttrValue((prev) => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttributeTag(key);
                      }
                    }}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAttributeTag(key)}
                    className="h-7 text-xs px-3 shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ CATEGORIES TAB ═══════════════════════════════════════ */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <FolderPlus size={15} className="text-indigo-600" />
                New Category
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name (e.g. Hoodies, Blazers)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="h-9 text-xs"
                />
                <Button onClick={handleAddCategory} className="h-9 text-xs px-4 shrink-0 font-semibold">
                  Create
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Created categories immediately appear in Audit and can have custom brands, sizes, and attributes assigned.
              </p>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {categories.length} Categories Registered
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-sm text-slate-800 truncate">{c.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {c._count?.products || 0} styles recorded
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryToRename(c);
                        setRenameInput(c.name);
                        setIsRenameOpen(true);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryToDelete(c);
                        setIsDeleteCatOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title={`Delete ${c.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="sm:col-span-2 text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  No categories registered. Create your first category above.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOGS ── */}

      {/* Edit Brand Categories Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Edit Brand: {editingBrand?.name}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select which garment categories this brand appears under in the Audit screen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <button
              type="button"
              onClick={() => setEditBrandCategories((prev) => (prev.includes("*") ? [] : ["*"]))}
              className={`w-full text-xs text-left p-2.5 rounded-lg border font-medium transition-all ${
                editBrandCategories.includes("*")
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              All Categories (Universal)
            </button>
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {categories.map((c) => {
                const isChecked = editBrandCategories.includes(c.name);
                return (
                  <label
                    key={c.id}
                    onClick={() => {
                      setEditBrandCategories((prev) => {
                        const clean = prev.filter((p) => p !== "*");
                        return clean.includes(c.name) ? clean.filter((p) => p !== c.name) : [...clean, c.name];
                      });
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{c.name}</span>
                    {isChecked ? (
                      <CheckCircle2 size={15} className="text-indigo-600" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-300" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEditBrand} className="text-xs">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Dialog */}
      <Dialog open={isDeleteBrandOpen} onOpenChange={setIsDeleteBrandOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 size={16} /> Delete Brand?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong>&quot;{brandToDelete?.name}&quot;</strong>? It will no
              longer appear in suggestions or refresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteBrandOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmDeleteBrand} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
              Delete Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Brands Dialog */}
      <Dialog open={isClearAllBrandsOpen} onOpenChange={setIsClearAllBrandsOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle size={16} /> Clear All Brands?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              This will permanently delete all {brands.length} brands from your directory. You can start completely fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearAllBrandsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleClearAllBrands} className="bg-rose-600 hover:bg-rose-700 text-white text-xs">
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Scale Dialog */}
      <Dialog open={isAddScaleOpen} onOpenChange={setIsAddScaleOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Size Scale</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              For <strong>{selectedScaleCategory}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Scale Name</label>
              <Input
                placeholder="e.g. Adults (75 - 100), Kids (50 - 75), Free Size"
                value={newScaleName}
                onChange={(e) => setNewScaleName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sizes (comma or space separated)</label>
              <Input
                placeholder="e.g. 75, 80, 85, 90, 95, 100"
                value={newScaleSizesInput}
                onChange={(e) => setNewScaleSizesInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddScaleOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddScaleToCategory} className="text-xs">
              Add Scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Category Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="h-9 text-xs"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRenameCategory} className="text-xs">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteCatOpen} onOpenChange={setIsDeleteCatOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Category?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete <strong>&quot;{categoryToDelete?.name}&quot;</strong>?
              {(categoryToDelete?._count?.products || 0) > 0 && (
                <span className="block mt-1.5 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                  Warning: {categoryToDelete?._count?.products} product style(s) are attached to this category and will
                  be removed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteCatOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDeleteCategory}
              disabled={deletingCat}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
            >
              {deletingCat ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
