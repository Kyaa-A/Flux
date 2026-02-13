import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";

export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_REGISTER_SUCCESS"
  | "AUTH_PASSWORD_RESET_SUCCESS"
  | "AUTH_PASSWORD_CHANGE_SUCCESS"
  | "AUTH_ACCOUNT_DELETE_SUCCESS"
  | "ADMIN_ROLE_UPDATED"
  | "ADMIN_USER_BANNED"
  | "ADMIN_USER_UNBANNED"
  | "ADMIN_USER_ACTIVE_TOGGLED";

export async function logAuditAction(data: {
  action: AuditAction;
  actorId?: string | null;
  targetUserId?: string | null;
  details?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      actorId: data.actorId || null,
      targetUserId: data.targetUserId || null,
      details: data.details ?? Prisma.JsonNull,
      ipAddress: data.ipAddress || null,
    },
  });
}
