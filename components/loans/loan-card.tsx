"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  HandCoins,
  Pencil,
  Plus,
  Trash2,
  User,
  AlertCircle,
} from "lucide-react";

import { deleteLoan, deleteLoanRepayment } from "@/lib/actions/loans";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { LoanDialog } from "@/components/loans/loan-dialog";
import { RepaymentDialog } from "@/components/loans/repayment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface LoanRepaymentItem {
  id: string;
  amount: number;
  paidAt: Date | string;
  notes: string | null;
}

interface LoanItem {
  id: string;
  borrowerName: string;
  principalAmount: number;
  outstandingAmount: number;
  borrowedAt: Date | string;
  dueDate: Date | string | null;
  notes: string | null;
  status: "OPEN" | "PARTIAL" | "OVERDUE" | "PAID";
  repayments: LoanRepaymentItem[];
}

interface LoanCardProps {
  loan: LoanItem;
}

const STATUS_STYLES: Record<LoanItem["status"], { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  PARTIAL: { label: "Partial", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  OVERDUE: { label: "Overdue", className: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  PAID: { label: "Paid", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

export function LoanCard({ loan }: LoanCardProps) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const collectedAmount = Math.max(0, loan.principalAmount - loan.outstandingAmount);
  const progress =
    loan.principalAmount > 0
      ? Math.min(100, Math.max(0, (collectedAmount / loan.principalAmount) * 100))
      : 0;

  const statusStyle = STATUS_STYLES[loan.status];

  const onDeleteLoan = () => {
    startTransition(async () => {
      try {
        const result = await deleteLoan(loan.id);
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
        ) {
          toast.error(result.error);
          return;
        }
        toast.success("Loan deleted");
        router.refresh();
        setShowDeleteDialog(false);
      } catch {
        toast.error("Failed to delete loan");
      }
    });
  };

  const onDeleteRepayment = (repaymentId: string) => {
    startTransition(async () => {
      try {
        const result = await deleteLoanRepayment(loan.id, repaymentId);
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
        ) {
          toast.error(result.error);
          return;
        }
        toast.success("Repayment removed");
        router.refresh();
      } catch {
        toast.error("Failed to remove repayment");
      }
    });
  };

  return (
    <>
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2 truncate">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{loan.borrowerName}</span>
              </CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className={statusStyle.className}>
                  {statusStyle.label}
                </Badge>
                {loan.status === "OVERDUE" && <AlertCircle className="h-4 w-4 text-rose-500" />}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <LoanDialog
                loan={loan}
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Edit loan">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                aria-label="Delete loan"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Original Amount</p>
              <p className="text-sm font-semibold">{formatAmount(loan.principalAmount)}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className={`text-sm font-semibold ${loan.outstandingAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatAmount(loan.outstandingAmount)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatAmount(collectedAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Repayment Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Borrowed: {formatDate(loan.borrowedAt)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              Due: {loan.dueDate ? formatDate(loan.dueDate) : "No due date"}
            </span>
          </div>

          {loan.notes && (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/20 px-3 py-2">
              {loan.notes}
            </p>
          )}

          <div className="flex gap-2">
            <RepaymentDialog
              loanId={loan.id}
              borrowerName={loan.borrowerName}
              outstandingAmount={loan.outstandingAmount}
              trigger={
                <Button className="flex-1" disabled={loan.outstandingAmount <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Repayment
                </Button>
              }
            />
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Repayments</p>
            {loan.repayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {loan.repayments.slice(0, 6).map((repayment) => (
                  <div
                    key={repayment.id}
                    className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium inline-flex items-center gap-1">
                        <HandCoins className="h-3.5 w-3.5 text-emerald-500" />
                        {formatAmount(repayment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(repayment.paidAt)}
                        {repayment.notes ? ` • ${repayment.notes}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteRepayment(repayment.id)}
                      disabled={isPending}
                      aria-label="Delete repayment"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {loan.repayments.length > 6 && (
                  <p className="text-xs text-muted-foreground">
                    Showing latest 6 repayments.
                  </p>
                )}
              </div>
            )}
          </div>

          {loan.outstandingAmount <= 0 && (
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Fully paid
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Delete loan record for &quot;{loan.borrowerName}&quot; and all repayment history?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteLoan}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
