"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getMonthRange, calculatePercentageChange } from "@/lib/utils";
import { transactionSchema, type TransactionFormData } from "@/lib/validations";
import { revalidatePath } from "next/cache";

// Get authenticated user ID
async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

// Dashboard Stats
export async function getDashboardStats() {
  const userId = await getAuthUserId();
  const { start: currentStart, end: currentEnd } = getMonthRange();
  const { start: prevStart, end: prevEnd } = getMonthRange(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
  );

  // Current month stats
  const [currentIncome, currentExpense, prevIncome, prevExpense, totalBalance] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          date: { gte: currentStart, lte: currentEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: currentStart, lte: currentEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          date: { gte: prevStart, lte: prevEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: prevStart, lte: prevEnd },
        },
        _sum: { amount: true },
      }),
      prisma.wallet.aggregate({
        where: { userId, isArchived: false },
        _sum: { balance: true },
      }),
    ]);

  const income = Number(currentIncome._sum.amount) || 0;
  const expense = Number(currentExpense._sum.amount) || 0;
  const prevIncomeVal = Number(prevIncome._sum.amount) || 0;
  const prevExpenseVal = Number(prevExpense._sum.amount) || 0;
  const balance = Number(totalBalance._sum.balance) || 0;

  return {
    totalBalance: balance,
    monthlyIncome: income,
    monthlyExpense: expense,
    monthlySavings: income - expense,
    incomeChange: calculatePercentageChange(income, prevIncomeVal),
    expenseChange: calculatePercentageChange(expense, prevExpenseVal),
  };
}

// Recent Transactions
export async function getRecentTransactions(limit: number = 10) {
  const userId = await getAuthUserId();

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: {
      category: true,
      wallet: true,
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    type: t.type,
    description: t.description,
    date: t.date,
    category: {
      id: t.category.id,
      name: t.category.name,
      color: t.category.color,
      icon: t.category.icon,
    },
    wallet: {
      id: t.wallet.id,
      name: t.wallet.name,
    },
  }));
}

// Monthly Chart Data (last 6 months)
export async function getMonthlyChartData() {
  const userId = await getAuthUserId();
  const months: { month: string; income: number; expense: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const { start, end } = getMonthRange(date);

    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    months.push({
      month: date.toLocaleDateString("en-US", { month: "short" }),
      income: Number(income._sum.amount) || 0,
      expense: Number(expense._sum.amount) || 0,
    });
  }

  return months;
}

// Expense by Category (current month)
export async function getExpenseByCategory() {
  const userId = await getAuthUserId();
  const { start, end } = getMonthRange();

  const expenses = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const categoryIds = expenses.map((e) => e.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return expenses
    .map((e) => {
      const category = categoryMap.get(e.categoryId);
      return {
        name: category?.name || "Unknown",
        value: Number(e._sum.amount) || 0,
        color: category?.color || "#71717a",
      };
    })
    .sort((a, b) => b.value - a.value);
}

// Create Transaction
export async function createTransaction(data: TransactionFormData) {
  const userId = await getAuthUserId();

  try {
    const validatedData = transactionSchema.parse(data);

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description || null,
        notes: validatedData.notes || null,
        date: validatedData.date,
        isRecurring: validatedData.isRecurring,
        categoryId: validatedData.categoryId,
        walletId: validatedData.walletId,
        userId,
      },
    });

    // Update wallet balance
    const balanceChange =
      validatedData.type === "INCOME"
        ? validatedData.amount
        : -validatedData.amount;

    await prisma.wallet.update({
      where: { id: validatedData.walletId },
      data: {
        balance: { increment: balanceChange },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return { success: true, transaction };
  } catch (error) {
    console.error("Create transaction error:", error);
    return { error: "Failed to create transaction" };
  }
}

// Delete Transaction
export async function deleteTransaction(transactionId: string) {
  const userId = await getAuthUserId();

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      return { error: "Transaction not found" };
    }

    // Reverse the wallet balance change
    const balanceChange =
      transaction.type === "INCOME"
        ? -Number(transaction.amount)
        : Number(transaction.amount);

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: balanceChange } },
      }),
      prisma.transaction.delete({
        where: { id: transactionId },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return { success: true };
  } catch (error) {
    console.error("Delete transaction error:", error);
    return { error: "Failed to delete transaction" };
  }
}

// Get Wallets
export async function getWallets() {
  const userId = await getAuthUserId();

  const wallets = await prisma.wallet.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  return wallets.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    balance: Number(w.balance),
    color: w.color,
    icon: w.icon,
    currency: w.currency,
  }));
}

// Get Categories
export async function getCategories(type?: "INCOME" | "EXPENSE") {
  const userId = await getAuthUserId();

  const categories = await prisma.category.findMany({
    where: {
      userId,
      isArchived: false,
      ...(type && { type }),
    },
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    icon: c.icon,
    budgetLimit: c.budgetLimit ? Number(c.budgetLimit) : null,
  }));
}
