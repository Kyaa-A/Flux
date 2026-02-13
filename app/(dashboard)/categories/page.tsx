import { Suspense } from "react";
import { Plus } from "lucide-react";
import { getCategories, getCategorySpending } from "@/lib/actions/categories";
import { CategoryCard } from "@/components/categories/category-card";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Categories | Flux",
  description: "Manage your transaction categories",
};

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function CategoriesContent() {
  const [categories, expenseSpending, incomeSpending] = await Promise.all([
    getCategories(),
    getCategorySpending("month", "EXPENSE"),
    getCategorySpending("month", "INCOME"),
  ]);

  const spendingMap = new Map<string, number>();
  for (const item of [...expenseSpending, ...incomeSpending]) {
    spendingMap.set(item.id, item.spent);
  }

  const incomeCategories = categories.filter((c) => c.type === "INCOME" && !c.isArchived);
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE" && !c.isArchived);
  const archivedCategories = categories.filter((c) => c.isArchived && c.type !== "TRANSFER");

  return (
    <div className="space-y-8">
      {/* Expense Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Expense Categories</h2>
            <p className="text-sm text-muted-foreground">{expenseCategories.length} categories</p>
          </div>
          <CategoryDialog
            defaultType="EXPENSE"
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Expense
              </Button>
            }
          />
        </div>
        {expenseCategories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No expense categories. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                spent={spendingMap.get(cat.id) || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Income Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Income Categories</h2>
            <p className="text-sm text-muted-foreground">{incomeCategories.length} categories</p>
          </div>
          <CategoryDialog
            defaultType="INCOME"
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Income
              </Button>
            }
          />
        </div>
        {incomeCategories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No income categories. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomeCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                spent={spendingMap.get(cat.id) || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived Categories */}
      {archivedCategories.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Archived</h2>
            <p className="text-sm text-muted-foreground">{archivedCategories.length} archived categories</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archivedCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                spent={0}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Organize your transactions with custom categories.
        </p>
      </div>

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </div>
  );
}
