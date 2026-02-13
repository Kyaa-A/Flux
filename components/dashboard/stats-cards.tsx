"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

interface StatsCardsProps {
  stats: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    monthlySavings: number;
    incomeChange: number;
    expenseChange: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { formatAmount } = useCurrency();

  const cards = [
    {
      title: "Total Balance",
      value: formatAmount(stats.totalBalance),
      icon: Wallet,
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-500",
      href: "/wallets",
    },
    {
      title: "Monthly Income",
      value: formatAmount(stats.monthlyIncome),
      change: stats.incomeChange,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-green-600",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-500",
      positive: true,
      href: "/transactions?type=INCOME",
    },
    {
      title: "Monthly Expenses",
      value: formatAmount(stats.monthlyExpense),
      change: stats.expenseChange,
      icon: TrendingDown,
      gradient: "from-rose-500 to-red-600",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-500",
      positive: false,
      href: "/transactions?type=EXPENSE",
    },
    {
      title: "Monthly Savings",
      value: formatAmount(stats.monthlySavings),
      icon: PiggyBank,
      gradient: "from-cyan-500 to-blue-600",
      iconBg: "bg-cyan-500/20",
      iconColor: "text-cyan-500",
      isSavings: true,
      savingsPositive: stats.monthlySavings >= 0,
      href: "/analytics",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="relative border-border hover:border-border/80 transition-colors overflow-hidden group cursor-pointer h-full py-4 sm:py-6">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${card.gradient}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  card.isSavings
                    ? card.savingsPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                }`}
              >
                {card.value}
              </div>
              {card.change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {card.change >= 0 ? (
                    <ArrowUpRight
                      className={`w-4 h-4 ${
                        card.positive ? "text-emerald-500" : "text-rose-500"
                      }`}
                    />
                  ) : (
                    <ArrowDownRight
                      className={`w-4 h-4 ${
                        card.positive ? "text-rose-500" : "text-emerald-500"
                      }`}
                    />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      (card.positive && card.change >= 0) ||
                      (!card.positive && card.change < 0)
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    {formatPercentage(Math.abs(card.change))}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
