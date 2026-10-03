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
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
        if (catData.length > 0) {
          if (!selectedScaleCategory) setSelectedScaleCategory(catData[0].name);
          if (!selectedAttrCategory) setSelectedAttrCategory(catData[0].name);
        }
      }

      const brandRes = await fetch("/api/brands");
      if (brandRes.ok) {
        const brandData: (BrandItem | string)[] = await brandRes.json();
        const formatted: BrandItem[] = brandData.map((b) => {
          if (typeof b === "string") return { name: b, categories: ["*"] };
          return { id: b.id, name: b.name, categories: b.categories || ["*"] };
        });
        setBrands(formatted);
      }

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
      toast.error("Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [selectedScaleCategory, selectedAttrCategory]);

  useEffect(() => { loadData(); }, [loadData]);

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
  const saveAllSettings = async (updatedScales?: SizeScalesMap, updatedAttrs?: AttributesMap) => {
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
      if (!res.ok) throw new Error("Failed to save");

      if (updatedScales) localStorage.setItem("zain_category_size_scales", JSON.stringify(updatedScales));
      if (updatedAttrs) localStorage.setItem("zain_category_attributes", JSON.stringify(updatedAttrs));
      toast.success("Saved!");
    } catch { toast.error("Error saving"); } finally { setSaving(false); }
  };

  // BRAND MANAGEMENT
  const handleAddBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) { toast.error("Enter a brand name"); return; }
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, categories: newBrandCategories.length > 0 ? newBrandCategories : ["*"] }),
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
        return [...prev, { id: saved.id, name: trimmed, categories: saved.categories || ["*"] }].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewBrandName("");
      setNewBrandCategories([]);
      toast.success(`Brand "${trimmed}" saved!`);
    } catch { toast.error("Failed to add brand"); }
  };

  const handleDeleteBrand = async (brand: BrandItem) => {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    try {
      const url = `/api/brands?id=${brand.id || ""}&name=${encodeURIComponent(brand.name)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setBrands((prev) => prev.filter((b) => b.name !== brand.name));
      toast.success(`"${brand.name}" deleted`);
    } catch { toast.error("Failed to delete"); }
  };

  const handleSaveEditBrand = async () => {
    if (!editingBrand) return;
    try {
      const res = await fetch("/api/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingBrand.id, name: editingBrand.name, categories: editBrandCategories.length > 0 ? editBrandCategories : ["*"] }),
      });
      if (!res.ok) throw new Error("Failed");
      setBrands((prev) => prev.map((b) => b.name === editingBrand.name ? { ...b, categories: editBrandCategories } : b));
      setIsEditDialogOpen(false);
      setEditingBrand(null);
      toast.success(`Updated ${editingBrand.name}`);
    } catch { toast.error("Failed to update"); }
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

  // SIZE SCALE MANAGEMENT
  const currentCategoryScales: SizeScale[] = useMemo(() => {
    if (!selectedScaleCategory) return [];
    return sizeScales[selectedScaleCategory] || [{ id: "default_alpha", name: "Standard (S - 3XL)", sizes: ["S", "M", "L", "XL", "XXL", "3XL"], default: true }];
  }, [sizeScales, selectedScaleCategory]);

  const handleAddScaleToCategory = () => {
    const trimmedName = newScaleName.trim();
    if (!trimmedName || !selectedScaleCategory) { toast.error("Provide a scale name"); return; }
    const sizes = newScaleSizesInput.split(/[, ]+/).map((s) => s.trim()).filter(Boolean);
    if (sizes.length === 0) { toast.error("Enter at least one size"); return; }
    const newScale: SizeScale = { id: "scale_" + Math.random().toString(36).substring(2, 9), name: trimmedName, sizes };
    const updated = { ...sizeScales, [selectedScaleCategory]: [...(sizeScales[selectedScaleCategory] || []), newScale] };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
    setNewScaleName(""); setNewScaleSizesInput(""); setIsAddScaleOpen(false);
    toast.success(`Added "${trimmedName}"`);
  };

  const handleRemoveScale = (scaleId: string) => {
    if (!selectedScaleCategory) return;
    const existing = sizeScales[selectedScaleCategory] || [];
    if (existing.length <= 1) { toast.error("Must keep at least one scale"); return; }
    const updated = { ...sizeScales, [selectedScaleCategory]: existing.filter((s) => s.id !== scaleId) };
    setSizeScales(updated);
    saveAllSettings(updated, undefined);
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

  // ATTRIBUTE MANAGEMENT
  const currentCategoryAttrs: CategoryAttributes = useMemo(() => {
    if (!selectedAttrCategory) return {};
    return attributes[selectedAttrCategory] || {};
  }, [attributes, selectedAttrCategory]);

  const handleAddAttributeTag = (attrType: keyof CategoryAttributes) => {
    const val = (newAttrValue[attrType] || "").trim();
    if (!val || !selectedAttrCategory) return;
    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];
    if (currentList.includes(val)) { toast.error(`"${val}" already exists`); return; }
    const updated = { ...attributes, [selectedAttrCategory]: { ...currentCatAttrs, [attrType]: [...currentList, val] } };
    setAttributes(updated);
    setNewAttrValue((prev) => ({ ...prev, [attrType]: "" }));
    saveAllSettings(undefined, updated);
  };

  const handleRemoveAttributeTag = (attrType: keyof CategoryAttributes, tag: string) => {
    if (!selectedAttrCategory) return;
    const currentCatAttrs = attributes[selectedAttrCategory] || {};
    const currentList = currentCatAttrs[attrType] || [];
    const updated = { ...attributes, [selectedAttrCategory]: { ...currentCatAttrs, [attrType]: currentList.filter((t) => t !== tag) } };
    setAttributes(updated);
    saveAllSettings(undefined, updated);
  };

  // CATEGORY MANAGEMENT
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) { toast.error("Enter a category name"); return; }
    try {
      const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      const created = await res.json();
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      toast.success(`"${trimmed}" created!`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const handleRenameCategory = async () => {
    if (!categoryToRename || !renameInput.trim()) return;
    try {
      const res = await fetch("/api/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: categoryToRename.id, name: renameInput.trim() }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      setCategories((prev) => prev.map((c) => (c.id === categoryToRename.id ? { ...c, name: renameInput.trim() } : c)));
      setIsRenameOpen(false);
      setCategoryToRename(null);
      toast.success("Renamed!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setIsDeleteCatOpen(false);
      setCategoryToDelete(null);
      toast.success("Deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  /* ── Tag List Helper ── */
  const TagList = ({ items, onRemove, color = "slate" }: { items: string[]; onRemove: (item: string) => void; color?: string }) => {
    const colorMap: Record<string, string> = {
      slate: "bg-slate-100 text-slate-700 border-slate-200",
      indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
      blue: "bg-blue-50 text-blue-700 border-blue-100",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return (
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {items.map((item) => (
          <span key={item} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${colorMap[color] || colorMap.slate}`}>
            {item}
            <button type="button" onClick={() => onRemove(item)} className="text-current opacity-40 hover:opacity-100 hover:text-red-600">×</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-400 italic">None</span>}
      </div>
    );
  };

  /* ── Category Selector Helper ── */
  const CategorySelector = ({ selected, onSelect, countFn }: { selected: string; onSelect: (name: string) => void; countFn?: (name: string) => string }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.name)}
            className={`text-left text-xs px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors ${
              selected === c.name
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{c.name}</span>
            {countFn && <span className="text-[10px] text-slate-400">{countFn(c.name)}</span>}
          </button>
        ))}
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
          <h1 className="text-lg font-bold text-slate-900">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Brands, sizes & garment attributes</p>
        </div>
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
      </header>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`py-2 px-3.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {label}
            {count !== undefined && (
              <span className={`text-[10px] ${activeTab === id ? "text-indigo-600" : "text-slate-400"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════ BRANDS TAB ═══════════════════════════════════════ */}
      {activeTab === "brands" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Add Brand */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Plus size={15} className="text-indigo-600" />
                Add Brand
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Brand name..."
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBrand(); } }}
                  className="h-9 text-xs"
                />
                <Button onClick={handleAddBrand} className="h-9 text-xs px-4 shrink-0">
                  Add
                </Button>
              </div>

              {/* Category assignment */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Assign to categories
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setNewBrandCategories((prev) => prev.includes("*") ? [] : ["*"])}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                      newBrandCategories.includes("*")
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => {
                    const isSelected = newBrandCategories.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setNewBrandCategories((prev) => {
                            const clean = prev.filter((p) => p !== "*");
                            return clean.includes(c.name) ? clean.filter((p) => p !== c.name) : [...clean, c.name];
                          });
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        {isSelected && <Check size={10} className="inline mr-0.5" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Brand List */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search + Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <select
                value={brandCategoryFilter}
                onChange={(e) => setBrandCategoryFilter(e.target.value)}
                className="h-9 text-xs px-3 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All ({brands.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-400 px-1">
              {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""}
            </div>

            {/* Brands Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredBrands.map((b) => (
                <div
                  key={b.name}
                  className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">{b.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.categories.includes("*") ? (
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
                      onClick={() => { setEditingBrand(b); setEditBrandCategories(b.categories); setIsEditDialogOpen(true); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(b)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredBrands.length === 0 && (
                <div className="sm:col-span-2 text-center py-8 text-slate-400 text-xs">
                  No brands found
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
              countFn={(name) => `${sizeScales[name]?.length || 1} scale${(sizeScales[name]?.length || 1) !== 1 ? "s" : ""}`}
            />
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {selectedScaleCategory} <span className="text-slate-400 font-normal">sizes</span>
              </h2>
              <Button size="sm" onClick={() => setIsAddScaleOpen(true)} className="h-8 text-xs gap-1">
                <Plus size={13} /> Add Scale
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentCategoryScales.map((scale) => (
                <div key={scale.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800">{scale.name}</span>
                      {scale.default && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium border border-emerald-200">
                          Default
                        </span>
                      )}
                    </div>
                    {currentCategoryScales.length > 1 && (
                      <button onClick={() => handleRemoveScale(scale.id)} className="p-1 text-slate-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div className="flex flex-wrap gap-1">
                      {scale.sizes.map((sz) => (
                        <span key={sz} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {sz}
                          <button onClick={() => handleRemoveSizeFromScale(scale.id, sz)} className="text-slate-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Add size..."
                        value={scaleSizeInput[scale.id] || ""}
                        onChange={(e) => setScaleSizeInput((prev) => ({ ...prev, [scale.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSizeToScale(scale.id); } }}
                        className="h-7 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleAddSizeToScale(scale.id)} className="h-7 text-xs px-2.5">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          </div>

          <div className="lg:col-span-8 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedAttrCategory} <span className="text-slate-400 font-normal">attributes</span>
            </h2>

            {/* Attribute cards */}
            {([
              { key: "subtypes" as const, label: "Subtypes (Brief, Trunk, Vest...)", color: "indigo", placeholder: "Add subtype..." },
              { key: "collars" as const, label: "Collar / Neck Styles", color: "blue", placeholder: "Add collar style..." },
              { key: "sleeves" as const, label: "Sleeve Options", color: "slate", placeholder: "Add sleeve..." },
              { key: "fabrics" as const, label: "Fabrics & Materials", color: "amber", placeholder: "Add fabric..." },
              { key: "patterns" as const, label: "Patterns", color: "slate", placeholder: "Add pattern..." },
              { key: "borders" as const, label: "Borders (Kasavu)", color: "amber", placeholder: "Add border style..." },
            ] as const).map(({ key, label, color, placeholder }) => (
              <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-semibold text-slate-700">{label}</label>
                <TagList items={currentCategoryAttrs[key] || []} onRemove={(tag) => handleRemoveAttributeTag(key, tag)} color={color} />
                <div className="flex gap-1.5">
                  <Input
                    placeholder={placeholder}
                    value={newAttrValue[key] || ""}
                    onChange={(e) => setNewAttrValue((prev) => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddAttributeTag(key); } }}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleAddAttributeTag(key)} className="h-7 text-xs px-2.5">
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
            <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <FolderPlus size={15} className="text-indigo-600" />
                New Category
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  className="h-9 text-xs"
                />
                <Button onClick={handleAddCategory} className="h-9 text-xs px-4 shrink-0">
                  Create
                </Button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {categories.length} Categories
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between hover:border-slate-300 transition-all">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{c.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {c._count?.products || 0} styles
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setCategoryToRename(c); setRenameInput(c.name); setIsRenameOpen(true); }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => { setCategoryToDelete(c); setIsDeleteCatOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOGS ── */}

      {/* Edit Brand */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Edit {editingBrand?.name}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select categories for this brand
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <button
              type="button"
              onClick={() => setEditBrandCategories((prev) => prev.includes("*") ? [] : ["*"])}
              className={`w-full text-xs text-left p-2.5 rounded-lg border font-medium transition-all ${
                editBrandCategories.includes("*")
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              All Categories
            </button>
            <div className="max-h-60 overflow-y-auto space-y-1">
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
                    {isChecked ? <CheckCircle2 size={15} className="text-indigo-600" /> : <div className="w-4 h-4 rounded border border-slate-300" />}
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSaveEditBrand} className="text-xs">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Scale */}
      <Dialog open={isAddScaleOpen} onOpenChange={setIsAddScaleOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add Size Scale</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              For {selectedScaleCategory}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Scale name</label>
              <Input placeholder="e.g. Kids (50 - 75)" value={newScaleName} onChange={(e) => setNewScaleName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sizes (comma-separated)</label>
              <Input placeholder="e.g. 50, 55, 60, 65" value={newScaleSizesInput} onChange={(e) => setNewScaleSizesInput(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddScaleOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleAddScaleToCategory} className="text-xs">Add Scale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Category */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input value={renameInput} onChange={(e) => setRenameInput(e.target.value)} className="h-9 text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleRenameCategory} className="text-xs">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category */}
      <Dialog open={isDeleteCatOpen} onOpenChange={setIsDeleteCatOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Category?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Delete &quot;{categoryToDelete?.name}&quot;? Categories with products cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteCatOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleDeleteCategory} variant="destructive" className="text-xs">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
