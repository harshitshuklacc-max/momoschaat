import { prisma } from "./prisma";
import type { AuditAction } from "@prisma/client";

export async function createAuditLog(data: {
  adminId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      adminId: data.adminId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}
