"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { RecurringFrequency } from "@/app/generated/prisma/client";
import { recurringTransactionSchema } from "@/lib/validations";

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
