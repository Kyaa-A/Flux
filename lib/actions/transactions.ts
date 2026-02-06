"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Get all transactions for the current user with filters
 */
export async function getTransactions(params: {
  page?: number;
  limit?: number;
  type?: "INCOME" | "EXPENSE" | "all";
  categoryId?: string;
  walletId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const {
    page = 1,
    limit = 20,
    type = "all",
    categoryId,
    walletId,
    startDate,
    endDate,
    search,
  } = params;

  const skip = (page - 1) * limit;

  const where = {
    userId: session.user.id,
    ...(type !== "all" && { type }),
    ...(categoryId && { categoryId }),
    ...(walletId && { walletId }),
    ...(startDate && endDate && {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" as const } },
        { notes: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        wallet: true,
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

/**
 * Create a new transaction
 */
export async function createTransaction(data: {
  amount: number;
  type: "INCOME" | "EXPENSE";
  description?: string;
  notes?: string;
  date: Date;
  categoryId: string;
  walletId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      userId: session.user.id,
    },
    include: {
      category: true,
      wallet: true,
    },
  });

  // Update wallet balance
  const balanceChange = data.type === "INCOME" ? data.amount : -data.amount;
  await prisma.wallet.update({
    where: { id: data.walletId },
    data: {
      balance: {
        increment: balanceChange,
      },
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ...transaction, amount: Number(transaction.amount) };
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: string,
  data: {
    amount?: number;
    type?: "INCOME" | "EXPENSE";
    description?: string;
    notes?: string;
    date?: Date;
    categoryId?: string;
    walletId?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get original transaction to calculate balance adjustment
  const original = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!original) throw new Error("Transaction not found");

  const transaction = await prisma.transaction.update({
    where: { id, userId: session.user.id },
    data,
    include: {
      category: true,
      wallet: true,
    },
  });

  // Adjust wallet balance if amount or type changed
  if (data.amount !== undefined || data.type !== undefined) {
    const oldBalance = original.type === "INCOME" 
      ? Number(original.amount) 
      : -Number(original.amount);
    const newBalance = (data.type || original.type) === "INCOME"
      ? (data.amount ?? Number(original.amount))
      : -(data.amount ?? Number(original.amount));
    
    await prisma.wallet.update({
      where: { id: data.walletId || original.walletId },
      data: {
        balance: {
          increment: newBalance - oldBalance,
        },
      },
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { ...transaction, amount: Number(transaction.amount) };
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const transaction = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!transaction) throw new Error("Transaction not found");

  // Reverse the wallet balance change
  const balanceChange = transaction.type === "INCOME" 
    ? -Number(transaction.amount) 
    : Number(transaction.amount);
  
  await prisma.wallet.update({
    where: { id: transaction.walletId },
    data: {
      balance: {
        increment: balanceChange,
      },
    },
  });

  await prisma.transaction.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Get transaction summary stats
 */
export async function getTransactionStats(period?: "week" | "month" | "year") {
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

  const [income, expense, byCategory] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "INCOME",
        date: { gte: startDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startDate },
      },
      _sum: { amount: true },
    }),
  ]);

  // Get category details
  const categories = await prisma.category.findMany({
    where: {
      id: { in: byCategory.map((c) => c.categoryId) },
    },
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
 * Get monthly income vs expense history for the last 6 months
 */
export async function getMonthlyHistory() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: sixMonthsAgo },
    },
    select: {
      date: true,
      amount: true,
      type: true,
    },
    orderBy: { date: "asc" },
  });

  // Create array of last 6 months
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = d.toLocaleString("default", { month: "short" });
    
    // Filter transactions for this month
    const monthlyTransactions = transactions.filter(
      (t) => 
        t.date.getMonth() === d.getMonth() && 
        t.date.getFullYear() === d.getFullYear()
    );

    const income = monthlyTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthlyTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    result.push({
      name: monthName,
      income,
      expense,
    });
  }

  return result;
}

/**
 * Get savings trend for the last 6 months
 */
export async function getSavingsTrend() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: sixMonthsAgo },
    },
    select: { date: true, amount: true, type: true },
    orderBy: { date: "asc" },
  });

  const result = [];
  let cumulative = 0;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = d.toLocaleString("default", { month: "short" });

    const monthlyTransactions = transactions.filter(
      (t) =>
        t.date.getMonth() === d.getMonth() &&
        t.date.getFullYear() === d.getFullYear()
    );

    const income = monthlyTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthlyTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const savings = income - expense;
    cumulative += savings;

    result.push({ month: monthName, savings, cumulative });
  }

  return result;
}
