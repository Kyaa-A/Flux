import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Now import other modules
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("📡 Connecting to database...");
console.log("   Host:", connectionString.split("@")[1]?.split("/")[0] || "unknown");

// Create Neon adapter for Prisma 7 - pass connectionString directly
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Create passwords
  const demoPassword = await bcrypt.hash("Demo123!", 12);
  const adminPassword = await bcrypt.hash("Admin123!", 12);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@flux.app" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@flux.app",
      password: adminPassword,
      role: "SUPER_ADMIN",
      currency: "USD",
    },
  });
  console.log("🔐 Created super admin:", superAdmin.email);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@flux.app" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@flux.app",
      password: adminPassword,
      role: "ADMIN",
      currency: "USD",
    },
  });
  console.log("🔐 Created admin:", admin.email);

  // Create a demo user (regular user)
  const user = await prisma.user.upsert({
    where: { email: "demo@flux.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@flux.app",
      password: demoPassword,
      role: "USER",
      currency: "USD",
    },
  });

  console.log("👤 Created user:", user.email);


  // Create wallets
  const wallets = await Promise.all([
    prisma.wallet.create({
      data: {
        name: "Cash",
        type: "CASH",
        balance: 500,
        color: "#22c55e",
        icon: "wallet",
        userId: user.id,
      },
    }),
    prisma.wallet.create({
      data: {
        name: "Bank Account",
        type: "BANK_ACCOUNT",
        balance: 5000,
        color: "#3b82f6",
        icon: "landmark",
        userId: user.id,
      },
    }),
    prisma.wallet.create({
      data: {
        name: "Credit Card",
        type: "CREDIT_CARD",
        balance: -1200,
        color: "#f43f5e",
        icon: "credit-card",
        userId: user.id,
      },
    }),
  ]);

  console.log("💳 Created wallets:", wallets.length);

  // Create categories
  const incomeCategories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Salary",
        type: "INCOME",
        color: "#22c55e",
        icon: "briefcase",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Freelance",
        type: "INCOME",
        color: "#14b8a6",
        icon: "laptop",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Investment",
        type: "INCOME",
        color: "#6366f1",
        icon: "trending-up",
        userId: user.id,
      },
    }),
  ]);

  const expenseCategories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Food & Dining",
        type: "EXPENSE",
        color: "#f97316",
        icon: "utensils",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Transportation",
        type: "EXPENSE",
        color: "#eab308",
        icon: "car",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Shopping",
        type: "EXPENSE",
        color: "#ec4899",
        icon: "shopping-bag",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Entertainment",
        type: "EXPENSE",
        color: "#f43f5e",
        icon: "gamepad-2",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Bills & Utilities",
        type: "EXPENSE",
        color: "#06b6d4",
        icon: "file-text",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Healthcare",
        type: "EXPENSE",
        color: "#10b981",
        icon: "heart-pulse",
        userId: user.id,
      },
    }),
  ]);

  console.log("🏷️  Created categories:", incomeCategories.length + expenseCategories.length);

  // Generate transactions for the last 6 months
  const transactions = [];
  const now = new Date();

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);

    // Monthly salary (on the 1st)
    transactions.push({
      amount: 5000 + Math.random() * 500,
      type: "INCOME" as const,
      description: "Monthly Salary",
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      categoryId: incomeCategories[0].id,
      walletId: wallets[1].id, // Bank Account
      userId: user.id,
    });

    // Random freelance income (1-2 per month)
    const freelanceCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < freelanceCount; i++) {
      transactions.push({
        amount: 200 + Math.random() * 800,
        type: "INCOME" as const,
        description: "Freelance project",
        date: new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          Math.floor(Math.random() * 28) + 1
        ),
        categoryId: incomeCategories[1].id,
        walletId: wallets[1].id,
        userId: user.id,
      });
    }

    // Random expenses (10-20 per month)
    const expenseCount = Math.floor(Math.random() * 10) + 10;
    for (let i = 0; i < expenseCount; i++) {
      const category =
        expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const wallet = wallets[Math.floor(Math.random() * wallets.length)];

      const expenseAmounts: { [key: string]: [number, number] } = {
        "Food & Dining": [10, 100],
        Transportation: [5, 50],
        Shopping: [20, 300],
        Entertainment: [10, 100],
        "Bills & Utilities": [50, 200],
        Healthcare: [20, 200],
      };

      const [min, max] = expenseAmounts[category.name] || [10, 100];
      const amount = min + Math.random() * (max - min);

      transactions.push({
        amount: Math.round(amount * 100) / 100,
        type: "EXPENSE" as const,
        description: `${category.name} expense`,
        date: new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          Math.floor(Math.random() * 28) + 1
        ),
        categoryId: category.id,
        walletId: wallet.id,
        userId: user.id,
      });
    }
  }

  await prisma.transaction.createMany({
    data: transactions,
  });

  console.log("💸 Created transactions:", transactions.length);

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📧 Login Credentials:");
  console.log("   ┌──────────────────────────────────────────────────┐");
  console.log("   │ SUPER ADMIN                                       │");
  console.log("   │   Email: superadmin@flux.app                     │");
  console.log("   │   Password: Admin123!                            │");
  console.log("   ├──────────────────────────────────────────────────┤");
  console.log("   │ ADMIN                                            │");
  console.log("   │   Email: admin@flux.app                          │");
  console.log("   │   Password: Admin123!                            │");
  console.log("   ├──────────────────────────────────────────────────┤");
  console.log("   │ DEMO USER                                        │");
  console.log("   │   Email: demo@flux.app                           │");
  console.log("   │   Password: Demo123!                             │");
  console.log("   └──────────────────────────────────────────────────┘");
}


main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
