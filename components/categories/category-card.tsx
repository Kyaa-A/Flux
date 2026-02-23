"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CategoryDialog } from "./category-dialog";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import { useCurrency } from "@/components/providers/currency-provider";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    color: string;
    icon: string;
    budgetLimit: number | null;
    isArchived: boolean;
    _count: {
      transactions: number;
    };
  };
  spent?: number;
}

export function CategoryCard({ category, spent = 0 }: CategoryCardProps) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Category deleted");
        router.refresh();
      }
      setShowDelete(false);
    });
  };

  const handleArchiveToggle = () => {
    startTransition(async () => {
      await updateCategory(category.id, { isArchived: !category.isArchived });
      toast.success(category.isArchived ? "Category restored" : "Category archived");
      router.refresh();
    });
  };

  const budgetPercent = category.budgetLimit
    ? Math.min((spent / category.budgetLimit) * 100, 100)
    : null;

  return (
    <>
      <Card className="group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-foreground">{category.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {category._count.transactions} transaction{category._count.transactions !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {category.type !== "TRANSFER" && (
                  <CategoryDialog
                    category={{
                      ...category,
                      type: category.type as "INCOME" | "EXPENSE",
                    }}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    }
                  />
                )}
                <DropdownMenuItem onClick={handleArchiveToggle} disabled={isPending}>
                  {category.isArchived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDelete(true)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Budget info */}
          {category.budgetLimit && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {formatAmount(spent)} / {formatAmount(category.budgetLimit)}
                </span>
                <span className={budgetPercent! > 100 ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {budgetPercent!.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(budgetPercent!, 100)}%`,
                    backgroundColor: budgetPercent! > 100 ? "hsl(var(--destructive))" : category.color,
                  }}
                />
              </div>
            </div>
          )}

          {category.isArchived && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Archived
            </Badge>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{category.name}&quot;? This cannot be undone.
              Categories with transactions cannot be deleted — archive them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
