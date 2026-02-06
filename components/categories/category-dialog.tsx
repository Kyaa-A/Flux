"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { categorySchema, type CategoryFormData } from "@/lib/validations";
import { createCategory, updateCategory } from "@/lib/actions/categories";

const ICON_OPTIONS = [
  "tag", "shopping-cart", "utensils", "car", "home", "heart", "zap",
  "gift", "briefcase", "book", "music", "film", "coffee", "dollar-sign",
  "credit-card", "trending-up", "trending-down", "percent", "shield",
  "star", "plane", "train", "bus", "fuel", "stethoscope", "graduation-cap",
  "baby", "dog", "gamepad-2", "dumbbell", "scissors", "wrench",
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#a855f7", "#d946ef", "#84cc16", "#0ea5e9",
];

interface CategoryDialogProps {
  category?: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    color: string;
    icon: string;
    budgetLimit: number | null;
  };
  trigger: React.ReactNode;
  defaultType?: "INCOME" | "EXPENSE";
}

export function CategoryDialog({ category, trigger, defaultType = "EXPENSE" }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      type: category?.type || defaultType,
      color: category?.color || "#6366f1",
      icon: category?.icon || "tag",
      budgetLimit: category?.budgetLimit || undefined,
    },
  });

  const isLoading = form.formState.isSubmitting;
  const isEditing = !!category;

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name || "",
        type: category?.type || defaultType,
        color: category?.color || "#6366f1",
        icon: category?.icon || "tag",
        budgetLimit: category?.budgetLimit || undefined,
      });
    }
  }, [open, category, defaultType, form]);

  async function onSubmit(data: CategoryFormData) {
    try {
      if (isEditing && category) {
        const result = await updateCategory(category.id, data);
        if (result && typeof result === "object" && "error" in result) {
          toast.error(result.error as string);
          return;
        }
        toast.success("Category updated");
      } else {
        const result = await createCategory({
          ...data,
          budgetLimit: data.budgetLimit ?? undefined,
        });
        if (result && typeof result === "object" && "error" in result) {
          toast.error(result.error as string);
          return;
        }
        toast.success("Category created");
      }
      setOpen(false);
    } catch {
      toast.error(isEditing ? "Failed to update category" : "Failed to create category");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your category details."
              : "Add a new category to organize your transactions."}
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
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                        <SelectItem value="INCOME">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          field.value === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
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
              name="budgetLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Budget Limit (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="No limit"
                        className="pl-7"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : parseFloat(val));
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
