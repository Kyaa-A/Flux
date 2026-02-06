"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { WalletType } from "@/app/generated/prisma/client";

/**
 * Get all wallets for the current user
 */
export async function getWallets(includeArchived = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallets = await prisma.wallet.findMany({
    where: {
      userId: session.user.id,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { createdAt: "asc" },
  });

  return wallets.map((w) => ({
    ...w,
    balance: Number(w.balance),
  }));
}

/**
 * Get wallet by ID
 */
export async function getWallet(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await prisma.wallet.findUnique({
    where: { id, userId: session.user.id },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!wallet) return null;

  return {
    ...wallet,
    balance: Number(wallet.balance),
  };
}

/**
 * Create a new wallet
 */
export async function createWallet(data: {
  name: string;
  type: WalletType;
  balance?: number;
  currency?: string;
  color?: string;
  icon?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await prisma.wallet.create({
    data: {
      ...data,
      balance: data.balance || 0,
      userId: session.user.id,
    },
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");

  return { ...wallet, balance: Number(wallet.balance) };
}

/**
 * Update a wallet
 */
export async function updateWallet(
  id: string,
  data: {
    name?: string;
    type?: WalletType;
    color?: string;
    icon?: string;
    isArchived?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await prisma.wallet.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");

  return { ...wallet, balance: Number(wallet.balance) };
}

/**
 * Delete a wallet (only if no transactions)
 */
export async function deleteWallet(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Check for transactions
  const transactionCount = await prisma.transaction.count({
    where: { walletId: id },
  });

  if (transactionCount > 0) {
    return { error: "Cannot delete wallet with transactions. Archive it instead." };
  }

  await prisma.wallet.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/wallets");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Transfer between wallets
 */
export async function transferBetweenWallets(
  fromWalletId: string,
  toWalletId: string,
  amount: number,
  description?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify both wallets belong to user
  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({
      where: { id: fromWalletId, userId: session.user.id },
    }),
    prisma.wallet.findUnique({
      where: { id: toWalletId, userId: session.user.id },
    }),
  ]);

  if (!fromWallet || !toWallet) {
    return { error: "Wallet not found" };
  }

  // Create transfer category if doesn't exist
  let transferCategory = await prisma.category.findFirst({
    where: {
      userId: session.user.id,
      name: "Transfer",
      type: "EXPENSE",
    },
  });

  if (!transferCategory) {
    transferCategory = await prisma.category.create({
      data: {
        name: "Transfer",
        type: "EXPENSE",
        color: "#64748b",
        icon: "arrow-right-left",
        userId: session.user.id,
      },
    });
  }

  // Create expense from source wallet
  await prisma.transaction.create({
    data: {
      amount,
      type: "EXPENSE",
      description: description || `Transfer to ${toWallet.name}`,
      date: new Date(),
      categoryId: transferCategory.id,
      walletId: fromWalletId,
      userId: session.user.id,
    },
  });

  // Create income to destination wallet
  await prisma.transaction.create({
    data: {
      amount,
      type: "INCOME",
      description: description || `Transfer from ${fromWallet.name}`,
      date: new Date(),
      categoryId: transferCategory.id,
      walletId: toWalletId,
      userId: session.user.id,
    },
  });

  // Update wallet balances
  await Promise.all([
    prisma.wallet.update({
      where: { id: fromWalletId },
      data: { balance: { decrement: amount } },
    }),
    prisma.wallet.update({
      where: { id: toWalletId },
      data: { balance: { increment: amount } },
    }),
  ]);

  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Get wallet summary
 */
export async function getWalletSummary() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallets = await prisma.wallet.findMany({
    where: {
      userId: session.user.id,
      isArchived: false,
    },
  });

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const totalAssets = wallets
    .filter((w) => Number(w.balance) > 0)
    .reduce((sum, w) => sum + Number(w.balance), 0);
  const totalLiabilities = wallets
    .filter((w) => Number(w.balance) < 0)
    .reduce((sum, w) => sum + Math.abs(Number(w.balance)), 0);

  return {
    totalBalance,
    totalAssets,
    totalLiabilities,
    walletCount: wallets.length,
    byType: Object.entries(
      wallets.reduce((acc, w) => {
        acc[w.type] = (acc[w.type] || 0) + Number(w.balance);
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, balance]) => ({ type, balance })),
  };
}

/**
 * Get wallet distribution data for charts
 */
export async function getWalletDistribution() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallets = await prisma.wallet.findMany({
    where: { userId: session.user.id, isArchived: false },
    select: { name: true, balance: true, color: true },
  });

  return wallets.map((w) => ({
    name: w.name,
    balance: Number(w.balance),
    color: w.color,
  }));
}
