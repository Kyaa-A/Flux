"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 20) {
  const userId = await getAuthUserId();

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get paginated notifications for the current user
 */
export async function getNotificationsPaginated(params?: {
  page?: number;
  limit?: number;
}) {
  const userId = await getAuthUserId();
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notifications,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  const userId = await getAuthUserId();

  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id: string) {
  const userId = await getAuthUserId();

  await prisma.notification.update({
    where: { id, userId },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
  const userId = await getAuthUserId();

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string) {
  const userId = await getAuthUserId();

  await prisma.notification.delete({
    where: { id, userId },
  });

  revalidatePath("/");
  return { success: true };
}
