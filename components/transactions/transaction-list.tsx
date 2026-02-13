"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteTransaction } from "@/lib/actions/transactions";
import { TransactionDialog } from "@/components/forms/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string | null;
  date: Date;
  category: { id: string; name: string; color: string; icon: string };
  wallet: { id: string; name: string; color: string };
  notes?: string | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: Array<{ id: string; name: string; type: string; color: string; icon: string }>;
  wallets: Array<{ id: string; name: string; balance: number; color: string; icon: string }>;
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
  };
}

export function TransactionList({
  transactions,
  categories,
  wallets,
  pagination,
}: TransactionListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const result = await deleteTransaction(deleteId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaction deleted");
      setDeleteId(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", page.toString());
      router.push(`/transactions?${params.toString()}`);
    });
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No transactions found</h3>
          <p className="text-muted-foreground text-sm">
            Start by adding your first transaction
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">
            All Transactions ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {formatDate(new Date(transaction.date))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {transaction.type === "INCOME" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : transaction.type === "EXPENSE" ? (
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                      )}
                      <span>{transaction.description || "No description"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: transaction.category.color,
                        color: transaction.category.color,
                      }}
                    >
                      {transaction.category.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      style={{ backgroundColor: `${transaction.wallet.color}20` }}
                    >
                      {transaction.wallet.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold ${
                      transaction.type === "INCOME"
                        ? "text-emerald-500"
                        : transaction.type === "EXPENSE"
                        ? "text-rose-500"
                        : (transaction.notes === "TRANSFER_IN"
                          ? "text-emerald-500"
                          : "text-rose-500")
                    }`}>
                      {transaction.type === "INCOME"
                        ? "+"
                        : transaction.type === "EXPENSE"
                        ? "-"
                        : (transaction.notes === "TRANSFER_IN" ? "+" : "-")}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {transaction.type !== "TRANSFER" && (
                          <TransactionDialog
                            categories={categories}
                            wallets={wallets}
                            transaction={{
                              id: transaction.id,
                              amount: transaction.amount,
                              type: transaction.type,
                              description: transaction.description || "",
                              date: new Date(transaction.date),
                              categoryId: transaction.category.id,
                              walletId: transaction.wallet.id,
                            }}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            }
                          />
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteId(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1 || isPending}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === pagination.pages || isPending}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
