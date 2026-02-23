"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface SearchResultItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchResults {
  transactions: SearchResultItem[];
  wallets: SearchResultItem[];
  categories: SearchResultItem[];
  pages: SearchResultItem[];
}

const PAGE_INDEX: Array<{ id: string; label: string; href: string; keywords: string[] }> = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", keywords: ["home", "overview"] },
  { id: "transactions", label: "Transactions", href: "/transactions", keywords: ["income", "expense", "transfer"] },
  { id: "wallets", label: "Wallets", href: "/wallets", keywords: ["accounts", "cards", "cash"] },
  { id: "loans", label: "Loans", href: "/loans", keywords: ["borrowed", "owed", "iou", "repayment"] },
  { id: "categories", label: "Categories", href: "/categories", keywords: ["tags"] },
  { id: "budgets", label: "Budgets", href: "/budgets", keywords: ["limits", "spending"] },
  { id: "recurring", label: "Recurring", href: "/transactions/recurring", keywords: ["subscriptions"] },
  { id: "analytics", label: "Analytics", href: "/analytics", keywords: ["reports", "insights"] },
  { id: "notifications", label: "Notifications", href: "/notifications", keywords: ["alerts"] },
  { id: "settings", label: "Settings", href: "/settings", keywords: ["profile", "preferences"] },
  { id: "admin", label: "Admin", href: "/admin", keywords: ["users", "audit", "system"] },
];

const EMPTY_RESULTS: SearchResults = {
  transactions: [],
  wallets: [],
  categories: [],
  pages: [],
};

export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const query = rawQuery.trim();
  if (query.length < 2) {
    return EMPTY_RESULTS;
  }

  const userId = session.user.id;

  const [transactions, wallets, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } },
          { wallet: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: {
        category: { select: { name: true } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.wallet.findMany({
      where: {
        userId,
        isArchived: false,
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, type: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.category.findMany({
      where: {
        userId,
        isArchived: false,
        name: { contains: query, mode: "insensitive" },
      },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
  ]);

  const normalizedQuery = query.toLowerCase();
  const pages = PAGE_INDEX.filter((page) => {
    if (page.id === "admin" && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return false;
    }
    if (page.label.toLowerCase().includes(normalizedQuery)) return true;
    return page.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));
  }).map((page) => ({
    id: page.id,
    label: page.label,
    href: page.href,
  }));

  return {
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      label: transaction.description || transaction.category.name,
      sublabel: `${transaction.wallet.name} - ${transaction.category.name}`,
      href: "/transactions",
    })),
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      label: wallet.name,
      sublabel: wallet.type.replaceAll("_", " "),
      href: "/wallets",
    })),
    categories: categories.map((category) => ({
      id: category.id,
      label: category.name,
      sublabel: category.type,
      href: `/transactions?category=${category.id}`,
    })),
    pages,
  };
}
