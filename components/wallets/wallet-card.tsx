"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWallet, deleteWallet } from "@/lib/actions/wallets";
import { useCurrency } from "@/components/providers/currency-provider";
import { WalletDialog } from "./wallet-dialog";
import { TransferDialog } from "./transfer-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  ArrowRightLeft,
  Wallet,
  Landmark,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

const WALLET_TYPE_ICONS: Record<string, typeof Wallet> = {
  CASH: Wallet,
  BANK_ACCOUNT: Landmark,
  CREDIT_CARD: CreditCard,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  EWALLET: Smartphone,
  OTHER: Wallet,
};

const WALLET_TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_ACCOUNT: "Bank Account",
  CREDIT_CARD: "Credit Card",
  SAVINGS: "Savings",
  INVESTMENT: "Investment",
  EWALLET: "E-Wallet",
  OTHER: "Other",
};

interface WalletCardProps {
  wallet: {
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    color: string;
    icon: string;
    isArchived: boolean;
  };
  allWallets: Array<{
    id: string;
    name: string;
    balance: number;
    color: string;
    icon: string;
  }>;
}

export function WalletCard({ wallet, allWallets }: WalletCardProps) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Icon = WALLET_TYPE_ICONS[wallet.type] || Wallet;

  const handleArchive = async () => {
    startTransition(async () => {
      try {
        await updateWallet(wallet.id, { isArchived: !wallet.isArchived });
        toast.success(wallet.isArchived ? "Wallet restored" : "Wallet archived");
        router.refresh();
      } catch {
        toast.error("Failed to update wallet");
      }
    });
  };

  const handleDelete = async () => {
    try {
      const result = await deleteWallet(wallet.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Wallet deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete wallet");
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card 
        className="relative overflow-hidden group hover:shadow-lg transition-all duration-300"
        style={{ 
          borderColor: `${wallet.color}40`,
        }}
      >
        {/* Color accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: wallet.color }}
        />
        
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
            <div 
              className="rounded-xl p-2.5"
              style={{ backgroundColor: `${wallet.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: wallet.color }} />
            </div>
            <div>
              <CardTitle className="text-lg">{wallet.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {WALLET_TYPE_LABELS[wallet.type]}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <WalletDialog
                wallet={wallet}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                }
              />
              {allWallets.length >= 2 && (
                <TransferDialog
                  wallets={allWallets}
                  defaultFromWallet={wallet.id}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer
                    </DropdownMenuItem>
                  }
                />
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive} disabled={isPending}>
                <Archive className="h-4 w-4 mr-2" />
                {wallet.isArchived ? "Restore" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent>
          <div className={`text-3xl font-bold ${
            wallet.balance >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}>
            {formatAmount(wallet.balance)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Current balance
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{wallet.name}&quot;? This action cannot be undone.
              {wallet.balance !== 0 && (
                <span className="block mt-2 text-amber-500">
                  ⚠️ This wallet has a balance of {formatAmount(wallet.balance)}.
                </span>
              )}
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
