"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { RecurringFrequency, TransactionType } from "@/app/generated/prisma/client";
import { createNotification } from "@/lib/actions/notifications";

async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function getNextRunDate(current: Date, frequency: RecurringFrequency): Date {
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
 * Get all recurring transactions for the current user
 */
export async function getRecurringTransactions() {
  const userId = await getAuthUserId();

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      wallet: { select: { id: true, name: true } },
    },
    orderBy: { nextRunDate: "asc" },
  });

  return recurring.map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));
}

/**
 * Create a recurring transaction
 */
export async function createRecurringTransaction(data: {
  amount: number;
  type: TransactionType;
  description?: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  walletId: string;
  categoryId: string;
}) {
  const userId = await getAuthUserId();

  const recurring = await prisma.recurringTransaction.create({
    data: {
      amount: data.amount,
      type: data.type,
      description: data.description || null,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate || null,
      nextRunDate: data.startDate,
      userId,
      walletId: data.walletId,
      categoryId: data.categoryId,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/transactions/recurring");

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

  const recurring = await prisma.recurringTransaction.update({
    where: { id, userId },
    data,
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
 * Process all due recurring transactions (called by cron)
 */
export async function processRecurringTransactions() {
  const now = new Date();

  const dueRecurring = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextRunDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  let processed = 0;

  for (const recurring of dueRecurring) {
    // Create the actual transaction
    await prisma.transaction.create({
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
    });

    // Update wallet balance
    const balanceChange =
      recurring.type === "INCOME"
        ? Number(recurring.amount)
        : -Number(recurring.amount);

    await prisma.wallet.update({
      where: { id: recurring.walletId },
      data: { balance: { increment: balanceChange } },
    });

    // Advance next run date
    const nextDate = getNextRunDate(recurring.nextRunDate, recurring.frequency);

    // Deactivate if end date is passed
    const shouldDeactivate =
      recurring.endDate && nextDate > recurring.endDate;

    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: {
        nextRunDate: nextDate,
        lastRunAt: now,
        isActive: shouldDeactivate ? false : true,
      },
    });

    // Notify user about the processed recurring transaction
    const label = recurring.description || "Recurring transaction";
    const sign = recurring.type === "INCOME" ? "+" : "-";
    await createNotification({
      userId: recurring.userId,
      title: `${label} processed`,
      message: `${sign}$${Number(recurring.amount).toFixed(2)} was automatically recorded.`,
      type: "SUCCESS",
      actionUrl: "/transactions",
    });

    processed++;
  }

  return { processed };
}
