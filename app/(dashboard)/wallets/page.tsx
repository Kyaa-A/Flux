import { Suspense } from "react";
import { getWallets, getWalletSummary } from "@/lib/actions/wallets";
import { WalletCard } from "@/components/wallets/wallet-card";
import { WalletDialog } from "@/components/wallets/wallet-dialog";
import { TransferDialog } from "@/components/wallets/transfer-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Wallets | Flux",
  description: "Manage your wallets and accounts",
};

async function WalletSummary() {
  const summary = await getWalletSummary();
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-600/5 border-indigo-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Worth
          </CardTitle>
          <Wallet className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            summary.totalBalance >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}>
            {formatCurrency(summary.totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.walletCount} active wallet{summary.walletCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Assets
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {formatCurrency(summary.totalAssets)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cash, bank, savings
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Liabilities
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-500">
            {formatCurrency(summary.totalLiabilities)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Credit cards, loans
          </p>
        </CardContent>
      </Card>
      
      <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
        <CardContent className="flex flex-col items-center justify-center h-full py-6">
          <WalletDialog
            trigger={
              <Button variant="ghost" className="h-full w-full flex flex-col gap-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">Add Wallet</span>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SummarySkeleton() {
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

async function WalletGrid() {
  const wallets = await getWallets();
  
  if (wallets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No wallets yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first wallet to start tracking your finances
          </p>
          <WalletDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} allWallets={wallets} />
      ))}
    </div>
  );
}

function WalletGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-40 bg-muted rounded mb-4" />
            <div className="h-4 w-24 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function WalletsPage() {
  const wallets = await getWallets();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground">
            Manage your accounts, cards, and cash
          </p>
        </div>
        <div className="flex gap-2">
          {wallets.length >= 2 && (
            <TransferDialog
              wallets={wallets}
              trigger={
                <Button variant="outline">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
              }
            />
          )}
          <WalletDialog
            trigger={
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      <Suspense fallback={<SummarySkeleton />}>
        <WalletSummary />
      </Suspense>

      {/* Wallet Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Wallets</h2>
        <Suspense fallback={<WalletGridSkeleton />}>
          <WalletGrid />
        </Suspense>
      </div>
    </div>
  );
}
