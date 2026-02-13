"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRelativeTime } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string | null;
  notes?: string | null;
  date: Date;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  wallet: {
    id: string;
    name: string;
  };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { formatAmount } = useCurrency();

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MoreHorizontal className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              No transactions yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start tracking your finances by adding your first transaction.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/transactions">
              View all
              <ExternalLink className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-1">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${transaction.category.color}20` }}
                >
                  {transaction.type === "INCOME" ? (
                    <ArrowDownRight
                      className="w-5 h-5"
                      style={{ color: transaction.category.color }}
                    />
                  ) : transaction.type === "EXPENSE" ? (
                    <ArrowUpRight
                      className="w-5 h-5"
                      style={{ color: transaction.category.color }}
                    />
                  ) : (
                    <ArrowUpRight
                      className="w-5 h-5"
                      style={{ color: transaction.category.color }}
                    />
                  )}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {transaction.description || transaction.category.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      {transaction.wallet.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {transaction.category.name}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(transaction.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div
                className={`text-sm font-semibold ${
                  transaction.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : transaction.type === "EXPENSE"
                    ? "text-rose-600 dark:text-rose-400"
                    : (transaction.notes === "TRANSFER_IN"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400")
                }`}
              >
                {transaction.type === "INCOME"
                  ? "+"
                  : transaction.type === "EXPENSE"
                  ? "-"
                  : (transaction.notes === "TRANSFER_IN" ? "+" : "-")}
                {formatAmount(transaction.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
