"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { addLoanRepayment } from "@/lib/actions/loans";
import { formatDateForInput } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
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

const repaymentFormSchema = z.object({
  amount: z.number().positive("Repayment amount must be positive").max(999999999.99, "Amount is too large"),
  paidAt: z.string().min(1, "Payment date is required"),
  notes: z.string().max(500, "Notes are too long").optional(),
});

type RepaymentFormValues = z.infer<typeof repaymentFormSchema>;

interface RepaymentDialogProps {
  loanId: string;
  borrowerName: string;
  outstandingAmount: number;
  trigger: React.ReactNode;
}

export function RepaymentDialog({
  loanId,
  borrowerName,
  outstandingAmount,
  trigger,
}: RepaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { formatAmount } = useCurrency();

  const form = useForm<RepaymentFormValues>({
    resolver: zodResolver(repaymentFormSchema),
    defaultValues: {
      amount: Math.max(0, Number(outstandingAmount.toFixed(2))),
      paidAt: formatDateForInput(new Date()),
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amount: Math.max(0, Number(outstandingAmount.toFixed(2))),
      paidAt: formatDateForInput(new Date()),
      notes: "",
    });
  }, [open, outstandingAmount, form]);

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(values: RepaymentFormValues) {
    try {
      const result = await addLoanRepayment(loanId, {
        amount: values.amount,
        paidAt: new Date(values.paidAt),
        notes: values.notes?.trim() || null,
      });

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string"
      ) {
        toast.error(result.error);
        return;
      }

      toast.success("Repayment recorded");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to record repayment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[430px]">
        <DialogHeader>
          <DialogTitle>Add Repayment</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">{borrowerName}</p>
          <p className="text-muted-foreground">
            Outstanding: <span className="font-medium text-foreground">{formatAmount(outstandingAmount)}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repayment Amount</FormLabel>
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

            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Save Repayment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
