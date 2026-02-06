import { Suspense } from "react";
import { Plus, Repeat, Pause, Play, Trash2, MoreHorizontal } from "lucide-react";
import { getRecurringTransactions } from "@/lib/actions/recurring";
import { getCategories } from "@/lib/actions/categories";
import { getWallets } from "@/lib/actions/wallets";
import { RecurringDialog } from "@/components/recurring/recurring-dialog";
import { RecurringList } from "./recurring-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Recurring Transactions | Flux",
  description: "Manage your recurring transactions",
};

function RecurringSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function RecurringContent() {
  const recurring = await getRecurringTransactions();
  return <RecurringList recurring={recurring} />;
}

export default async function RecurringPage() {
  const [categories, wallets] = await Promise.all([
    getCategories(),
    getWallets(),
  ]);

  const catData = categories.map((c) => ({ id: c.id, name: c.name, type: c.type, color: c.color }));
  const walletData = wallets.map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Recurring Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Manage your automated repeating transactions.
          </p>
        </div>
        <RecurringDialog
          categories={catData}
          wallets={walletData}
          trigger={
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              New Recurring
            </Button>
          }
        />
      </div>

      <Suspense fallback={<RecurringSkeleton />}>
        <RecurringContent />
      </Suspense>
    </div>
  );
}
