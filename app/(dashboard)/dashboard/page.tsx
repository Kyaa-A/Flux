import { Suspense } from "react";
import {
  getDashboardStats,
  getRecentTransactions,
  getMonthlyChartData,
  getExpenseByCategory,
  getCategories,
  getWallets,
} from "@/lib/actions/dashboard";
import { getBudgetAlerts } from "@/lib/actions/budgets";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopCategories } from "@/components/dashboard/top-categories";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="border-border">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

async function StatsSection() {
  const stats = await getDashboardStats();
  return <StatsCards stats={stats} />;
}

async function BudgetAlertsSection() {
  const alerts = await getBudgetAlerts();
  return <BudgetAlerts alerts={alerts} />;
}

async function ChartsSection() {
  const [monthlyData, expenseData] = await Promise.all([
    getMonthlyChartData(),
    getExpenseByCategory(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <MonthlyChart data={monthlyData} />
      </div>
      <div className="space-y-6">
        <ExpenseDonut data={expenseData} />
        <TopCategories data={expenseData} />
      </div>
    </div>
  );
}

async function TransactionsSection() {
  const transactions = await getRecentTransactions(8);
  return <RecentTransactions transactions={transactions} />;
}

export default async function DashboardPage() {
  const [categories, wallets] = await Promise.all([
    getCategories(),
    getWallets(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s your financial overview.
          </p>
        </div>
        <QuickActions categories={categories} wallets={wallets} />
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Budget Alerts */}
      <Suspense fallback={null}>
        <BudgetAlertsSection />
      </Suspense>

      {/* Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
          </div>
        }
      >
        <ChartsSection />
      </Suspense>

      {/* Recent Transactions */}
      <Suspense fallback={<ChartSkeleton />}>
        <TransactionsSection />
      </Suspense>
    </div>
  );
}
