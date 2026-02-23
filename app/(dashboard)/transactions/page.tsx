import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getTransactions, getTransactionStats } from "@/lib/actions/transactions";
import { getCategories } from "@/lib/actions/categories";
import { getWallets } from "@/lib/actions/wallets";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Transactions | Flux",
  description: "Manage your income, expenses, and transfers",
};

async function TransactionStats({
  currency,
  locale,
}: {
  currency: string;
  locale: string;
}) {
  const stats = await getTransactionStats("month");
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Income (This Month)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatCurrency(stats.totalIncome, currency, locale)}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expenses (This Month)
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-500">
            {formatCurrency(stats.totalExpense, currency, locale)}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net (This Month)
          </CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            stats.totalIncome - stats.totalExpense >= 0 
              ? "text-emerald-500" 
              : "text-rose-500"
          }`}>
            {formatCurrency(stats.totalIncome - stats.totalExpense, currency, locale)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string; 
    type?: string; 
    category?: string; 
    wallet?: string;
    search?: string;
  }>;
}) {
  const session = await auth();
  const currency = session?.user?.currency ?? "USD";
  const locale = session?.user?.locale ?? "en-US";
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const type = params.type as "INCOME" | "EXPENSE" | "TRANSFER" | "all" | undefined;
  
  const [transactionsData, categories, wallets] = await Promise.all([
    getTransactions({
      page,
      limit: 20,
      type: type || "all",
      categoryId: params.category,
      walletId: params.wallet,
      search: params.search,
    }),
    getCategories(),
    getWallets(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Track and manage all your income, expenses, and transfers
          </p>
        </div>
        <TransactionDialog
          categories={categories}
          wallets={wallets}
          trigger={
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          }
        />
      </div>

      {/* Stats Overview */}
      <Suspense fallback={<StatsSkeleton />}>
        <TransactionStats currency={currency} locale={locale} />
      </Suspense>

      {/* Filters */}
      <TransactionFilters 
        categories={categories} 
        wallets={wallets}
        currentFilters={{
          type: type || "all",
          category: params.category,
          wallet: params.wallet,
          search: params.search,
        }}
      />

      {/* Transaction List */}
      <TransactionList 
        transactions={transactionsData.transactions}
        categories={categories}
        wallets={wallets}
        pagination={{
          total: transactionsData.total,
          pages: transactionsData.pages,
          currentPage: transactionsData.currentPage,
        }}
      />
    </div>
  );
}
