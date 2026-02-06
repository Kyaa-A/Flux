"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { budgetSchema, type BudgetFormData } from "@/lib/validations";
import { createBudget, updateBudget } from "@/lib/actions/budgets";

interface BudgetDialogProps {
  budget?: {
    id: string;
    name: string;
    amount: number;
    period: string;
    startDate: Date;
    endDate: Date | null;
    categoryIds: string[];
  };
  categories: Array<{ id: string; name: string; color: string; type: string }>;
  trigger: React.ReactNode;
}

export function BudgetDialog({ budget, categories, trigger }: BudgetDialogProps) {
  const [open, setOpen] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: budget?.name || "",
      amount: budget?.amount || 0,
      period: (budget?.period as BudgetFormData["period"]) || "MONTHLY",
      startDate: budget?.startDate ? new Date(budget.startDate) : new Date(),
      endDate: budget?.endDate ? new Date(budget.endDate) : undefined,
      categoryIds: budget?.categoryIds || [],
    },
  });

  const isLoading = form.formState.isSubmitting;
  const isEditing = !!budget;
  const selectedCategoryIds = form.watch("categoryIds");

  useEffect(() => {
    if (open) {
      form.reset({
        name: budget?.name || "",
        amount: budget?.amount || 0,
        period: (budget?.period as BudgetFormData["period"]) || "MONTHLY",
        startDate: budget?.startDate ? new Date(budget.startDate) : new Date(),
        endDate: budget?.endDate ? new Date(budget.endDate) : undefined,
        categoryIds: budget?.categoryIds || [],
      });
    }
  }, [open, budget, form]);

  const toggleCategory = (categoryId: string) => {
    const current = form.getValues("categoryIds");
    if (current.includes(categoryId)) {
      form.setValue(
        "categoryIds",
        current.filter((id) => id !== categoryId),
        { shouldValidate: true }
      );
    } else {
      form.setValue("categoryIds", [...current, categoryId], {
        shouldValidate: true,
      });
    }
  };

  async function onSubmit(data: BudgetFormData) {
    try {
      if (isEditing && budget) {
        await updateBudget(budget.id, {
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          categoryIds: data.categoryIds,
        });
        toast.success("Budget updated");
      } else {
        await createBudget({
          name: data.name,
          amount: data.amount,
          period: data.period,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          categoryIds: data.categoryIds,
        });
        toast.success("Budget created");
      }
      setOpen(false);
    } catch {
      toast.error(isEditing ? "Failed to update budget" : "Failed to create budget");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Budget" : "Create Budget"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your budget settings."
              : "Set a spending limit for selected categories."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Food Budget" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
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
              name="categoryIds"
              render={() => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg min-h-[60px]">
                    {expenseCategories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No expense categories available</p>
                    ) : (
                      expenseCategories.map((cat) => {
                        const isSelected = selectedCategoryIds.includes(cat.id);
                        return (
                          <Badge
                            key={cat.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer transition-colors"
                            style={
                              isSelected
                                ? { backgroundColor: cat.color, borderColor: cat.color }
                                : {}
                            }
                            onClick={() => toggleCategory(cat.id)}
                          >
                            {cat.name}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Budget"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
