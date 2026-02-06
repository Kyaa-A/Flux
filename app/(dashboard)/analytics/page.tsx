import { Suspense } from "react";
import { getTransactionStats, getSavingsTrend } from "@/lib/actions/transactions";
import { getCategorySpending } from "@/lib/actions/categories";
import { getWalletSummary, getWalletDistribution } from "@/lib/actions/wallets";
import { SpendingByCategory } from "@/components/analytics/spending-by-category";
import { IncomeVsExpense } from "@/components/analytics/income-vs-expense";
import { WalletDistribution } from "@/components/analytics/wallet-distribution";
import { SavingsTrend } from "@/components/analytics/savings-trend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  BarChart3,
  Target,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export const metadata = {
  title: "Analytics | Flux",
  description: "Track your spending patterns and financial insights",
};

async function OverviewCards() {
  const [stats, walletSummary] = await Promise.all([
    getTransactionStats("month"),
    getWalletSummary(),
  ]);

  const savingsRate = stats.totalIncome > 0 
    ? ((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Income
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatCurrency(stats.totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Expenses
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-500">
            {formatCurrency(stats.totalExpense)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Worth
          </CardTitle>
          <Wallet className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            walletSummary.totalBalance >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}>
            {formatCurrency(walletSummary.totalBalance)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Savings Rate
          </CardTitle>
          <Target className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            savingsRate >= 20 ? "text-emerald-500" : savingsRate >= 0 ? "text-amber-500" : "text-rose-500"
          }`}>
            {formatPercentage(savingsRate)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {savingsRate >= 20 ? "Great!" : savingsRate >= 0 ? "Keep saving" : "Overspending"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-32 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function CategoryBreakdown() {
  const spending = await getCategorySpending("month");
  const totalSpent = spending.reduce((sum, c) => sum + c.spent, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          <CardTitle>Spending by Category</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {spending.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No expenses this month
          </p>
        ) : (
          <div className="space-y-4">
            {spending
              .sort((a, b) => b.spent - a.spent)
              .map((category) => {
                const percentage = totalSpent > 0 ? (category.spent / totalSpent) * 100 : 0;
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {formatPercentage(percentage)}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(category.spent)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    {category.budget && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Budget: {formatCurrency(category.budget)}</span>
                        <span className={category.isOverBudget ? "text-rose-500" : ""}>
                          {formatPercentage(category.percentUsed || 0)} used
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function TrendAnalysis() {
  const [weekStats, monthStats, yearStats] = await Promise.all([
    getTransactionStats("week"),
    getTransactionStats("month"),
    getTransactionStats("year"),
  ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle>Period Comparison</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">This Week</p>
            <p className="text-lg font-bold text-emerald-500">
              +{formatCurrency(weekStats.totalIncome)}
            </p>
            <p className="text-lg font-bold text-rose-500">
              -{formatCurrency(weekStats.totalExpense)}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">This Month</p>
            <p className="text-lg font-bold text-emerald-500">
              +{formatCurrency(monthStats.totalIncome)}
            </p>
            <p className="text-lg font-bold text-rose-500">
              -{formatCurrency(monthStats.totalExpense)}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">This Year</p>
            <p className="text-lg font-bold text-emerald-500">
              +{formatCurrency(yearStats.totalIncome)}
            </p>
            <p className="text-lg font-bold text-rose-500">
              -{formatCurrency(yearStats.totalExpense)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function WalletDistributionSection() {
  const walletData = await getWalletDistribution();
  return <WalletDistribution data={walletData} />;
}

async function SavingsTrendSection() {
  const savingsData = await getSavingsTrend();
  return <SavingsTrend data={savingsData} />;
}

function AnalyticsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-48 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Understand your spending patterns and financial health
        </p>
      </div>

      {/* Overview Cards */}
      <Suspense fallback={<CardsSkeleton />}>
        <OverviewCards />
      </Suspense>

      {/* Main Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <CategoryBreakdown />
        </Suspense>
        
        <Suspense fallback={<AnalyticsSkeleton />}>
          <TrendAnalysis />
        </Suspense>
      </div>

      {/* Savings & Wallet Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <SavingsTrendSection />
        </Suspense>
        <Suspense fallback={<AnalyticsSkeleton />}>
          <WalletDistributionSection />
        </Suspense>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<AnalyticsSkeleton />}>
            <IncomeVsExpense />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<AnalyticsSkeleton />}>
                <SpendingByCategory type="INCOME" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<AnalyticsSkeleton />}>
                <SpendingByCategory type="EXPENSE" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
