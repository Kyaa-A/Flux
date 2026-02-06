"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Pause, Play } from "lucide-react";
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
import { BudgetDialog } from "./budget-dialog";
import { deleteBudget, updateBudget } from "@/lib/actions/budgets";
import { useCurrency } from "@/components/providers/currency-provider";

interface BudgetCardProps {
  budget: {
    id: string;
    name: string;
    amount: number;
    period: string;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    categoryIds: string[];
    categories: Array<{ id: string; name: string; color: string }>;
    spent: number;
    remaining: number;
    percentUsed: number;
    isOverBudget: boolean;
  };
  allCategories: Array<{ id: string; name: string; color: string; type: string }>;
}

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function BudgetCard({ budget, allCategories }: BudgetCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const { formatAmount } = useCurrency();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteBudget(budget.id);
      toast.success("Budget deleted");
      router.refresh();
      setShowDelete(false);
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      await updateBudget(budget.id, { isActive: !budget.isActive });
      toast.success(budget.isActive ? "Budget paused" : "Budget resumed");
      router.refresh();
    });
  };

  const statusColor = budget.isOverBudget
    ? "text-destructive"
    : budget.percentUsed >= 80
    ? "text-amber-500"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <>
      <Card className={!budget.isActive ? "opacity-60" : ""}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">{budget.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {PERIOD_LABELS[budget.period] || budget.period}
                </Badge>
                {!budget.isActive && (
                  <Badge variant="outline" className="text-xs">
                    Paused
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <BudgetDialog
                  budget={budget}
                  categories={allCategories}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem onClick={handleToggleActive} disabled={isPending}>
                  {budget.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDelete(true)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-xl font-bold ${statusColor}`}>
                {formatAmount(budget.spent)}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatAmount(budget.amount)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(budget.percentUsed, 100)}%`,
                  backgroundColor: budget.isOverBudget
                    ? "hsl(var(--destructive))"
                    : budget.percentUsed >= 80
                    ? "#f59e0b"
                    : "#10b981",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {budget.percentUsed.toFixed(0)}% used
              </span>
              <span className="text-xs text-muted-foreground">
                {budget.remaining >= 0
                  ? `${formatAmount(budget.remaining)} left`
                  : `${formatAmount(Math.abs(budget.remaining))} over`}
              </span>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {budget.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{budget.name}&quot;? This cannot be undone.
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
    </>
  );
}
