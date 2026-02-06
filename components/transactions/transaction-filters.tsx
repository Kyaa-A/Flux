"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useState, useTransition } from "react";

interface TransactionFiltersProps {
  categories: Array<{ id: string; name: string; type: string }>;
  wallets: Array<{ id: string; name: string }>;
  currentFilters: {
    type: string;
    category?: string;
    wallet?: string;
    search?: string;
  };
}

export function TransactionFilters({
  categories,
  wallets,
  currentFilters,
}: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentFilters.search || "");

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 on filter change
    
    startTransition(() => {
      router.push(`/transactions?${params.toString()}`);
    });
  };

  const handleSearch = () => {
    updateFilter("search", search || null);
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/transactions");
    });
  };

  const hasActiveFilters = 
    currentFilters.type !== "all" || 
    currentFilters.category || 
    currentFilters.wallet || 
    currentFilters.search;

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-xl border">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={handleSearch}
            disabled={isPending}
          >
            Search
          </Button>
        </div>

        {/* Type Filter */}
        <Select
          value={currentFilters.type}
          onValueChange={(value) => updateFilter("type", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={currentFilters.category || "all"}
          onValueChange={(value) => updateFilter("category", value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Wallet Filter */}
        <Select
          value={currentFilters.wallet || "all"}
          onValueChange={(value) => updateFilter("wallet", value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Wallets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wallets</SelectItem>
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            onClick={clearFilters}
            disabled={isPending}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
