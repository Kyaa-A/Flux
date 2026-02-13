import { z } from "zod";

// Transaction form validation
export const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999999999.99, "Amount is too large"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(255, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  date: z.date(),
  categoryId: z.string().min(1, "Please select a category"),
  walletId: z.string().min(1, "Please select a wallet"),
  isRecurring: z.boolean().default(false),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Category form validation
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name is too long"),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  icon: z.string().min(1, "Icon is required"),
  budgetLimit: z.number().positive().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Wallet form validation
export const walletSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name is too long"),
  type: z.enum([
    "CASH",
    "BANK_ACCOUNT",
    "CREDIT_CARD",
    "SAVINGS",
    "INVESTMENT",
    "EWALLET",
    "OTHER",
  ]),
  balance: z.number().default(0),
  currency: z.string().length(3).default("USD"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .default("#22c55e"),
  icon: z.string().min(1, "Icon is required").default("wallet"),
});

export type WalletFormData = z.infer<typeof walletSchema>;

// Register form validation
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Login form validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Budget form validation
export const budgetSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name is too long"),
  amount: z.number().positive("Amount must be positive"),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  categoryIds: z.array(z.string()).min(1, "Select at least one category"),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;

// Forgot password form validation
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password form validation
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Change password validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Update profile validation
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().min(2).max(10).optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// Notification preferences validation
export const notificationPreferencesSchema = z.object({
  budgetWarnings: z.boolean(),
  budgetExceeded: z.boolean(),
  recurringProcessed: z.boolean(),
  adminAccountStatus: z.boolean(),
  largeTransaction: z.boolean(),
  largeTransactionThreshold: z.number().positive().max(999999999.99).nullable(),
});

export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;

// Recurring transaction validation
export const recurringTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999999999.99, "Amount is too large"),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().max(255, "Description too long").optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  walletId: z.string().min(1, "Please select a wallet"),
  categoryId: z.string().min(1, "Please select a category"),
  isActive: z.boolean().optional(),
});

export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
