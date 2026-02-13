import { prisma } from "@/lib/db";

const defaultCategories = [
  { name: "Salary", type: "INCOME" as const, color: "#22c55e", icon: "briefcase" },
  { name: "Freelance", type: "INCOME" as const, color: "#14b8a6", icon: "laptop" },
  { name: "Investment", type: "INCOME" as const, color: "#6366f1", icon: "trending-up" },
  { name: "Other Income", type: "INCOME" as const, color: "#8b5cf6", icon: "plus-circle" },
  { name: "Food & Dining", type: "EXPENSE" as const, color: "#f97316", icon: "utensils" },
  { name: "Transportation", type: "EXPENSE" as const, color: "#eab308", icon: "car" },
  { name: "Shopping", type: "EXPENSE" as const, color: "#ec4899", icon: "shopping-bag" },
  { name: "Entertainment", type: "EXPENSE" as const, color: "#f43f5e", icon: "gamepad-2" },
  { name: "Bills & Utilities", type: "EXPENSE" as const, color: "#06b6d4", icon: "file-text" },
  { name: "Healthcare", type: "EXPENSE" as const, color: "#10b981", icon: "heart-pulse" },
  { name: "Education", type: "EXPENSE" as const, color: "#3b82f6", icon: "graduation-cap" },
  { name: "Other Expense", type: "EXPENSE" as const, color: "#71717a", icon: "more-horizontal" },
];

export async function bootstrapUserWorkspace(userId: string) {
  const walletCount = await prisma.wallet.count({ where: { userId } });

  if (walletCount === 0) {
    await prisma.wallet.create({
      data: {
        name: "Cash",
        type: "CASH",
        balance: 0,
        color: "#22c55e",
        icon: "wallet",
        userId,
      },
    });
  }

  await prisma.category.createMany({
    data: defaultCategories.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}
