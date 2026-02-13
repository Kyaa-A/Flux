import { prisma } from "@/lib/db";
import type { NotificationType } from "@/app/generated/prisma/client";

export type NotificationPreferenceKey =
  | "budgetWarnings"
  | "budgetExceeded"
  | "recurringProcessed"
  | "adminAccountStatus"
  | "largeTransaction";

export type NotificationPreferences = {
  budgetWarnings: boolean;
  budgetExceeded: boolean;
  recurringProcessed: boolean;
  adminAccountStatus: boolean;
  largeTransaction: boolean;
  largeTransactionThreshold: number | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  budgetWarnings: true,
  budgetExceeded: true,
  recurringProcessed: true,
  adminAccountStatus: true,
  largeTransaction: false,
  largeTransactionThreshold: null,
};

function normalizeNotificationPreferences(
  raw: unknown
): NotificationPreferences {
  const prefs =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const threshold = prefs.largeTransactionThreshold;
  const parsedThreshold =
    typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0
      ? threshold
      : null;

  return {
    budgetWarnings:
      typeof prefs.budgetWarnings === "boolean"
        ? prefs.budgetWarnings
        : DEFAULT_NOTIFICATION_PREFERENCES.budgetWarnings,
    budgetExceeded:
      typeof prefs.budgetExceeded === "boolean"
        ? prefs.budgetExceeded
        : DEFAULT_NOTIFICATION_PREFERENCES.budgetExceeded,
    recurringProcessed:
      typeof prefs.recurringProcessed === "boolean"
        ? prefs.recurringProcessed
        : DEFAULT_NOTIFICATION_PREFERENCES.recurringProcessed,
    adminAccountStatus:
      typeof prefs.adminAccountStatus === "boolean"
        ? prefs.adminAccountStatus
        : DEFAULT_NOTIFICATION_PREFERENCES.adminAccountStatus,
    largeTransaction:
      typeof prefs.largeTransaction === "boolean"
        ? prefs.largeTransaction
        : DEFAULT_NOTIFICATION_PREFERENCES.largeTransaction,
    largeTransactionThreshold: parsedThreshold,
  };
}

export async function getUserNotificationPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  return normalizeNotificationPreferences(user?.notificationPrefs);
}

export async function shouldSendNotification(
  userId: string,
  preferenceKey: NotificationPreferenceKey
) {
  const prefs = await getUserNotificationPreferences(userId);
  return prefs[preferenceKey];
}

export async function maybeCreateLargeTransactionNotification(data: {
  userId: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description?: string | null;
}) {
  const prefs = await getUserNotificationPreferences(data.userId);
  const threshold = prefs.largeTransactionThreshold;

  if (!prefs.largeTransaction || !threshold || data.amount < threshold) {
    return null;
  }

  const prefix = data.type === "INCOME" ? "Large income" : "Large expense";
  const sign = data.type === "INCOME" ? "+" : "-";

  return createNotification({
    userId: data.userId,
    title: `${prefix} recorded`,
    message: `${sign}$${data.amount.toFixed(2)}${data.description ? ` (${data.description})` : ""}`,
    type: data.type === "INCOME" ? "SUCCESS" : "WARNING",
    actionUrl: "/transactions",
    preferenceKey: "largeTransaction",
  });
}

/**
 * Create a notification for a user (internal use only)
 */
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
  preferenceKey?: NotificationPreferenceKey;
}) {
  if (data.preferenceKey) {
    const allowed = await shouldSendNotification(data.userId, data.preferenceKey);
    if (!allowed) return null;
  }

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
          preferenceKey: "budgetExceeded",
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
          preferenceKey: "budgetWarnings",
        });
        created++;
      }
    }
  }

  return { created };
}
