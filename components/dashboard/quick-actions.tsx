"use client";

import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/forms/transaction-dialog";

interface QuickActionsProps {
  categories: Array<{ id: string; name: string; type: string; color: string; icon: string }>;
  wallets: Array<{ id: string; name: string; balance: number; color: string; icon: string }>;
}

export function QuickActions({ categories, wallets }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <TransactionDialog
        categories={categories}
        wallets={wallets}
        defaultType="INCOME"
        trigger={
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span className="hidden sm:inline">Add Income</span>
          </Button>
        }
      />
      
      <TransactionDialog
        categories={categories}
        wallets={wallets}
        defaultType="EXPENSE"
        trigger={
          <Button
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="hidden sm:inline">Add Expense</span>
          </Button>
        }
      />
    </div>
  );
}
