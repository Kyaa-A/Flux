import { getMonthlyReport } from "@/lib/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Target, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const metadata = {
  title: "Monthly Reports | Flux",
  description: "12-month profit & loss summary",
};

function formatRate(rate: number) {
  return `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}%`;
}

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = params.year ? parseInt(params.year, 10) : currentYear;
  const validYear = isNaN(year) ? currentYear : year;

  const { months, totals } = await getMonthlyReport(validYear);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/analytics">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Analytics
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monthly Reports</h1>
            <p className="text-muted-foreground">
              12-month profit & loss for {validYear}
            </p>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex gap-2">
          {yearOptions.map((y) => (
            <Button
              key={y}
              variant={y === validYear ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/analytics/reports?year=${y}`}>{y}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              {formatCurrency(totals.expense)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Net
            </CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {formatCurrency(totals.net)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Savings Rate
            </CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totals.savingsRate >= 20 ? "text-emerald-500"
              : totals.savingsRate >= 0 ? "text-amber-500"
              : "text-rose-500"
            }`}>
              {formatRate(totals.savingsRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown — {validYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground px-6 py-3">Month</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Income</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Expenses</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Net</th>
                  <th className="text-right font-medium text-muted-foreground px-6 py-3">Savings Rate</th>
                </tr>
              </thead>
              <tbody>
                {months.map((row, idx) => (
                  <tr
                    key={row.month}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-6 py-3 font-medium">{row.month}</td>
                    <td className="px-6 py-3 text-right text-emerald-500">
                      {row.income > 0 ? formatCurrency(row.income) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-rose-500">
                      {row.expense > 0 ? formatCurrency(row.expense) : "—"}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${
                      row.net > 0 ? "text-emerald-500"
                      : row.net < 0 ? "text-rose-500"
                      : "text-muted-foreground"
                    }`}>
                      {row.income === 0 && row.expense === 0 ? "—" : formatCurrency(row.net)}
                    </td>
                    <td className={`px-6 py-3 text-right ${
                      row.income === 0 ? "text-muted-foreground"
                      : row.savingsRate >= 20 ? "text-emerald-500"
                      : row.savingsRate >= 0 ? "text-amber-500"
                      : "text-rose-500"
                    }`}>
                      {row.income === 0 ? "—" : formatRate(row.savingsRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3 text-right text-emerald-500">
                    {formatCurrency(totals.income)}
                  </td>
                  <td className="px-6 py-3 text-right text-rose-500">
                    {formatCurrency(totals.expense)}
                  </td>
                  <td className={`px-6 py-3 text-right ${totals.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {formatCurrency(totals.net)}
                  </td>
                  <td className={`px-6 py-3 text-right ${
                    totals.savingsRate >= 20 ? "text-emerald-500"
                    : totals.savingsRate >= 0 ? "text-amber-500"
                    : "text-rose-500"
                  }`}>
                    {formatRate(totals.savingsRate)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
