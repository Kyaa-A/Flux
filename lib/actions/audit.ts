"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdminAudit() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  targetUserId?: string;
  search?: string;
}) {
  await requireAdminAudit();

  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const skip = (page - 1) * limit;
  const search = params?.search?.trim();
  const action =
    params?.action && /^[A-Z0-9_]{3,80}$/.test(params.action.trim())
      ? params.action.trim()
      : undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(params?.actorId ? { actorId: params.actorId } : {}),
    ...(params?.targetUserId ? { targetUserId: params.targetUserId } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" as const } },
            { actorId: { contains: search, mode: "insensitive" as const } },
            { targetUserId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}
