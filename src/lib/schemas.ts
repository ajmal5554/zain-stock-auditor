import { z } from "zod";

/* ── Category ── */
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name too long")
    .trim(),
});

/* ── Size-Quantity pair ── */
const sizeQuantitySchema = z.object({
  size: z
    .string()
    .min(1, "Size is required")
    .max(20, "Size too long")
    .trim(),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(9999, "Quantity seems unrealistically high"),
});

/* ── Audit Entry (product + variants) ── */
export const auditEntrySchema = z.object({
  categoryId: z.string().cuid("Invalid category"),
  brand: z
    .string()
    .max(100, "Brand name too long")
    .optional()
    .default("Unbranded")
    .transform((val) => (val && val.trim() ? val.trim() : "Unbranded")),
  pattern: z.string().nullable().optional(),
  fabric: z.string().nullable().optional(),
  sleeve: z.string().nullable().optional(),
  fit: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  customMeta: z.record(z.any()).nullable().optional(),
  mrp: z
    .number()
    .int("MRP must be a whole rupee amount")
    .min(1, "MRP must be at least ₹1")
    .max(999999, "MRP too high"),
  costPrice: z
    .number()
    .min(0)
    .max(999999)
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
  variants: z
    .array(sizeQuantitySchema)
    .min(1, "At least one size with quantity is required")
    .refine(
      (variants) => variants.some((v) => v.quantity > 0),
      "At least one size must have quantity > 0"
    ),
});

/* ── Inline quantity update ── */
export const updateQuantitySchema = z.object({
  variantId: z.string().cuid("Invalid variant"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative")
    .max(9999, "Quantity too high"),
});

/* ── Types ── */
export type CategoryInput = z.infer<typeof categorySchema>;
export type AuditEntryInput = z.infer<typeof auditEntrySchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
