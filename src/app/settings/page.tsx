"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Tag,
  SlidersHorizontal,
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
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import {
  DEFAULT_CATEGORY_SIZE_SCALES,
  DEFAULT_CATEGORY_ATTRIBUTES,
} from "../../../scripts/seed-store-data";

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"brands" | "scales" | "attributes" | "categories">("brands");

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [sizeScales, setSizeScales] = useState<SizeScalesMap>(DEFAULT_CATEGORY_SIZE_SCALES);
  const [attributes, setAttributes] = useState<AttributesMap>(DEFAULT_CATEGORY_ATTRIBUTES);
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

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Categories
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
        if (catData.length > 0) {
          if (!selectedScaleCategory) setSelectedScaleCategory(catData[0].name);
          if (!selectedAttrCategory) setSelectedAttrCategory(catData[0].name);
        }
      }

      // 2. Brands
      const brandRes = await fetch("/api/brands");
      if (brandRes.ok) {
        const brandData: (BrandItem | string)[] = await brandRes.json();
        const formatted: BrandItem[] = brandData.map((b) => {
          if (typeof b === "string") return { name: b, categories: ["*"] };
          return {
            id: b.id,
            name: b.name,
            categories: b.categories || ["*"],
          };
        });
        setBrands(formatted);
      }

      // 3. Store Settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.sizeScales && Object.keys(settingsData.sizeScales).length > 0) {
          setSizeScales(settingsData.sizeScales);
        }
        if (settingsData.attributes && Object.keys(settingsData.attributes).length > 0) {
          setAttributes(settingsData.attributes);
        }
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
      toast.error("Could not load latest store settings from cloud");
    } finally {
      setLoading(false);
    }
  }, [selectedScaleCategory, selectedAttrCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set default category selections once categories load
  useEffect(() => {
    if (categories.length > 0) {
      if (!selectedScaleCategory) {
        const innerwear = categories.find((c) => c.name.toLowerCase().includes("innerwear"));
        setSelectedScaleCategory(innerwear ? innerwear.name : categories[0].name);
      }
      if (!selectedAttrCategory) {
        const tshirt = categories.find((c) => c.name.toLowerCase().includes("t-shirt") || c.name.toLowerCase().includes("shirt"));
        setSelectedAttrCategory(tshirt ? tshirt.name : categories[0].name);
      }
    }
  }, [categories, selectedScaleCategory, selectedAttrCategory]);

  // Save Settings to Backend
  const saveAllSettings = async (
    updatedScales?: SizeScalesMap,
    updatedAttrs?: AttributesMap
  ) => {
    setSaving(true);
    try {
      const payload: { sizeScales?: SizeScalesMap; attributes?: AttributesMap } = {};
      if (updatedScales) payload.sizeScales = updatedScales;
      if (updatedAttrs) payload.attributes = updatedAttrs;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings to server");

      // Also persist to localStorage for instant offline access
      if (updatedScales) {
        localStorage.setItem("zain_category_size_scales", JSON.stringify(updatedScales));
      }
      if (updatedAttrs) {
        localStorage.setItem("zain_category_attributes", JSON.stringify(updatedAttrs));
      }

      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  // --- BRAND MANAGEMENT ---
  const handleAddBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      toast.error("Please enter a brand name");
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

      if (!res.ok) throw new Error("Failed to save brand");
      const saved = await res.json();

      setBrands((prev) => {
        const existingIdx = prev.findIndex((b) => b.name.toLowerCase() === trimmed.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], categories: saved.categories || ["*"] };
          return updated;
        }
        return [...prev, { id: saved.id, name: trimmed, categories: saved.categories || ["*"] }].sort(
          (a, b) => a.name.localeCompare(b.name)
        );
      });

      setNewBrandName("");
      setNewBrandCategories([]);
      toast.success(`Brand "${trimmed}" saved with category assignments!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add brand");
    }
  };

  const handleDeleteBrand = async (brand: BrandItem) => {
    if (!confirm(`Are you sure you want to delete brand "${brand.name}"?`)) return;

    try {
      const url = brand.id ? `/api/brands?id=${brand.id}` : `/api/brands?name=${encodeURIComponent(brand.name)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");

      setBrands((prev) => prev.filter((b) => b.name !== brand.name));
      toast.success(`Brand "${brand.name}" removed`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove brand");
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

      if (!res.ok) throw new Error("Failed to update brand categories");

      setBrands((prev) =>
        prev.map((b) =>
          b.name === editingBrand.name ? { ...b, categories: editBrandCategories } : b
        )
      );

      setIsEditDialogOpen(false);
      setEditingBrand(null);
      toast.success(`Updated categories for ${editingBrand.name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update brand");
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

  // --- SIZE SCALE MANAGEMENT ---
  const currentCategoryScales: SizeScale[] = useMemo(() => {
    if (!selectedScaleCategory) return [];
    return sizeScales[selectedScaleCategory] || [
      {
        id: "default_alpha",
        name: "Standard Alpha (S - 3XL)",
        sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
        default: true,
      },
    ];
  }, [sizeScales, selectedScaleCategory]);

  const handleAddScaleToCategory = () => {
    const trimmedName = newScaleName.trim();
    if (!trimmedName || !selectedScaleCategory) {
      toast.error("Please provide a scale name");
      return;
    }

    const sizes = newScaleSizesInput
      .split(/[, ]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sizes.length === 0) {
      toast.error("Please enter at least one size value (e.g. 50, 55, 60)");
      return;
    }

    const newScale: SizeScale = {
      id: "scale_" + Math.random().toString(36).substring(2, 9),
      name: trimmedName,
      sizes,
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
    toast.success(`Added scale "${trimmedName}" to ${selectedScaleCategory}`);
  };

  const handleRemoveScale = (scaleId: string) => {
    if (!selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    if (existing.length <= 1) {
      toast.error("A category must have at least one size scale");
      return;
    }

    const updatedCategoryScales = existing.filter((s) => s.id !== scaleId);
    const updated = {
      ...sizeScales,
      [selectedScaleCategory]: updatedCategoryScales,
    };

    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    toast.success("Size scale removed");
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

    const updated = {
      ...sizeScales,
      [selectedScaleCategory]: updatedCategoryScales,
    };

    setSizeScales(updated);
    setScaleSizeInput((prev) => ({ ...prev, [scaleId]: "" }));
    saveAllSettings(updated, undefined);
  };

  const handleRemoveSizeFromScale = (scaleId: string, sizeToRemove: string) => {
    if (!selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    const updatedCategoryScales = existing.map((s) => {
      if (s.id === scaleId) {
        return { ...s, sizes: s.sizes.filter((sz) => sz !== sizeToRemove) };
      }
      return s;
    });

    const updated = {
      ...sizeScales,
      [selectedScaleCategory]: updatedCategoryScales,
    };

    setSizeScales(updated);
    saveAllSettings(updated, undefined);
  };

  // --- ATTRIBUTE MANAGEMENT ---
  const currentCategoryAttrs: CategoryAttributes = useMemo(() => {
    if (!selectedAttrCategory) return {};
    return attributes[selectedAttrCategory] || {};
  }, [attributes, selectedAttrCategory]);

  const handleAddAttributeTag = (attrType: keyof CategoryAttributes) => {
    const val = (newAttrValue[attrType] || "").trim();
    if (!val || !selectedAttrCategory) return;

    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];

    if (currentList.includes(val)) {
      toast.error(`"${val}" already exists in ${String(attrType)}`);
      return;
    }

    const updatedCatAttrs: CategoryAttributes = {
      ...currentCatAttrs,
      [attrType]: [...currentList, val],
    };

    const updated = {
      ...attributes,
      [selectedAttrCategory]: updatedCatAttrs,
    };

    setAttributes(updated);
    setNewAttrValue((prev) => ({ ...prev, [attrType]: "" }));
    saveAllSettings(undefined, updated);
  };

  const handleRemoveAttributeTag = (attrType: keyof CategoryAttributes, tag: string) => {
    if (!selectedAttrCategory) return;
    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];

    const updatedCatAttrs: CategoryAttributes = {
      ...currentCatAttrs,
      [attrType]: currentList.filter((t) => t !== tag),
    };

    const updated = {
      ...attributes,
      [selectedAttrCategory]: updatedCatAttrs,
    };

    setAttributes(updated);
    saveAllSettings(undefined, updated);
  };

  // --- CATEGORY MANAGEMENT ---
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
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
        throw new Error(err.error || "Failed to add category");
      }

      const created = await res.json();
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      toast.success(`Category "${trimmed}" created!`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add category");
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
        throw new Error(err.error || "Failed to rename category");
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === categoryToRename.id ? { ...c, name: renameInput.trim() } : c))
      );

      setIsRenameOpen(false);
      setCategoryToRename(null);
      toast.success("Category renamed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to rename category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete category");
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setIsDeleteCatOpen(false);
      setCategoryToDelete(null);
      toast.success("Category deleted");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
                <SlidersHorizontal size={18} />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Catalog & Store Settings
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage brands by category, size scales & garment attributes
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
            onClick={loadData}
            disabled={loading}
          >
            <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
            Sync
          </Button>
        </div>

        {/* Tab Bar */}
        <div className="max-w-2xl mx-auto mt-3 flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("brands")}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "brands"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag size={13} />
            <span>Brands</span>
          </button>

          <button
            onClick={() => setActiveTab("scales")}
            className={`flex-1 min-w-[100px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "scales"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shirt size={13} />
            <span>Size Scales</span>
          </button>

          <button
            onClick={() => setActiveTab("attributes")}
            className={`flex-1 min-w-[95px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "attributes"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={13} />
            <span>Attributes</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 min-w-[95px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "categories"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderPlus size={13} />
            <span>Categories</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* =========================================================================
            TAB 1: BRANDS BY CATEGORY
        ========================================================================= */}
        {activeTab === "brands" && (
          <div className="space-y-4">
            {/* Quick Info Box */}
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-900">
              <HelpCircle size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Category-Smart Brands:</span> When you audit a category (e.g. <em>Innerwears</em> or <em>Mundus</em>), only brands assigned to that category appear as suggestions and quick-tap pills!
              </div>
            </div>

            {/* Add Brand Card */}
            <Card className="border-slate-200/90 shadow-sm bg-white">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Plus size={16} className="text-indigo-600" />
                  Add New Brand / Company
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enter brand name and choose the categories it belongs to
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Chromozome, Dollar, Puma..."
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="h-10 text-sm bg-white"
                  />
                  <Button
                    onClick={handleAddBrand}
                    className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 shrink-0"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Brand
                  </Button>
                </div>

                {/* Categories selector pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      Assign Categories:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewBrandCategories((prev) =>
                          prev.length === categories.length ? [] : categories.map((c) => c.name)
                        )
                      }
                      className="text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      {newBrandCategories.length === categories.length ? "Clear All" : "Select All"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (newBrandCategories.includes("*")) {
                          setNewBrandCategories([]);
                        } else {
                          setNewBrandCategories(["*"]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                        newBrandCategories.includes("*")
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ★ Universal (All Categories)
                    </button>
                    {categories.map((c) => {
                      const isSelected = newBrandCategories.includes(c.name);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewBrandCategories((prev) => {
                              const withoutUniversal = prev.filter((p) => p !== "*");
                              if (withoutUniversal.includes(c.name)) {
                                return withoutUniversal.filter((p) => p !== c.name);
                              }
                              return [...withoutUniversal, c.name];
                            });
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected && <Check size={11} className="inline mr-1" />}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filter and Search Bar */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Search brands..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="pl-8 h-9 text-xs bg-white border-slate-200"
                  />
                </div>
                <select
                  value={brandCategoryFilter}
                  onChange={(e) => setBrandCategoryFilter(e.target.value)}
                  className="h-9 text-xs px-3 rounded-md bg-white border border-slate-200 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Categories ({brands.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-500 px-1">
                Showing {filteredBrands.length} of {brands.length} brands
              </div>
            </div>

            {/* Brands List */}
            <div className="space-y-2">
              {filteredBrands.map((b) => (
                <div
                  key={b.name}
                  className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{b.name}</span>
                      {b.categories.includes("*") && (
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 font-normal">
                          All Categories
                        </Badge>
                      )}
                    </div>
                    {!b.categories.includes("*") && (
                      <div className="flex flex-wrap gap-1">
                        {b.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-100"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingBrand(b);
                        setEditBrandCategories(b.categories);
                        setIsEditDialogOpen(true);
                      }}
                      className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBrand(b)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}

              {filteredBrands.length === 0 && (
                <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No brands match the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: CATEGORY SIZE SCALES & NUMBER ATTRIBUTES
        ========================================================================= */}
        {activeTab === "scales" && (
          <div className="space-y-4">
            {/* Category Selector */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Select Category to Configure Sizes:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const isSelected = selectedScaleCategory === c.name;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedScaleCategory(c.name)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Scale Management for Selected Category */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Size Scales for: <span className="text-indigo-600">{selectedScaleCategory}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  E.g., Innerwears: Adults (75-100), Kids (50-75); Mundus: Single/Double
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddScaleOpen(true)}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Plus size={13} className="mr-1" />
                Add Scale
              </Button>
            </div>

            {/* Size Scales List */}
            <div className="space-y-3">
              {currentCategoryScales.map((scale) => (
                <Card key={scale.id} className="border-slate-200 bg-white shadow-xs">
                  <CardHeader className="py-2.5 px-4 bg-slate-50/80 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{scale.name}</span>
                      {scale.default && (
                        <Badge variant="outline" className="text-[10px] h-4 text-emerald-700 bg-emerald-50 border-emerald-200">
                          Default
                        </Badge>
                      )}
                    </div>
                    {currentCategoryScales.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveScale(scale.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-3 space-y-2.5">
                    {/* Size Chips */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {scale.sizes.map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          {sz}
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeFromScale(scale.id, sz)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      {scale.sizes.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No sizes defined</span>
                      )}
                    </div>

                    {/* Quick Add Size to Scale */}
                    <div className="flex gap-1.5 max-w-xs pt-1">
                      <Input
                        placeholder="Add size (e.g. 110, 52, 4XL)"
                        value={scaleSizeInput[scale.id] || ""}
                        onChange={(e) =>
                          setScaleSizeInput((prev) => ({
                            ...prev,
                            [scale.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSizeToScale(scale.id);
                          }
                        }}
                        className="h-8 text-xs bg-white"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddSizeToScale(scale.id)}
                        className="h-8 text-xs font-medium px-2.5 shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => saveAllSettings(sizeScales, undefined)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
              >
                <Save size={14} className="mr-1.5" />
                {saving ? "Saving..." : "Save Size Scales to Cloud"}
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: GARMENT ATTRIBUTES (COLLARS, SLEEVES, HOODIES, SUBTYPES)
        ========================================================================= */}
        {activeTab === "attributes" && (
          <div className="space-y-4">
            {/* Category Selector */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Select Category to Configure Attributes:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const isSelected = selectedAttrCategory === c.name;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedAttrCategory(c.name)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-slate-500">
              Configuring attributes for <strong className="text-slate-800">{selectedAttrCategory}</strong>. These attributes (such as Hooded collars, Brief/Trunk subtypes, Sleeves) dynamically appear in the Audit screen.
            </div>

            {/* Innerwears Subtypes (Brief, Trunk, Vest, Drawer) */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Subtypes / Garment Cuts (e.g. Brief, Trunk, Vest, Boxer Brief)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(currentCategoryAttrs.subtypes || []).map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-100"
                    >
                      {st}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeTag("subtypes", st)}
                        className="text-indigo-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!currentCategoryAttrs.subtypes || currentCategoryAttrs.subtypes.length === 0) && (
                    <span className="text-xs text-slate-400 italic">None configured</span>
                  )}
                </div>
                <div className="flex gap-1.5 max-w-sm pt-1">
                  <Input
                    placeholder="Add subtype (e.g. Drawer, Gym Vest)"
                    value={newAttrValue["subtypes"] || ""}
                    onChange={(e) =>
                      setNewAttrValue((prev) => ({ ...prev, subtypes: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttributeTag("subtypes");
                      }
                    }}
                    className="h-8 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAttributeTag("subtypes")}
                    className="h-8 text-xs px-3"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Neck / Collar Types (Polo, Round Neck, Hooded/Hoodie, etc.) */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Collar / Neck Styles (e.g. Polo / Collar, Round Neck, Hooded / Hoodie, V-Neck)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(currentCategoryAttrs.collars || []).map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-100"
                    >
                      {col}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeTag("collars", col)}
                        className="text-blue-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!currentCategoryAttrs.collars || currentCategoryAttrs.collars.length === 0) && (
                    <span className="text-xs text-slate-400 italic">None configured</span>
                  )}
                </div>
                <div className="flex gap-1.5 max-w-sm pt-1">
                  <Input
                    placeholder="Add collar style (e.g. Hooded, Henley)"
                    value={newAttrValue["collars"] || ""}
                    onChange={(e) =>
                      setNewAttrValue((prev) => ({ ...prev, collars: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttributeTag("collars");
                      }
                    }}
                    className="h-8 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAttributeTag("collars")}
                    className="h-8 text-xs px-3"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sleeves */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Sleeve Options (e.g. Full Sleeve, Half Sleeve, Sleeveless)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(currentCategoryAttrs.sleeves || []).map((slv) => (
                    <span
                      key={slv}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {slv}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeTag("sleeves", slv)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!currentCategoryAttrs.sleeves || currentCategoryAttrs.sleeves.length === 0) && (
                    <span className="text-xs text-slate-400 italic">None configured</span>
                  )}
                </div>
                <div className="flex gap-1.5 max-w-sm pt-1">
                  <Input
                    placeholder="Add sleeve (e.g. Roll-up Sleeve)"
                    value={newAttrValue["sleeves"] || ""}
                    onChange={(e) =>
                      setNewAttrValue((prev) => ({ ...prev, sleeves: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttributeTag("sleeves");
                      }
                    }}
                    className="h-8 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAttributeTag("sleeves")}
                    className="h-8 text-xs px-3"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fabrics */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900">
                  Fabrics & Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(currentCategoryAttrs.fabrics || []).map((fab) => (
                    <span
                      key={fab}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {fab}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttributeTag("fabrics", fab)}
                        className="text-amber-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(!currentCategoryAttrs.fabrics || currentCategoryAttrs.fabrics.length === 0) && (
                    <span className="text-xs text-slate-400 italic">None configured</span>
                  )}
                </div>
                <div className="flex gap-1.5 max-w-sm pt-1">
                  <Input
                    placeholder="Add fabric (e.g. Bamboo Cotton)"
                    value={newAttrValue["fabrics"] || ""}
                    onChange={(e) =>
                      setNewAttrValue((prev) => ({ ...prev, fabrics: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttributeTag("fabrics");
                      }
                    }}
                    className="h-8 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddAttributeTag("fabrics")}
                    className="h-8 text-xs px-3"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => saveAllSettings(undefined, attributes)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
              >
                <Save size={14} className="mr-1.5" />
                {saving ? "Saving..." : "Save Attributes to Cloud"}
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: CATEGORIES MANAGER
        ========================================================================= */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            {/* Add Category */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FolderPlus size={16} className="text-indigo-600" />
                  Add New Store Category
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Create high-level sections (e.g. Blazers, Nightwear, Boys Ethnic)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex gap-2">
                  <Input
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-10 text-sm bg-white"
                  />
                  <Button
                    onClick={handleAddCategory}
                    className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 shrink-0"
                  >
                    <Plus size={14} className="mr-1" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Categories List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 px-1">
                Active Store Categories ({categories.length})
              </div>

              {categories.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900">{c.name}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c._count?.products || 0} product style(s) recorded
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCategoryToRename(c);
                        setRenameInput(c.name);
                        setIsRenameOpen(true);
                      }}
                      className="h-8 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCategoryToDelete(c);
                        setIsDeleteCatOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- DIALOGS --- */}

      {/* 1. Edit Brand Categories Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Edit Categories for {editingBrand?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select which categories show this brand as an auto-suggestion.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <button
              type="button"
              onClick={() => {
                if (editBrandCategories.includes("*")) {
                  setEditBrandCategories([]);
                } else {
                  setEditBrandCategories(["*"]);
                }
              }}
              className={`w-full text-xs text-left p-2.5 rounded-lg border font-medium transition-all ${
                editBrandCategories.includes("*")
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              ★ Universal Brand (Applies to all categories)
            </button>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pt-1">
              {categories.map((c) => {
                const isChecked = editBrandCategories.includes(c.name);
                return (
                  <label
                    key={c.id}
                    onClick={() => {
                      setEditBrandCategories((prev) => {
                        const clean = prev.filter((p) => p !== "*");
                        if (clean.includes(c.name)) {
                          return clean.filter((p) => p !== c.name);
                        }
                        return [...clean, c.name];
                      });
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? "bg-indigo-50/70 border-indigo-200 text-indigo-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{c.name}</span>
                    {isChecked ? (
                      <CheckCircle2 size={16} className="text-indigo-600" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-slate-300" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEditBrand}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Save Brand Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Add Size Scale Dialog */}
      <Dialog open={isAddScaleOpen} onOpenChange={setIsAddScaleOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Add New Size Scale to {selectedScaleCategory}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a scale name and initial sizes (comma or space separated).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Scale Label / Name:
              </label>
              <Input
                placeholder="e.g. Kids (50 - 75 cm) or Numeric Waist (28 - 40)"
                value={newScaleName}
                onChange={(e) => setNewScaleName(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Size Values (Comma-separated):
              </label>
              <Input
                placeholder="e.g. 50, 55, 60, 65, 70, 75"
                value={newScaleSizesInput}
                onChange={(e) => setNewScaleSizesInput(e.target.value)}
                className="h-9 text-xs bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                You can add or remove individual sizes at any time.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddScaleOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddScaleToCategory}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Add Scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Rename Category Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Rename Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRenameCategory} className="bg-indigo-600 text-white text-xs">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Category Confirmation Dialog */}
      <Dialog open={isDeleteCatOpen} onOpenChange={setIsDeleteCatOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600">
              Delete Category?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete category &quot;{categoryToDelete?.name}&quot;? Categories with existing product styles cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteCatOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
