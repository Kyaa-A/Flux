"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createWallet, updateWallet } from "@/lib/actions/wallets";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const walletSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  type: z.enum([
    "CASH",
    "BANK_ACCOUNT",
    "CREDIT_CARD",
    "SAVINGS",
    "INVESTMENT",
    "EWALLET",
    "OTHER",
  ]),
  balance: z.number().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
});

type WalletFormData = z.infer<typeof walletSchema>;

const WALLET_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "SAVINGS", label: "Savings" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "EWALLET", label: "E-Wallet" },
  { value: "OTHER", label: "Other" },
];

const COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#eab308", // yellow
  "#6366f1", // indigo
  "#14b8a6", // teal
];

interface WalletDialogProps {
  wallet?: {
    id: string;
    name: string;
    type: string;
    balance: number;
    color: string;
  };
  trigger: React.ReactNode;
}

export function WalletDialog({ wallet, trigger }: WalletDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: wallet?.name || "",
      type: (wallet?.type as WalletFormData["type"]) || "BANK_ACCOUNT",
      balance: wallet?.balance || 0,
      color: wallet?.color || COLORS[0],
    },
  });

  const isLoading = form.formState.isSubmitting;
  const isEditing = !!wallet;

  const onSubmit = async (data: WalletFormData) => {
    try {
      if (isEditing) {
        await updateWallet(wallet.id, {
          name: data.name,
          type: data.type,
          color: data.color,
        });
        toast.success("Wallet updated");
      } else {
        await createWallet({
          name: data.name,
          type: data.type,
          balance: data.balance || 0,
          color: data.color,
        });
        toast.success("Wallet created");
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error(isEditing ? "Failed to update wallet" : "Failed to create wallet");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Wallet" : "Create Wallet"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Wallet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WALLET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
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
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          field.value === color
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
                {isEditing ? "Save Changes" : "Create Wallet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
