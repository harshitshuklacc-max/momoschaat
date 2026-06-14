export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  sku: string;
  mrp: number;
  sellingPrice: number;
  discount: number;
  image: string | null;
  brand: { id: string; name: string; slug: string; logo?: string | null };
  category: { id: string; name: string; slug: string };
  color?: string | null;
  size?: string | null;
  gender: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface ProductDetailData extends ProductCardData {
  description: string | null;
  sku: string;
  images: { url: string; alt: string | null; isPrimary: boolean }[];
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  stock: number;
}

export interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
  customer: { firstName: string; lastName: string };
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount?: number;
}

export interface BrandData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  productCount?: number;
}

export interface HeroBannerData {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  buttonText: string | null;
}

export interface HomepageSection {
  title: string | null;
  subtitle: string | null;
  isActive: boolean;
}

export interface HomepageData {
  hero: { section: HomepageSection; banners: HeroBannerData[] };
  featured: { section: HomepageSection; products: ProductCardData[] };
  trending: { section: HomepageSection; products: ProductCardData[] };
  categories: { section: HomepageSection; items: CategoryData[] };
  newArrivals: { section: HomepageSection; products: ProductCardData[] };
  bestSellers: { section: HomepageSection; products: ProductCardData[] };
  brands: { section: HomepageSection; items: BrandData[] };
  reviews: { section: HomepageSection; items: ReviewData[] };
  about: { section: HomepageSection; content: Record<string, unknown> | null };
  contact: { section: HomepageSection; content: Record<string, unknown> | null };
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  mrp: number;
  quantity: number;
  sku: string;
  maxQuantity: number;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface AddressData {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  paymentMethod: string;
  itemCount: number;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  shippingAddress: AddressData | null;
  notes: string | null;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
    image: string | null;
  }[];
  payment: {
    status: string;
    method: string;
    verification?: {
      upiReference: string | null;
      screenshotUrl: string | null;
      status: string;
    };
  } | null;
}

export interface ProductsResponse {
  products: ProductCardData[];
  total: number;
  page: number;
  limit: number;
  filters: {
    brands: { id: string; name: string; slug: string }[];
    categories: { id: string; name: string; slug: string }[];
    genders: string[];
    priceRange: { min: number; max: number };
  };
}
