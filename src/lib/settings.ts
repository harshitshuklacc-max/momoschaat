import { prisma } from "./prisma";
import { STORE } from "./constants";

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  if (!setting) return defaultValue;
  return setting.value as T;
}

export async function setSetting(key: string, value: unknown, group = "general") {
  return prisma.setting.upsert({
    where: { key },
    update: { value: JSON.parse(JSON.stringify(value)), group },
    create: { key, value: JSON.parse(JSON.stringify(value)), group },
  });
}

export async function getStoreSettings() {
  const settings = await prisma.setting.findMany({
    where: { group: { in: ["store", "invoice", "tax", "barcode", "theme"] } },
  });

  const map: Record<string, unknown> = {
    storeName: STORE.name,
    storePhone: STORE.phone,
    storeAddress: STORE.fullAddress,
    upiId: STORE.upiId,
    taxRate: 0,
    barcodeType: "CODE128",
    theme: { primary: "#dc2626", background: "#0a0a0a" },
  };

  for (const s of settings) {
    map[s.key] = s.value;
  }

  return map;
}

export async function initializeDefaultSettings() {
  const defaults = [
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

  for (const d of defaults) {
    await prisma.setting.upsert({
      where: { key: d.key },
      update: {},
      create: d,
    });
  }
}
