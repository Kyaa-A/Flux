"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createLoan, updateLoan } from "@/lib/actions/loans";
import { formatDateForInput } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loanFormSchema = z
  .object({
    borrowerName: z.string().min(1, "Borrower name is required").max(100, "Name is too long"),
    principalAmount: z.number().positive("Amount must be positive").max(999999999.99, "Amount is too large"),
    borrowedAt: z.string().min(1, "Borrowed date is required"),
    dueDate: z.string().optional(),
    notes: z.string().max(500, "Notes are too long").optional(),
  })
  .refine((data) => !data.dueDate || data.dueDate >= data.borrowedAt, {
    message: "Due date cannot be earlier than borrowed date",
    path: ["dueDate"],
  });

type LoanFormValues = z.infer<typeof loanFormSchema>;

interface LoanDialogProps {
  trigger: React.ReactNode;
  loan?: {
    id: string;
    borrowerName: string;
    principalAmount: number;
    borrowedAt: Date | string;
    dueDate: Date | string | null;
    notes: string | null;
  };
}

function getDefaultValues(loan?: LoanDialogProps["loan"]): LoanFormValues {
  return {
    borrowerName: loan?.borrowerName ?? "",
    principalAmount: loan?.principalAmount ?? 0,
    borrowedAt: formatDateForInput(loan?.borrowedAt ?? new Date()),
    dueDate: loan?.dueDate ? formatDateForInput(loan.dueDate) : "",
    notes: loan?.notes ?? "",
  };
}

export function LoanDialog({ trigger, loan }: LoanDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = Boolean(loan);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: getDefaultValues(loan),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(getDefaultValues(loan));
  }, [open, loan, form]);

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(values: LoanFormValues) {
    const payload = {
      borrowerName: values.borrowerName.trim(),
      principalAmount: values.principalAmount,
      borrowedAt: new Date(values.borrowedAt),
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
      notes: values.notes?.trim() || null,
    };

    try {
      const result = isEditing
        ? await updateLoan(loan!.id, payload)
        : await createLoan(payload);

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string"
      ) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Loan updated" : "Loan created");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(isEditing ? "Failed to update loan" : "Failed to create loan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Loan" : "Add Borrowed Money"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="borrowerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Borrower Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="principalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Lent</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : Number(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="borrowedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Borrowed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Short note" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Loan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
