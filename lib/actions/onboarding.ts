"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { onboardingSchema } from "@/lib/validations";
import type { WalletType } from "@/app/generated/prisma/client";

/**
 * Get data needed for the onboarding wizard (default wallet + categories)
 */
export async function getOnboardingData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [wallet, categories] = await Promise.all([
    prisma.wallet.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    wallet: wallet
      ? { ...wallet, balance: Number(wallet.balance) }
      : null,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon,
    })),
  };
}

/**
 * Complete onboarding — updates user preferences, default wallet, and optionally
 * records a first transaction.
 */
export async function completeOnboarding(data: {
  currency: string;
  locale: string;
  walletName: string;
  walletType: WalletType;
  walletColor: string;
  walletBalance: number;
  firstTransaction?: {
    type: "INCOME" | "EXPENSE";
    amount: number;
    description?: string;
    categoryId: string;
    date: Date;
  };
}) {
  const user = await requireAuth();

  const validated = onboardingSchema.parse(data);

  // Find the first (default) wallet to update
  const defaultWallet = await prisma.wallet.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!defaultWallet) {
    return { error: "No wallet found" };
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update user preferences and mark as onboarded
    await tx.user.update({
      where: { id: user.id },
      data: {
        currency: validated.currency,
        locale: validated.locale,
        onboardedAt: new Date(),
      },
    });

    // 2. Update the default wallet
    await tx.wallet.update({
      where: { id: defaultWallet.id },
      data: {
        name: validated.walletName,
        type: validated.walletType,
        color: validated.walletColor,
        currency: validated.currency,
        balance: validated.walletBalance,
      },
    });

    // 3. Optionally record a first transaction
    if (validated.firstTransaction) {
      const ft = validated.firstTransaction;

      await tx.transaction.create({
        data: {
          userId: user.id,
          walletId: defaultWallet.id,
          categoryId: ft.categoryId,
          type: ft.type,
          amount: ft.amount,
          description: ft.description,
          date: ft.date,
        },
      });

      // Adjust wallet balance
      await tx.wallet.update({
        where: { id: defaultWallet.id },
        data: {
          balance: {
            increment: ft.type === "INCOME" ? ft.amount : -ft.amount,
          },
        },
      });
    }
  });

  return { success: true };
}
