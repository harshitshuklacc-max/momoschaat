import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  mrp: z.coerce.number().positive("MRP must be positive"),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).default("UNISEX"),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(["ACTIVE", "DISABLED", "DRAFT"]).default("ACTIVE"),
  images: z.array(z.string()).optional(),
});

export const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
  logo: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
});

export const addressSchema = z.object({
  label: z.string().default("Home"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(6, "Valid pincode required"),
  country: z.string().default("India"),
  isDefault: z.boolean().default(false),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(10, "Valid phone required"),
  customerEmail: z.string().email().optional(),
  paymentMethod: z.enum(["COD", "UPI"]),
  shippingAddress: addressSchema,
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export const upiPaymentSchema = z.object({
  orderId: z.string().min(1),
  upiReference: z.string().min(1, "UTR/Reference number is required"),
  screenshotUrl: z.string().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  orderId: z.string().optional(),
});

export const posSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.coerce.number().int().positive(),
      discount: z.coerce.number().min(0).default(0),
    })
  ).min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD"]).default("CASH"),
  discount: z.coerce.number().min(0).default(0),
});

export const inventoryAdjustSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int(),
  notes: z.string().optional(),
});

export const settingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  group: z.string().default("general"),
});

export const couponSchema = z.object({
  code: z.string().min(3),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().optional(),
  maxDiscount: z.coerce.number().optional(),
  usageLimit: z.coerce.number().int().optional(),
  expiresAt: z.string().optional(),
});

export const dangerZoneSchema = z.object({
  password: z.string().min(1, "Admin password required"),
  confirmation: z.literal("DELETE"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PosSaleInput = z.infer<typeof posSaleSchema>;
