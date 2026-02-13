"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transferBetweenWallets } from "@/lib/actions/wallets";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

const transferSchema = z.object({
  fromWalletId: z.string().min(1, "Select source wallet"),
  toWalletId: z.string().min(1, "Select destination wallet"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
}).refine((data) => data.fromWalletId !== data.toWalletId, {
  message: "Source and destination wallets must be different",
  path: ["toWalletId"],
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferDialogProps {
  wallets: Array<{
    id: string;
    name: string;
    balance: number;
    color: string;
  }>;
  defaultFromWallet?: string;
  trigger: React.ReactNode;
}

export function TransferDialog({ wallets, defaultFromWallet, trigger }: TransferDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWalletId: defaultFromWallet || "",
      toWalletId: "",
      amount: 0,
      description: "",
    },
  });

  const isLoading = form.formState.isSubmitting;
  const fromWalletId = useWatch({
    control: form.control,
    name: "fromWalletId",
  });
  const fromWallet = wallets.find((w) => w.id === fromWalletId);

  const onSubmit = async (data: TransferFormData) => {
    try {
      const result = await transferBetweenWallets(
        data.fromWalletId,
        data.toWalletId,
        data.amount,
        data.description
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Transfer completed");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Failed to complete transfer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Between Wallets</DialogTitle>
          <DialogDescription>
            Move money from one wallet to another
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              <FormField
                control={form.control}
                name="fromWalletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wallet" />
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

              <div className="pb-2">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="toWalletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wallets
                          .filter((w) => w.id !== fromWalletId)
                          .map((wallet) => (
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

            {fromWallet && (
              <p className="text-sm text-muted-foreground">
                Available: {formatCurrency(fromWallet.balance)}
              </p>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Transfer note" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
