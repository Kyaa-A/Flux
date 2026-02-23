import { Plus, HandCoins, Wallet, CircleDollarSign, AlertTriangle } from "lucide-react";

import { getLoans, getLoanSummary } from "@/lib/actions/loans";
import { LoanDialog } from "@/components/loans/loan-dialog";
import { LoanCard } from "@/components/loans/loan-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Loans | Flux",
  description: "Track money people owe you",
};

export default async function LoansPage() {
  const [summary, loans] = await Promise.all([getLoanSummary(), getLoans()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Loans</h1>
          <p className="text-muted-foreground mt-1">
            Track people who borrowed money from you and repayment progress.
          </p>
        </div>

        <LoanDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Loan
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <HandCoins className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.totalOutstanding)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.activeLoans} active loan{summary.activeLoans !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalCollected)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Paid back so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lent</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalPrincipal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalLoans} total loan{summary.totalLoans !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.overdueLoans}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs follow-up</p>
          </CardContent>
        </Card>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <HandCoins className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No loans yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
              Add people who borrowed from you, then track how much they have repaid.
            </p>
            <LoanDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Loan
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
}
