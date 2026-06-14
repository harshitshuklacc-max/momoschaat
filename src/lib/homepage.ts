import { prisma } from "./prisma";
import {
  productInclude,
  serializeProduct,
  serializeReview,
  serializeCategory,
  serializeBrand,
} from "./serializers";
import type { HomepageData } from "./types";

export async function getHomepageData(): Promise<HomepageData> {
  const [
    sections,
    banners,
    featuredProducts,
    trendingProducts,
    newArrivals,
    bestSellers,
    categories,
    brands,
    reviews,
  ] = await Promise.all([
    prisma.homepageSetting.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", isFeatured: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", isTrending: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", isNewArrival: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", isBestSeller: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
      orderBy: { sortOrder: "asc" },
      take: 12,
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
      orderBy: { name: "asc" },
      take: 12,
    }),
    prisma.review.findMany({
      where: { status: "APPROVED" },
      include: { customer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const getSection = (name: string) => {
    const s = sections.find((sec) => sec.section === name);
    return {
      title: s?.title ?? null,
      subtitle: s?.subtitle ?? null,
      isActive: s?.isActive ?? true,
    };
  };

  const aboutSection = sections.find((s) => s.section === "about");
  const contactSection = sections.find((s) => s.section === "contact");

  return {
    hero: {
      section: getSection("hero"),
      banners: banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        image: b.image,
        link: b.link,
        buttonText: b.buttonText,
      })),
    },
    featured: {
      section: getSection("featured"),
      products: featuredProducts.map(serializeProduct),
    },
    trending: {
      section: getSection("trending"),
      products: trendingProducts.map(serializeProduct),
    },
    categories: {
      section: getSection("categories"),
      items: categories.map(serializeCategory),
    },
    newArrivals: {
      section: getSection("new_arrivals"),
      products: newArrivals.map(serializeProduct),
    },
    bestSellers: {
      section: getSection("best_sellers"),
      products: bestSellers.map(serializeProduct),
    },
    brands: {
      section: getSection("brands"),
      items: brands.map(serializeBrand),
    },
    reviews: {
      section: getSection("reviews"),
      items: reviews.map(serializeReview),
    },
    about: {
      section: getSection("about"),
      content: (aboutSection?.content as Record<string, unknown>) ?? null,
    },
    contact: {
      section: getSection("contact"),
      content: (contactSection?.content as Record<string, unknown>) ?? null,
    },
  };
}
