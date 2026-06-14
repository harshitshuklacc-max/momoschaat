import { prisma } from "./prisma";
import type { InventoryAction, Prisma } from "@prisma/client";

export async function updateInventory(
  productId: string,
  quantityChange: number,
  action: InventoryAction,
  reference?: string,
  notes?: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;

  const inventory = await client.inventory.findUnique({
    where: { productId },
  });

  if (!inventory) {
    throw new Error("Inventory record not found");
  }

  const previousQty = inventory.quantity;
  const newQty = previousQty + quantityChange;

  if (newQty < 0) {
    throw new Error("Insufficient stock");
  }

  const updated = await client.inventory.update({
    where: { productId },
    data: { quantity: newQty },
  });

  await client.inventoryLog.create({
    data: {
      inventoryId: inventory.id,
      action,
      quantity: Math.abs(quantityChange),
      previousQty,
      newQty,
      reference,
      notes,
    },
  });

  return updated;
}

export async function reserveStock(
  productId: string,
  quantity: number,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;
  const inventory = await client.inventory.findUnique({
    where: { productId },
  });

  if (!inventory || inventory.quantity - inventory.reserved < quantity) {
    throw new Error("Insufficient available stock");
  }

  return client.inventory.update({
    where: { productId },
    data: { reserved: { increment: quantity } },
  });
}

export async function releaseReservedStock(
  productId: string,
  quantity: number,
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;
  return client.inventory.update({
    where: { productId },
    data: { reserved: { decrement: quantity } },
  });
}

export async function getInventoryStats() {
  const inventories = await prisma.inventory.findMany({
    select: { quantity: true, minStock: true },
  });

  const totalProducts = inventories.length;
  const lowStock = inventories.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minStock
  ).length;
  const outOfStock = inventories.filter((i) => i.quantity === 0).length;
  const totalQuantity = inventories.reduce((sum, i) => sum + i.quantity, 0);

  return { totalProducts, lowStock, outOfStock, totalQuantity };
}
