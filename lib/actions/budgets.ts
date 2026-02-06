"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { BudgetPeriod } from "@/app/generated/prisma/client";

async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function getPeriodDateRange(period: BudgetPeriod, startDate: Date) {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (period) {
    case "WEEKLY": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      periodStart = new Date(now.getFullYear(), now.getMonth(), diff);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      break;
    }
    case "MONTHLY": {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    }
    case "QUARTERLY": {
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    }
    case "YEARLY": {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31);
      break;
    }
  }

  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

/**
 * Get all budgets with spending progress
 */
export async function getBudgets() {
  const userId = await getAuthUserId();

  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Calculate spending for each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const { periodStart, periodEnd } = getPeriodDateRange(
        budget.period,
        budget.startDate
      );

      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          categoryId: { in: budget.categoryIds },
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      });

      const spent = Number(spending._sum.amount) || 0;
      const amount = Number(budget.amount);

      // Get category names for display
      const categories = await prisma.category.findMany({
        where: { id: { in: budget.categoryIds } },
        select: { id: true, name: true, color: true },
      });

      return {
        id: budget.id,
        name: budget.name,
        amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        isActive: budget.isActive,
        categoryIds: budget.categoryIds,
        categories,
        spent,
        remaining: amount - spent,
        percentUsed: amount > 0 ? (spent / amount) * 100 : 0,
        isOverBudget: spent > amount,
        periodStart,
        periodEnd,
      };
    })
  );

  return budgetsWithSpending;
}

/**
 * Create a new budget
 */
export async function createBudget(data: {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date | null;
  categoryIds: string[];
}) {
  const userId = await getAuthUserId();

  const budget = await prisma.budget.create({
    data: {
      name: data.name,
      amount: data.amount,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate || null,
      categoryIds: data.categoryIds,
      userId,
    },
  });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return { success: true, budget };
}

/**
 * Update a budget
 */
export async function updateBudget(
  id: string,
  data: {
    name?: string;
    amount?: number;
    period?: BudgetPeriod;
    startDate?: Date;
    endDate?: Date | null;
    categoryIds?: string[];
    isActive?: boolean;
  }
) {
  const userId = await getAuthUserId();

  const budget = await prisma.budget.update({
    where: { id, userId },
    data,
  });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return { success: true, budget };
}

/**
 * Delete a budget
 */
export async function deleteBudget(id: string) {
  const userId = await getAuthUserId();

  await prisma.budget.delete({
    where: { id, userId },
  });

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Get budget alerts (budgets that are >80% spent) for dashboard
 */
export async function getBudgetAlerts() {
  const userId = await getAuthUserId();

  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
  });

  const alerts: Array<{
    id: string;
    name: string;
    amount: number;
    spent: number;
    percentUsed: number;
    period: BudgetPeriod;
  }> = [];

  for (const budget of budgets) {
    const { periodStart, periodEnd } = getPeriodDateRange(
      budget.period,
      budget.startDate
    );

    const spending = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        categoryId: { in: budget.categoryIds },
        date: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    });

    const spent = Number(spending._sum.amount) || 0;
    const amount = Number(budget.amount);
    const percentUsed = amount > 0 ? (spent / amount) * 100 : 0;

    if (percentUsed >= 80) {
      alerts.push({
        id: budget.id,
        name: budget.name,
        amount,
        spent,
        percentUsed,
        period: budget.period,
      });
    }
  }

  return alerts.sort((a, b) => b.percentUsed - a.percentUsed);
}
