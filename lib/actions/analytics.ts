"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Get income/expense stats for an arbitrary date range
 */
export async function getAnalyticsStats(startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [income, expense, byCategory] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { id: { in: byCategory.map((c) => c.categoryId) } },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return {
    totalIncome: Number(income._sum.amount || 0),
    totalExpense: Number(expense._sum.amount || 0),
    byCategory: byCategory.map((c) => ({
      category: categoryMap.get(c.categoryId)!,
      amount: Number(c._sum.amount || 0),
    })),
  };
}

/**
 * Get category spending for an arbitrary date range
 */
export async function getCategorySpendingByRange(
  startDate: Date,
  endDate: Date,
  type: "INCOME" | "EXPENSE" = "EXPENSE"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const categories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      type: type,
      isArchived: false,
    },
    include: {
      transactions: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { amount: true },
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

/**
 * Get 12-month P&L report for a given year
 */
export async function getMonthlyReport(year: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate, lte: endDate },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: { date: true, amount: true, type: true },
    orderBy: { date: "asc" },
  });

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const months = MONTH_NAMES.map((month, idx) => {
    const monthTxns = transactions.filter((t) => t.date.getMonth() === idx);
    const income = monthTxns
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = monthTxns
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const net = income - expense;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;
    return { month, income, expense, net, savingsRate };
  });

  const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;

  return {
    months,
    totals: {
      income: totalIncome,
      expense: totalExpense,
      net: totalNet,
      savingsRate: avgSavingsRate,
    },
  };
}
