export interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    products: number;
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  barcode: string | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  category: Category;
  brand: string;
  pattern: string | null;
  fabric: string | null;
  sleeve: string | null;
  mrp: number;
  costPrice: number | null;
  notes: string | null;
  customMeta: Record<string, unknown> | null;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportRow {
  ID: string;
  Category: string;
  Brand: string;
  Pattern: string;
  Fabric: string;
  Sleeve: string;
  Size: string;
  Quantity: number;
  "MRP (₹)": number;
  "Total Value (₹)": number;
  Notes: string;
  "Last Updated": string;
}
