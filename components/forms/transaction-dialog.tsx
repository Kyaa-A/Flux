"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, getCurrencySymbol } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { useCurrency } from "@/components/providers/currency-provider";

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().optional(),
  date: z.date(),
  categoryId: z.string().min(1, "Category is required"),
  walletId: z.string().min(1, "Wallet is required"),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
  categories: Array<{ id: string; name: string; type: string; color: string; icon: string }>;
  wallets: Array<{ id: string; name: string; balance: number; color: string; icon: string }>;
  transaction?: {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    description: string;
    date: Date;
    categoryId: string;
    walletId: string;
  };
  trigger: React.ReactNode;
  defaultType?: "INCOME" | "EXPENSE";
}

export function TransactionDialog({
  categories,
  wallets,
  transaction,
  trigger,
  defaultType = "EXPENSE",
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">(
    transaction?.type || defaultType
  );
  const { currency, locale } = useCurrency();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: transaction?.amount || 0,
      type: transaction?.type || defaultType,
      description: transaction?.description || "",
      date: transaction?.date || new Date(),
      categoryId: transaction?.categoryId || "",
      walletId: transaction?.walletId || "",
    },
  });

  const isLoading = form.formState.isSubmitting;
  const isEditing = !!transaction;
  const watchedAmount = useWatch({ control: form.control, name: "amount" });
  const amountNumber = Number(watchedAmount || 0);
  const currencySymbol = getCurrencySymbol(currency, locale);

  // Update filtered categories based on type
  const filteredCategories = categories.filter(
    (c) => c.type === transactionType
  );

  // Update type in form when tab changes
  useEffect(() => {
    form.setValue("type", transactionType);
    // If current category doesn't match new type, reset it
    const currentCategory = categories.find(c => c.id === form.getValues("categoryId"));
    if (currentCategory && currentCategory.type !== transactionType) {
      form.setValue("categoryId", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, categories]);

  // Reset/Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (transaction) {
        setTransactionType(transaction.type);
        form.reset({
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          date: transaction.date,
          categoryId: transaction.categoryId,
          walletId: transaction.walletId,
        });
      } else {
        form.reset({
          amount: 0,
          type: transactionType,
          description: "",
          date: new Date(),
          categoryId: "",
          walletId: wallets[0]?.id || "",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction, wallets]);

  useEffect(() => {
    if (currency === "USD") {
      setUsdRate(1);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    void fetch(`https://open.er-api.com/v6/latest/${currency}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { rates?: Record<string, number> }) => {
        const rate = data?.rates?.USD;
        if (!cancelled && typeof rate === "number" && Number.isFinite(rate)) {
          setUsdRate(rate);
        }
      })
      .catch(() => {
        if (!cancelled) setUsdRate(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currency]);

  async function onSubmit(data: TransactionFormData) {
    try {
      if (isEditing && transaction) {
        const result = await updateTransaction(transaction.id, data);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Transaction updated");
      } else {
        await createTransaction(data);
        toast.success("Transaction added");
      }
      setOpen(false);
      if (!isEditing) {
        form.reset();
      }
    } catch {
      toast.error(isEditing ? "Failed to update transaction" : "Failed to add transaction");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Make changes to your transaction details." 
              : "Record a new income or expense transaction."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={transactionType}
          onValueChange={(v) => setTransactionType(v as "INCOME" | "EXPENSE")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EXPENSE">Expense</TabsTrigger>
            <TabsTrigger value="INCOME">Income</TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  {amountNumber > 0 && currency !== "USD" && usdRate && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ≈ {formatCurrency(amountNumber * usdRate, "USD", "en-US")} USD
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="walletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: wallet.color }}
                              />
                              {wallet.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grocery shopping" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
