"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { TransactionType } from "@/app/generated/prisma/client";
import { z } from "zod";
import { categorySchema } from "@/lib/validations";

/**
 * Get all categories for the current user
 */
export async function getCategories(type?: TransactionType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      isArchived: false,
      ...(type && { type }),
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    ...c,
    budgetLimit: c.budgetLimit ? Number(c.budgetLimit) : null,
  }));
}

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  budgetLimit?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = categorySchema.parse(data);

  // Check for duplicate
  const existing = await prisma.category.findFirst({
    where: {
      userId: session.user.id,
      name: validated.name,
      type: validated.type,
    },
  });

  if (existing) {
    return { error: "Category already exists" };
  }

  const category = await prisma.category.create({
    data: {
      name: validated.name,
      type: validated.type,
      color: validated.color,
      icon: validated.icon,
      budgetLimit: validated.budgetLimit ?? null,
      userId: session.user.id,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");

  return { ...category, budgetLimit: category.budgetLimit ? Number(category.budgetLimit) : null };
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    color?: string;
    icon?: string;
    budgetLimit?: number | null;
    isArchived?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = categorySchema.partial().extend({
    isArchived: z.boolean().optional(),
  }).parse(data);

  const category = await prisma.category.update({
    where: { id, userId: session.user.id },
    data: validated,
  });

  revalidatePath("/categories");
  revalidatePath("/transactions");

  return { ...category, budgetLimit: category.budgetLimit ? Number(category.budgetLimit) : null };
}

/**
 * Delete a category (only if no transactions)
 */
export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const transactionCount = await prisma.transaction.count({
    where: { categoryId: id },
  });

  if (transactionCount > 0) {
    return { error: "Cannot delete category with transactions. Archive it instead." };
  }

  await prisma.category.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/categories");

  return { success: true };
}

/**
 * Get category spending summary
 */
export async function getCategorySpending(
  period?: "week" | "month" | "year",
  type: "INCOME" | "EXPENSE" = "EXPENSE"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      type: type,
      isArchived: false,
    },
    include: {
      transactions: {
        where: {
          date: { gte: startDate },
        },
        select: {
          amount: true,
        },
      },
    },
  });

  return categories.map((c) => {
    const spent = c.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const budget = c.budgetLimit ? Number(c.budgetLimit) : null;
    const percentUsed = budget ? (spent / budget) * 100 : null;

    return {
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      spent,
      budget,
      percentUsed,
      isOverBudget: percentUsed !== null && percentUsed > 100,
    };
  });
}
