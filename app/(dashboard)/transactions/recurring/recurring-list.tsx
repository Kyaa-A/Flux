"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Pause, Play, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteRecurringTransaction,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
} from "@/lib/actions/recurring";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

interface RecurringItem {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  description: string | null;
  frequency: string;
  nextRunDate: Date;
  lastRunAt: Date | null;
  isActive: boolean;
  category: { id: string; name: string; color: string; icon: string };
  wallet: { id: string; name: string };
}

export function RecurringList({ recurring }: { recurring: RecurringItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { formatAmount } = useCurrency();

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      if (isActive) {
        await pauseRecurringTransaction(id);
      } else {
        await resumeRecurringTransaction(id);
      }
      toast.success(isActive ? "Recurring paused" : "Recurring resumed");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      await deleteRecurringTransaction(deleteId);
      toast.success("Recurring transaction deleted");
      setDeleteId(null);
      router.refresh();
    });
  };

  if (recurring.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Repeat className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No recurring transactions</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create a recurring transaction for subscriptions, bills, or regular income.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {recurring.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-4 ${
              index < recurring.length - 1 ? "border-b" : ""
            } ${!item.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${item.category.color}20` }}
              >
                <Repeat className="w-4 h-4" style={{ color: item.category.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.description || item.category.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {FREQ_LABELS[item.frequency] || item.frequency}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.wallet.name}
                  </span>
                  {!item.isActive && (
                    <Badge variant="outline" className="text-xs">Paused</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  item.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {item.type === "INCOME" ? "+" : "-"}{formatAmount(item.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Next: {formatDate(item.nextRunDate)}
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleToggle(item.id, item.isActive)}>
                    {item.isActive ? (
                      <><Pause className="h-4 w-4 mr-2" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Resume</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
