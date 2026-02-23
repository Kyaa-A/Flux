"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchAll } from "@/lib/actions/search";
import { Search, FileText, Wallet, Tag, LayoutGrid, Loader2 } from "lucide-react";

interface SearchResultItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchResults {
  transactions: SearchResultItem[];
  wallets: SearchResultItem[];
  categories: SearchResultItem[];
  pages: SearchResultItem[];
}

const EMPTY_RESULTS: SearchResults = {
  transactions: [],
  wallets: [],
  categories: [],
  pages: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const normalized = query.trim();
    if (normalized.length < 2) return;

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const response = await searchAll(normalized);
          setResults(response);
        } catch {
          setResults(EMPTY_RESULTS);
        }
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const displayResults = query.trim().length < 2 ? EMPTY_RESULTS : results;

  const hasResults = useMemo(() => {
    return (
      displayResults.transactions.length > 0 ||
      displayResults.wallets.length > 0 ||
      displayResults.categories.length > 0 ||
      displayResults.pages.length > 0
    );
  }, [displayResults]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden lg:flex h-9 w-[320px] justify-between text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search transactions, wallets, pages...
        </span>
        <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          Ctrl K
        </span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open search"
      >
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setResults(EMPTY_RESULTS);
          }
        }}
        title="Global Search"
        description="Search transactions, wallets, categories, and pages."
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Type at least 2 characters..."
        />
        <CommandList>
          {isPending && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!isPending && query.trim().length >= 2 && !hasResults && (
            <CommandEmpty>No matches for &quot;{query.trim()}&quot;</CommandEmpty>
          )}
          {!isPending && query.trim().length < 2 && (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              Search across transactions, wallets, categories, and app pages.
            </div>
          )}

          {displayResults.pages.length > 0 && (
            <CommandGroup heading="Pages">
              {displayResults.pages.map((item) => (
                <CommandItem key={`page-${item.id}`} onSelect={() => navigate(item.href)}>
                  <LayoutGrid className="h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {displayResults.transactions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Transactions">
                {displayResults.transactions.map((item) => (
                  <CommandItem key={`txn-${item.id}`} onSelect={() => navigate(item.href)}>
                    <FileText className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.sublabel ? <CommandShortcut>{item.sublabel}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {displayResults.wallets.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Wallets">
                {displayResults.wallets.map((item) => (
                  <CommandItem key={`wallet-${item.id}`} onSelect={() => navigate(item.href)}>
                    <Wallet className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.sublabel ? <CommandShortcut>{item.sublabel}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {displayResults.categories.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Categories">
                {displayResults.categories.map((item) => (
                  <CommandItem key={`cat-${item.id}`} onSelect={() => navigate(item.href)}>
                    <Tag className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.sublabel ? <CommandShortcut>{item.sublabel}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
