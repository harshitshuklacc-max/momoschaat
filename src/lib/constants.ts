export const STORE = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "SHOE MAFIA",
  logo: "/images/logo.png",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || "07587555558",
  address: {
    line1: "Bus Stand, Old Telephone Exchange Road",
    line2: "Telipara",
    city: "Bilaspur",
    state: "Chhattisgarh",
    pincode: "495001",
    country: "India",
  },
  fullAddress:
    "Bus Stand, Old Telephone Exchange Road, Telipara, Bilaspur, Chhattisgarh 495001",
  whatsapp: "917587555558",
  upiId: process.env.NEXT_PUBLIC_UPI_ID || "7587555558-2@ybl",
  googleMapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Bus+Stand+Old+Telephone+Exchange+Road+Telipara+Bilaspur+Chhattisgarh+495001",
} as const;

export const AUTH_COOKIE = "shoe_mafia_token";
export const ADMIN_COOKIE = "shoe_mafia_admin_token";

export const JWT_EXPIRY = "7d";
export const ADMIN_JWT_EXPIRY = "24h";

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const INVOICE_RETENTION_DAYS = 365;

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

export const PAYMENT_METHODS = ["COD", "UPI", "CASH", "CARD"] as const;

export const BARCODE_TYPES = ["CODE128", "EAN13", "QR"] as const;

export const GENDERS = ["MEN", "WOMEN", "UNISEX", "KIDS"] as const;
