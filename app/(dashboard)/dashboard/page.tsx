import { Suspense } from "react";
import {
  getDashboardStats,
  getRecentTransactions,
  getMonthlyChartData,
  getExpenseByCategory,
  getNetWorthTrend,
  getCategories,
  getWallets,
} from "@/lib/actions/dashboard";
import { getUpcomingRecurringTransactions } from "@/lib/actions/recurring";
import { getBudgetAlerts } from "@/lib/actions/budgets";
import { auth } from "@/lib/auth";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { MonthlyChart } from "@/components/charts/monthly-chart";
import { ExpenseDonut } from "@/components/charts/expense-donut";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopCategories } from "@/components/dashboard/top-categories";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { BudgetAlerts } from "@/components/dashboard/budget-alerts";
import { NetWorthTrend } from "@/components/dashboard/net-worth-trend";
import { UpcomingRecurring } from "@/components/dashboard/upcoming-recurring";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
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

async function BudgetAlertsSection({
  currency,
  locale,
}: {
  currency: string;
  locale: string;
}) {
  const alerts = await getBudgetAlerts();
  return <BudgetAlerts alerts={alerts} currency={currency} locale={locale} />;
}

async function ChartsSection({
  currency,
  locale,
}: {
  currency: string;
  locale: string;
}) {
  const [monthlyData, expenseData, netWorthData] = await Promise.all([
    getMonthlyChartData(),
    getExpenseByCategory(),
    getNetWorthTrend(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
      <div className="lg:col-span-4">
        <MonthlyChart data={monthlyData} />
      </div>
      <div className="lg:col-span-2">
        <ExpenseDonut data={expenseData} />
      </div>
      <div className="lg:col-span-3">
        <NetWorthTrend data={netWorthData} />
      </div>
      <div className="lg:col-span-3">
        <UpcomingRecurringSection currency={currency} locale={locale} />
      </div>
    </div>
  );
}

async function UpcomingRecurringSection({
  currency,
  locale,
}: {
  currency: string;
  locale: string;
}) {
  const recurring = await getUpcomingRecurringTransactions(5);
  return <UpcomingRecurring items={recurring} currency={currency} locale={locale} />;
}

async function TransactionsAndTopSpendingSection({
  currency,
  locale,
}: {
  currency: string;
  locale: string;
}) {
  const [transactions, expenseData] = await Promise.all([
    getRecentTransactions(8),
    getExpenseByCategory(),
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <RecentTransactions transactions={transactions} />
      </div>
      <div>
        <TopCategories data={expenseData} currency={currency} locale={locale} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [session, categories, wallets] = await Promise.all([
    auth(),
    getCategories(),
    getWallets(),
  ]);
  const currency = session?.user?.currency ?? "USD";
  const locale = session?.user?.locale ?? "en-US";

  return (
    <div className="space-y-4 sm:space-y-6">
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
        <BudgetAlertsSection currency={currency} locale={locale} />
      </Suspense>

      {/* Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            <div className="lg:col-span-4">
              <ChartSkeleton />
            </div>
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <div className="lg:col-span-3">
              <ChartSkeleton />
            </div>
            <div className="lg:col-span-3">
              <ChartSkeleton />
            </div>
          </div>
        }
      >
        <ChartsSection currency={currency} locale={locale} />
      </Suspense>

      {/* Recent Transactions */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
          </div>
        }
      >
        <TransactionsAndTopSpendingSection currency={currency} locale={locale} />
      </Suspense>
    </div>
  );
}
