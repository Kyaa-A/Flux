"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "MYR", label: "MYR - Malaysian Ringgit" },
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "IDR", label: "IDR - Indonesian Rupiah" },
];

const LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "ja-JP", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "ko-KR", label: "Korean" },
];

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
  "#22c55e",
  "#3b82f6",
  "#f43f5e",
  "#8b5cf6",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#eab308",
  "#6366f1",
  "#14b8a6",
];

// ─── Step Schemas ─────────────────────────────────────────────────────────────

const step1Schema = z.object({
  currency: z.string().length(3, "Required"),
  locale: z.string().min(2, "Required"),
});

const step2Schema = z.object({
  walletName: z.string().min(1, "Name is required").max(50),
  walletType: z.enum([
    "CASH", "BANK_ACCOUNT", "CREDIT_CARD", "SAVINGS", "INVESTMENT", "EWALLET", "OTHER",
  ]),
  walletColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  walletBalance: z.number().min(0, "Cannot be negative"),
});

const step3Schema = z.object({
  hasTransaction: z.boolean(),
  txType: z.enum(["INCOME", "EXPENSE"]).optional(),
  txAmount: z.number().positive().optional(),
  txDescription: z.string().max(255).optional(),
  txCategoryId: z.string().optional(),
  txDate: z.date().optional(),
}).refine((d) => {
  if (!d.hasTransaction) return true;
  return !!d.txAmount && !!d.txCategoryId;
}, { message: "Amount and category are required", path: ["txAmount"] });

// ─── Types ────────────────────────────────────────────────────────────────────

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

type Category = {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
};

type DefaultWallet = {
  id: string;
  name: string;
  type: string;
  color: string;
  balance: number;
} | null;

interface OnboardingWizardProps {
  defaultCurrency: string;
  defaultLocale: string;
  defaultWallet: DefaultWallet;
  categories: Category[];
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full flex-1 transition-all",
            i < current ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1 shrink-0">
        {current}/{total}
      </span>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({
  defaultCurrency,
  defaultLocale,
  defaultWallet,
  categories,
}: OnboardingWizardProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated data across steps
  const [step1Data, setStep1Data] = useState<Step1Data>({
    currency: defaultCurrency,
    locale: defaultLocale,
  });
  const [step2Data, setStep2Data] = useState<Step2Data>({
    walletName: defaultWallet?.name ?? "Cash",
    walletType: (defaultWallet?.type as Step2Data["walletType"]) ?? "CASH",
    walletColor: defaultWallet?.color ?? "#22c55e",
    walletBalance: defaultWallet?.balance ?? 0,
  });

  // ── Step 1 form ──────────────────────────────────────────────────────────────
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data,
  });

  // ── Step 2 form ──────────────────────────────────────────────────────────────
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: step2Data,
  });

  // ── Step 3 form ──────────────────────────────────────────────────────────────
  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      hasTransaction: false,
      txType: "EXPENSE",
      txDate: new Date(),
    },
  });

  const hasTransaction = form3.watch("hasTransaction");
  const txType = form3.watch("txType") ?? "EXPENSE";
  const filteredCategories = categories.filter((c) => c.type === txType);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function onStep1Submit(data: Step1Data) {
    setStep1Data(data);
    setStep(2);
  }

  function onStep2Submit(data: Step2Data) {
    setStep2Data(data);
    setStep(3);
  }

  async function onStep3Submit(data: Step3Data, skip = false) {
    setIsSubmitting(true);
    try {
      const result = await completeOnboarding({
        ...step1Data,
        ...step2Data,
        firstTransaction:
          !skip && data.hasTransaction && data.txAmount && data.txCategoryId
            ? {
                type: data.txType!,
                amount: data.txAmount,
                description: data.txDescription,
                categoryId: data.txCategoryId,
                date: data.txDate ?? new Date(),
              }
            : undefined,
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

      try {
        await updateSession();
      } catch {
        // Onboarding is already persisted server-side; continue navigation.
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <StepProgress current={step} total={3} />
        {step === 1 && (
          <>
            <CardTitle>Welcome to Flux!</CardTitle>
            <CardDescription>Let&apos;s set up your preferred currency and language.</CardDescription>
          </>
        )}
        {step === 2 && (
          <>
            <CardTitle>Your Wallet</CardTitle>
            <CardDescription>Customize your default wallet and set an opening balance.</CardDescription>
          </>
        )}
        {step === 3 && (
          <>
            <CardTitle>First Transaction</CardTitle>
            <CardDescription>Optionally record your first income or expense to get started.</CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent>
        {/* ── Step 1 ── */}
        {step === 1 && (
          <Form {...form1}>
            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
              <FormField
                control={form1.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form1.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language / Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select locale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCALES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </form>
          </Form>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <Form {...form2}>
            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
              <FormField
                control={form2.control}
                name="walletName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cash, My Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form2.control}
                name="walletType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WALLET_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form2.control}
                name="walletColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={cn(
                              "h-7 w-7 rounded-full border-2 transition-all",
                              field.value === color
                                ? "border-foreground scale-110"
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form2.control}
                name="walletBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {step1Data.currency}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="pl-14"
                          placeholder="0.00"
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <Form {...form3}>
            <form onSubmit={form3.handleSubmit((d) => onStep3Submit(d))} className="space-y-4">
              {/* Toggle: add a transaction? */}
              <FormField
                control={form3.control}
                name="hasTransaction"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                          field.value ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform",
                            field.value ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                      <FormLabel className="cursor-pointer select-none">
                        Record my first transaction
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasTransaction && (
                <>
                  {/* Type toggle */}
                  <FormField
                    control={form3.control}
                    name="txType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <div className="flex rounded-md border overflow-hidden">
                            {(["INCOME", "EXPENSE"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  field.onChange(t);
                                  form3.setValue("txCategoryId", "");
                                }}
                                className={cn(
                                  "flex-1 py-2 text-sm font-medium transition-colors",
                                  field.value === t
                                    ? t === "INCOME"
                                      ? "bg-green-500 text-white"
                                      : "bg-rose-500 text-white"
                                    : "bg-background text-muted-foreground hover:bg-muted"
                                )}
                              >
                                {t === "INCOME" ? "Income" : "Expense"}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Amount */}
                  <FormField
                    control={form3.control}
                    name="txAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              {step1Data.currency}
                            </span>
                            <Input
                              type="number"
                              min={0.01}
                              step="0.01"
                              className="pl-14"
                              placeholder="0.00"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                              }
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form3.control}
                    name="txCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCategories.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                No categories available
                              </SelectItem>
                            ) : (
                              filteredCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form3.control}
                    name="txDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Grocery shopping" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Complete Setup
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={isSubmitting}
                onClick={() => onStep3Submit(form3.getValues(), true)}
              >
                Skip for now
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
