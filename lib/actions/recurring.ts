"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { RecurringFrequency } from "@/app/generated/prisma/client";
import { recurringTransactionSchema } from "@/lib/validations";
import { calculateNextRunDate } from "@/lib/recurring-processor";
import {
  createBudgetAlertNotificationsForUser,
  createNotification,
} from "@/lib/notifications";

async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/**
 * Get all recurring transactions for the current user
 */
export async function getRecurringTransactions() {
  const userId = await getAuthUserId();

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId, type: { in: ["INCOME", "EXPENSE"] } },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      wallet: { select: { id: true, name: true } },
    },
    orderBy: { nextRunDate: "asc" },
  });

  return recurring.map((r) => ({
    ...r,
    type: r.type as "INCOME" | "EXPENSE",
    amount: Number(r.amount),
  }));
}

/**
 * Get upcoming recurring templates due next
 */
export async function getUpcomingRecurringTransactions(limit = 5) {
  const userId = await getAuthUserId();
  const safeLimit = Math.max(1, Math.min(20, limit));

  const recurring = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: {
      category: { select: { name: true, color: true } },
      wallet: { select: { name: true } },
    },
    orderBy: { nextRunDate: "asc" },
    take: safeLimit,
  });

  return recurring.map((item) => ({
    id: item.id,
    description: item.description || item.category.name,
    amount: Number(item.amount),
    type: item.type as "INCOME" | "EXPENSE",
    frequency: item.frequency,
    nextRunDate: item.nextRunDate,
    categoryName: item.category.name,
    categoryColor: item.category.color,
    walletName: item.wallet.name,
  }));
}

/**
 * Create a recurring transaction
 */
export async function createRecurringTransaction(data: {
  amount: number;
  type: "INCOME" | "EXPENSE";
  description?: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  walletId: string;
  categoryId: string;
}) {
  const userId = await getAuthUserId();

  const validated = recurringTransactionSchema.parse(data);

  const recurring = await prisma.recurringTransaction.create({
    data: {
      amount: validated.amount,
      type: validated.type,
      description: validated.description || null,
      frequency: validated.frequency,
      startDate: validated.startDate,
      endDate: validated.endDate || null,
      nextRunDate: validated.startDate,
      userId,
      walletId: validated.walletId,
      categoryId: validated.categoryId,
    },
  });

  const now = new Date();
  const shouldRunNow =
    recurring.isActive &&
    recurring.nextRunDate <= now &&
    (!recurring.endDate || recurring.endDate >= now);

  if (shouldRunNow) {
    const balanceChange =
      recurring.type === "INCOME"
        ? Number(recurring.amount)
        : -Number(recurring.amount);
    const nextDate = calculateNextRunDate(recurring.nextRunDate, recurring.frequency);
    const shouldDeactivate = recurring.endDate ? nextDate > recurring.endDate : false;

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          amount: recurring.amount,
          type: recurring.type,
          description: recurring.description,
          date: now,
          isRecurring: true,
          recurringId: recurring.id,
          userId: recurring.userId,
          walletId: recurring.walletId,
          categoryId: recurring.categoryId,
        },
      }),
      prisma.wallet.update({
        where: { id: recurring.walletId, userId },
        data: { balance: { increment: balanceChange } },
      }),
      prisma.recurringTransaction.update({
        where: { id: recurring.id, userId },
        data: {
          nextRunDate: nextDate,
          lastRunAt: now,
          isActive: !shouldDeactivate,
        },
      }),
    ]);

    const sign = recurring.type === "INCOME" ? "+" : "-";
    await createNotification({
      userId,
      title: `${recurring.description || "Recurring transaction"} processed`,
      message: `${sign}$${Number(recurring.amount).toFixed(2)} was automatically recorded.`,
      type: "SUCCESS",
      actionUrl: "/transactions",
      preferenceKey: "recurringProcessed",
    });

    if (recurring.type === "EXPENSE") {
      await createBudgetAlertNotificationsForUser(userId);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");

  return { success: true, recurring };
}

/**
 * Update a recurring transaction
 */
export async function updateRecurringTransaction(
  id: string,
  data: {
    amount?: number;
    description?: string;
    frequency?: RecurringFrequency;
    endDate?: Date | null;
    walletId?: string;
    categoryId?: string;
    isActive?: boolean;
  }
) {
  const userId = await getAuthUserId();

  const validated = recurringTransactionSchema.partial().parse(data);

  const recurring = await prisma.recurringTransaction.update({
    where: { id, userId },
    data: validated,
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");

  return { success: true, recurring };
}

/**
 * Delete a recurring transaction
 */
export async function deleteRecurringTransaction(id: string) {
  const userId = await getAuthUserId();

  await prisma.recurringTransaction.delete({
    where: { id, userId },
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");

  return { success: true };
}

/**
 * Pause a recurring transaction
 */
export async function pauseRecurringTransaction(id: string) {
  const userId = await getAuthUserId();

  await prisma.recurringTransaction.update({
    where: { id, userId },
    data: { isActive: false },
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");

  return { success: true };
}

/**
 * Resume a recurring transaction
 */
export async function resumeRecurringTransaction(id: string) {
  const userId = await getAuthUserId();

  await prisma.recurringTransaction.update({
    where: { id, userId },
    data: { isActive: true },
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");

  return { success: true };
}
