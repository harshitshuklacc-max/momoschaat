import { withAdmin } from "@/lib/api-auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { inventoryAdjustSchema } from "@/lib/validations";
import { updateInventory } from "@/lib/inventory";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  return withAdmin(async (admin) => {
    try {
      const body = await request.json();
      const parsed = inventoryAdjustSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(parsed.error.errors[0]?.message || "Invalid input");
      }

      const { productId, quantity, notes } = parsed.data;
      const updated = await updateInventory(
        productId,
        quantity,
        "ADJUSTMENT",
        undefined,
        notes || "Manual adjustment"
      );

      await createAuditLog({
        adminId: admin.id,
        action: "UPDATE",
        entity: "inventory",
        entityId: updated.id,
        details: { productId, quantity, notes },
      });

      return jsonOk(updated);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Adjustment failed", 500);
    }
  });
}
