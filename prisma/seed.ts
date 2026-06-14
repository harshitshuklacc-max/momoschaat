import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const STORE = {
  name: "SHOE MAFIA",
  phone: "07587555558",
  fullAddress:
    "Bus Stand, Old Telephone Exchange Road, Telipara, Bilaspur, Chhattisgarh 495001",
  upiId: "7587555558-2@ybl",
};

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "ShOeMafia";
  const adminPassword = process.env.ADMIN_PASSWORD || "ShoeMAFia@#1";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash, isActive: true },
    create: {
      username: adminUsername,
      passwordHash,
      name: "SHOE MAFIA Admin",
      isActive: true,
    },
  });

  const homepageSections = [
    { section: "hero", title: "Step Into Luxury", subtitle: "Premium footwear curated for style", sortOrder: 1 },
    { section: "featured", title: "Featured Products", subtitle: "Handpicked premium collection", sortOrder: 2 },
    { section: "trending", title: "Trending Now", subtitle: "What everyone is wearing", sortOrder: 3 },
    { section: "categories", title: "Shop by Category", subtitle: "Find your perfect fit", sortOrder: 4 },
    { section: "new_arrivals", title: "New Arrivals", subtitle: "Fresh styles just landed", sortOrder: 5 },
    { section: "best_sellers", title: "Best Sellers", subtitle: "Customer favorites", sortOrder: 6 },
    { section: "brands", title: "Our Brands", subtitle: "Trusted names in footwear", sortOrder: 7 },
    { section: "reviews", title: "Customer Reviews", subtitle: "What our customers say", sortOrder: 8 },
    {
      section: "about",
      title: "About SHOE MAFIA",
      subtitle: "Your trusted footwear destination in Bilaspur",
      content: {
        description:
          "SHOE MAFIA is Bilaspur's premier destination for premium footwear. We offer curated collections for men, women, and kids with exceptional quality and service.",
      },
      sortOrder: 9,
    },
    {
      section: "contact",
      title: "Visit Us",
      subtitle: "We'd love to hear from you",
      content: {
        phone: STORE.phone,
        address: STORE.fullAddress,
      },
      sortOrder: 10,
    },
  ];

  for (const section of homepageSections) {
    await prisma.homepageSetting.upsert({
      where: { section: section.section },
      update: {
        title: section.title,
        subtitle: section.subtitle,
        content: section.content ?? undefined,
        isActive: true,
        sortOrder: section.sortOrder,
      },
      create: {
        section: section.section,
        title: section.title,
        subtitle: section.subtitle,
        content: section.content ?? undefined,
        isActive: true,
        sortOrder: section.sortOrder,
      },
    });
  }

  const heroCount = await prisma.heroBanner.count();
  if (heroCount === 0) {
    await prisma.heroBanner.create({
      data: {
        title: "Welcome to SHOE MAFIA",
        subtitle: "Premium Footwear in Bilaspur",
        image: "/images/hero-default.jpg",
        link: "/products",
        buttonText: "Shop Now",
        isActive: true,
        sortOrder: 1,
      },
    });
  }

  const settings = [
    { key: "store_name", value: STORE.name, group: "store" },
    { key: "store_phone", value: STORE.phone, group: "store" },
    { key: "store_address", value: STORE.fullAddress, group: "store" },
    { key: "upi_id", value: STORE.upiId, group: "store" },
    { key: "tax_rate", value: 0, group: "tax" },
    { key: "tax_enabled", value: false, group: "tax" },
    { key: "barcode_type", value: "CODE128", group: "barcode" },
    { key: "invoice_prefix", value: "INV", group: "invoice" },
    { key: "theme_primary", value: "#dc2626", group: "theme" },
    { key: "theme_background", value: "#0a0a0a", group: "theme" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, group: setting.group },
      create: setting,
    });
  }

  console.log("Seed completed: admin, homepage sections, settings initialized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
