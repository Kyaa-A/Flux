"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  updateProfileSchema,
  changePasswordSchema,
  notificationPreferencesSchema,
} from "@/lib/validations";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getUserNotificationPreferences,
} from "@/lib/notifications";
import { logAuditAction } from "@/lib/audit";

/**
 * Get current user profile
 */
export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      currency: true,
      locale: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          wallets: true,
          categories: true,
        },
      },
    },
  });

  return user;
}

/**
 * Get linked sign-in methods for current user
 */
export async function getLinkedSignInMethods() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      password: true,
      accounts: {
        select: { provider: true },
      },
    },
  });

  const providers = new Set<string>();
  if (user?.password) providers.add("credentials");
  for (const account of user?.accounts || []) {
    providers.add(account.provider);
  }

  return {
    hasCredentials: providers.has("credentials"),
    hasGoogle: providers.has("google"),
    hasGithub: providers.has("github"),
    providers: Array.from(providers),
  };
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
  name?: string;
  currency?: string;
  locale?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = updateProfileSchema.parse(data);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: validated.name,
      currency: validated.currency,
      locale: validated.locale,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Change password
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validated = changePasswordSchema.parse(data);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return { error: "Cannot change password for OAuth accounts" };
  }

  const isValid = await bcrypt.compare(validated.currentPassword, user.password);
  if (!isValid) {
    return { error: "Current password is incorrect" };
  }

  const hashedPassword = await bcrypt.hash(validated.newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  await logAuditAction({
    action: "AUTH_PASSWORD_CHANGE_SUCCESS",
    actorId: session.user.id,
    targetUserId: session.user.id,
  });

  return { success: true };
}

/**
 * Delete account
 */
export async function deleteAccount(password: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (user?.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { error: "Password is incorrect" };
    }
  }

  await logAuditAction({
    action: "AUTH_ACCOUNT_DELETE_SUCCESS",
    actorId: session.user.id,
    targetUserId: session.user.id,
  });

  // Delete user (cascades to all related data)
  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return { success: true };
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return getUserNotificationPreferences(session.user.id);
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(data: {
  budgetWarnings?: boolean;
  budgetExceeded?: boolean;
  recurringProcessed?: boolean;
  adminAccountStatus?: boolean;
  largeTransaction?: boolean;
  largeTransactionThreshold?: number | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const current = await getUserNotificationPreferences(session.user.id);
  const merged = { ...current, ...data };
  const validated = notificationPreferencesSchema.parse(merged);

  const normalizedThreshold = validated.largeTransaction
    ? validated.largeTransactionThreshold
    : null;

  const toSave = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...validated,
    largeTransactionThreshold: normalizedThreshold,
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: toSave },
  });

  revalidatePath("/settings");
  return { success: true, preferences: toSave };
}

/**
 * Export transactions as CSV
 */
export async function exportTransactionsCSV(dateRange?: { from?: Date; to?: Date }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = {
    userId: session.user.id,
  };

  if (dateRange?.from || dateRange?.to) {
    where.date = {};
    if (dateRange.from) where.date.gte = dateRange.from;
    if (dateRange.to) where.date.lte = dateRange.to;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      type: true,
      amount: true,
      description: true,
      category: { select: { name: true } },
      wallet: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const header = "Date,Type,Amount,Category,Wallet,Description";
  const rows = transactions.map((t) => {
    const date = new Date(t.date).toISOString().split("T")[0];
    const desc = (t.description || "").replace(/"/g, '""');
    return `${date},${t.type},${Number(t.amount)},"${t.category.name}","${t.wallet.name}","${desc}"`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Import transactions from CSV data
 */
export async function importTransactionsCSV(rows: Array<{
  date: string;
  type: string;
  amount: number;
  category: string;
  wallet: string;
  description: string;
}>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Get or create categories and wallets
  const categoryMap = new Map<string, string>();
  const walletMap = new Map<string, string>();

  // Fetch existing categories and wallets
  const [existingCategories, existingWallets] = await Promise.all([
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
    prisma.wallet.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  for (const cat of existingCategories) {
    categoryMap.set(`${cat.name}:${cat.type}`, cat.id);
  }
  for (const wal of existingWallets) {
    walletMap.set(wal.name, wal.id);
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const type = row.type.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";
    const amount = Number(row.amount);

    if (isNaN(amount) || amount <= 0) {
      skipped++;
      continue;
    }

    // Get or create category
    const catKey = `${row.category}:${type}`;
    let categoryId = categoryMap.get(catKey);
    if (!categoryId) {
      const newCat = await prisma.category.create({
        data: { name: row.category, type, userId },
      });
      categoryId = newCat.id;
      categoryMap.set(catKey, categoryId);
    }

    // Get or create wallet
    let walletId = walletMap.get(row.wallet);
    if (!walletId) {
      const newWallet = await prisma.wallet.create({
        data: { name: row.wallet, userId },
      });
      walletId = newWallet.id;
      walletMap.set(row.wallet, walletId);
    }

    // Create transaction
    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      skipped++;
      continue;
    }

    const balanceChange = type === "INCOME" ? amount : -amount;
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          amount,
          type,
          description: row.description || null,
          date,
          userId,
          walletId,
          categoryId,
        },
      }),
      prisma.wallet.update({
        where: { id: walletId, userId },
        data: { balance: { increment: balanceChange } },
      }),
    ]);

    imported++;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/wallets");

  return { imported, skipped };
}

/**
 * Export user data
 */
export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [user, wallets, categories, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        currency: true,
        locale: true,
        createdAt: true,
      },
    }),
    prisma.wallet.findMany({
      where: { userId: session.user.id },
      select: {
        name: true,
        type: true,
        balance: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id },
      select: {
        name: true,
        type: true,
        budgetLimit: true,
        createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: {
        amount: true,
        type: true,
        description: true,
        date: true,
        category: { select: { name: true } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    wallets: wallets.map((w) => ({ ...w, balance: Number(w.balance) })),
    categories: categories.map((c) => ({
      ...c,
      budgetLimit: c.budgetLimit ? Number(c.budgetLimit) : null,
    })),
    transactions: transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      category: t.category.name,
      wallet: t.wallet.name,
    })),
  };
}
