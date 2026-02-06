"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

interface CurrencyContextType {
  currency: string;
  locale: string;
  formatAmount: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  locale: "en-US",
  formatAmount: (amount) => formatCurrencyUtil(amount),
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const currency = session?.user?.currency || "USD";
  const locale = session?.user?.locale || "en-US";

  const formatAmount = (amount: number | string) =>
    formatCurrencyUtil(amount, currency, locale);

  return (
    <CurrencyContext.Provider value={{ currency, locale, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
