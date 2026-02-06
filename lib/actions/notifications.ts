"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { NotificationType } from "@/app/generated/prisma/client";

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

/**
 * Create a notification for a user (internal use)
 */
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}) {
  return prisma.notification.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      actionUrl: data.actionUrl || null,
      userId: data.userId,
    },
  });
}

/**
 * Create budget alert notifications for all users with budgets > threshold
 */
export async function createBudgetAlertNotifications() {
  const budgets = await prisma.budget.findMany({
    where: { isActive: true },
    include: { user: { select: { id: true } } },
  });

  const now = new Date();
  let created = 0;

  for (const budget of budgets) {
    // Calculate period range
    const { start, end } = getPeriodRange(now, budget.period, budget.startDate);

    // Calculate spending for this budget's categories in the period
    const spending = await prisma.transaction.aggregate({
      where: {
        userId: budget.userId,
        type: "EXPENSE",
        categoryId: { in: budget.categoryIds },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const spent = Number(spending._sum.amount || 0);
    const budgetAmount = Number(budget.amount);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    if (percentage >= 100) {
      // Check if we already sent an exceeded notification recently (last 24h)
      const existing = await prisma.notification.findFirst({
        where: {
          userId: budget.userId,
          title: { contains: budget.name },
          type: "ERROR",
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        await createNotification({
          userId: budget.userId,
          title: `Budget "${budget.name}" exceeded`,
          message: `You've spent $${spent.toFixed(2)} of your $${budgetAmount.toFixed(2)} budget (${Math.round(percentage)}%).`,
          type: "ERROR",
          actionUrl: "/budgets",
        });
        created++;
      }
    } else if (percentage >= 80) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: budget.userId,
          title: { contains: budget.name },
          type: "WARNING",
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        await createNotification({
          userId: budget.userId,
          title: `Budget "${budget.name}" almost reached`,
          message: `You've spent $${spent.toFixed(2)} of your $${budgetAmount.toFixed(2)} budget (${Math.round(percentage)}%).`,
          type: "WARNING",
          actionUrl: "/budgets",
        });
        created++;
      }
    }
  }

  return { created };
}

function getPeriodRange(now: Date, period: string, startDate: Date) {
  const start = new Date(startDate);
  const end = new Date(now);

  switch (period) {
    case "WEEKLY": {
      const day = now.getDay();
      const startDay = startDate.getDay();
      const diff = (day - startDay + 7) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return { start: weekStart, end: weekEnd };
    }
    case "MONTHLY": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), start.getDate());
      if (monthStart > now) monthStart.setMonth(monthStart.getMonth() - 1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(monthEnd.getDate() - 1);
      monthEnd.setHours(23, 59, 59, 999);
      return { start: monthStart, end: monthEnd };
    }
    case "QUARTERLY": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      const qEnd = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
      return { start: qStart, end: qEnd };
    }
    case "YEARLY": {
      const yStart = new Date(now.getFullYear(), 0, 1);
      const yEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: yStart, end: yEnd };
    }
    default:
      return { start, end };
  }
}
