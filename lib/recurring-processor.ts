import { prisma } from "@/lib/db";
import type { RecurringFrequency } from "@/app/generated/prisma/client";
import { createNotification } from "@/lib/notifications";

export function calculateNextRunDate(current: Date, frequency: RecurringFrequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Process all due recurring transactions (called by cron)
 */
export async function processRecurringTransactions() {
  const now = new Date();

  const dueRecurring = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      type: { in: ["INCOME", "EXPENSE"] },
      nextRunDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  let processed = 0;
  const affectedUserIds = new Set<string>();

  for (const recurring of dueRecurring) {
    const balanceChange =
      recurring.type === "INCOME"
        ? Number(recurring.amount)
        : -Number(recurring.amount);

    // Advance next run date
    const nextDate = calculateNextRunDate(recurring.nextRunDate, recurring.frequency);
    const shouldDeactivate =
      recurring.endDate && nextDate > recurring.endDate;

    // Atomically create transaction, update wallet, and advance recurring
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          amount: recurring.amount,
          type: recurring.type,
          description: recurring.description,
          date: new Date(),
          isRecurring: true,
          recurringId: recurring.id,
          userId: recurring.userId,
          walletId: recurring.walletId,
          categoryId: recurring.categoryId,
        },
      }),
      prisma.wallet.update({
        where: { id: recurring.walletId },
        data: { balance: { increment: balanceChange } },
      }),
      prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: {
          nextRunDate: nextDate,
          lastRunAt: now,
          isActive: shouldDeactivate ? false : true,
        },
      }),
    ]);

    // Notify user about the processed recurring transaction
    const label = recurring.description || "Recurring transaction";
    const sign = recurring.type === "INCOME" ? "+" : "-";
    await createNotification({
      userId: recurring.userId,
      title: `${label} processed`,
      message: `${sign}$${Number(recurring.amount).toFixed(2)} was automatically recorded.`,
      type: "SUCCESS",
      actionUrl: "/transactions",
      preferenceKey: "recurringProcessed",
    });

    affectedUserIds.add(recurring.userId);
    processed++;
  }

  if (affectedUserIds.size > 0) {
    const { createBudgetAlertNotificationsForUser } = await import("@/lib/notifications");
    await Promise.all(
      [...affectedUserIds].map((userId) => createBudgetAlertNotificationsForUser(userId))
    );
  }

  return { processed };
}
