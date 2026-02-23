"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { loanRepaymentSchema, loanSchema } from "@/lib/validations";
import type { LoanStatus } from "@/app/generated/prisma/client";

function getStartOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateLoanStatus(
  principalAmount: number,
  outstandingAmount: number,
  dueDate: Date | null
): LoanStatus {
  if (outstandingAmount <= 0) {
    return "PAID";
  }

  if (dueDate && dueDate < getStartOfToday()) {
    return "OVERDUE";
  }

  if (outstandingAmount < principalAmount) {
    return "PARTIAL";
  }

  return "OPEN";
}

function revalidateLoanPaths() {
  revalidatePath("/loans");
  revalidatePath("/dashboard");
}

async function getAuthUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function toNumber(value: unknown) {
  return Number(value) || 0;
}

function serializeLoan<T extends { principalAmount: unknown; outstandingAmount: unknown }>(loan: T) {
  return {
    ...loan,
    principalAmount: toNumber(loan.principalAmount),
    outstandingAmount: toNumber(loan.outstandingAmount),
  };
}

function serializeRepayment<T extends { amount: unknown }>(repayment: T) {
  return {
    ...repayment,
    amount: toNumber(repayment.amount),
  };
}

/**
 * Get all loans for the current user
 */
export async function getLoans() {
  const userId = await getAuthUserId();

  const loans = await prisma.loan.findMany({
    where: { userId },
    include: {
      repayments: {
        orderBy: { paidAt: "desc" },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return loans.map((loan) => ({
    ...serializeLoan(loan),
    repayments: loan.repayments.map(serializeRepayment),
  }));
}

/**
 * Get overview numbers for loans module
 */
export async function getLoanSummary() {
  const userId = await getAuthUserId();

  const loans = await prisma.loan.findMany({
    where: { userId },
    select: {
      status: true,
      principalAmount: true,
      outstandingAmount: true,
      dueDate: true,
    },
  });

  const totalPrincipal = loans.reduce((sum, loan) => sum + toNumber(loan.principalAmount), 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + toNumber(loan.outstandingAmount), 0);
  const totalCollected = totalPrincipal - totalOutstanding;
  const activeLoans = loans.filter((loan) => loan.status !== "PAID").length;
  const overdueLoans = loans.filter((loan) => loan.status === "OVERDUE").length;

  return {
    totalPrincipal,
    totalOutstanding,
    totalCollected,
    activeLoans,
    overdueLoans,
    totalLoans: loans.length,
  };
}

/**
 * Create a new loan record
 */
export async function createLoan(data: {
  borrowerName: string;
  principalAmount: number;
  borrowedAt: Date;
  dueDate?: Date | null;
  notes?: string | null;
}) {
  const userId = await getAuthUserId();
  const validated = loanSchema.parse(data);

  const status = calculateLoanStatus(
    validated.principalAmount,
    validated.principalAmount,
    validated.dueDate ?? null
  );

  const loan = await prisma.loan.create({
    data: {
      userId,
      borrowerName: validated.borrowerName,
      principalAmount: validated.principalAmount,
      outstandingAmount: validated.principalAmount,
      borrowedAt: validated.borrowedAt,
      dueDate: validated.dueDate,
      notes: validated.notes,
      status,
    },
  });

  revalidateLoanPaths();

  return { success: true, loan: serializeLoan(loan) };
}

/**
 * Update loan details and recompute outstanding/status
 */
export async function updateLoan(
  id: string,
  data: {
    borrowerName: string;
    principalAmount: number;
    borrowedAt: Date;
    dueDate?: Date | null;
    notes?: string | null;
  }
) {
  const userId = await getAuthUserId();
  const validated = loanSchema.parse(data);

  const [existingLoan, repaymentTotal] = await Promise.all([
    prisma.loan.findUnique({
      where: { id, userId },
      select: { id: true },
    }),
    prisma.loanRepayment.aggregate({
      where: { loanId: id, userId },
      _sum: { amount: true },
    }),
  ]);

  if (!existingLoan) {
    return { error: "Loan not found" };
  }

  const paidAmount = toNumber(repaymentTotal._sum.amount);
  if (validated.principalAmount < paidAmount) {
    return {
      error: "Principal amount cannot be less than already recorded repayments",
    };
  }

  const outstandingAmount = Math.max(0, validated.principalAmount - paidAmount);
  const status = calculateLoanStatus(
    validated.principalAmount,
    outstandingAmount,
    validated.dueDate ?? null
  );

  const loan = await prisma.loan.update({
    where: { id, userId },
    data: {
      borrowerName: validated.borrowerName,
      principalAmount: validated.principalAmount,
      outstandingAmount,
      borrowedAt: validated.borrowedAt,
      dueDate: validated.dueDate,
      notes: validated.notes,
      status,
    },
  });

  revalidateLoanPaths();

  return { success: true, loan: serializeLoan(loan) };
}

/**
 * Delete a loan and all repayment entries
 */
export async function deleteLoan(id: string) {
  const userId = await getAuthUserId();

  const loan = await prisma.loan.findUnique({
    where: { id, userId },
    select: { id: true },
  });

  if (!loan) {
    return { error: "Loan not found" };
  }

  await prisma.loan.delete({
    where: { id, userId },
  });

  revalidateLoanPaths();

  return { success: true };
}

/**
 * Add a repayment against a loan
 */
export async function addLoanRepayment(
  loanId: string,
  data: {
    amount: number;
    paidAt: Date;
    notes?: string | null;
  }
) {
  const userId = await getAuthUserId();
  const validated = loanRepaymentSchema.parse(data);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId, userId },
    select: {
      id: true,
      principalAmount: true,
      outstandingAmount: true,
      dueDate: true,
    },
  });

  if (!loan) {
    return { error: "Loan not found" };
  }

  const outstandingAmount = toNumber(loan.outstandingAmount);
  if (outstandingAmount <= 0) {
    return { error: "This loan is already fully paid" };
  }

  if (validated.amount > outstandingAmount) {
    return {
      error: "Repayment amount cannot exceed outstanding amount",
    };
  }

  const nextOutstanding = Math.max(0, outstandingAmount - validated.amount);
  const principalAmount = toNumber(loan.principalAmount);
  const status = calculateLoanStatus(
    principalAmount,
    nextOutstanding,
    loan.dueDate
  );

  const [repayment, updatedLoan] = await prisma.$transaction([
    prisma.loanRepayment.create({
      data: {
        userId,
        loanId,
        amount: validated.amount,
        paidAt: validated.paidAt,
        notes: validated.notes,
      },
    }),
    prisma.loan.update({
      where: { id: loanId, userId },
      data: {
        outstandingAmount: nextOutstanding,
        status,
      },
    }),
  ]);

  revalidateLoanPaths();

  return {
    success: true,
    repayment: serializeRepayment(repayment),
    loan: serializeLoan(updatedLoan),
  };
}

/**
 * Delete a repayment and recompute loan outstanding/status
 */
export async function deleteLoanRepayment(loanId: string, repaymentId: string) {
  const userId = await getAuthUserId();

  const [loan, repayment] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: loanId, userId },
      select: {
        id: true,
        principalAmount: true,
        dueDate: true,
      },
    }),
    prisma.loanRepayment.findUnique({
      where: { id: repaymentId, userId },
      select: {
        id: true,
        loanId: true,
      },
    }),
  ]);

  if (!loan) {
    return { error: "Loan not found" };
  }

  if (!repayment || repayment.loanId !== loanId) {
    return { error: "Repayment not found" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.loanRepayment.delete({
      where: { id: repaymentId, userId },
    });

    const paid = await tx.loanRepayment.aggregate({
      where: { loanId, userId },
      _sum: { amount: true },
    });

    const principalAmount = toNumber(loan.principalAmount);
    const paidAmount = toNumber(paid._sum.amount);
    const nextOutstanding = Math.max(0, principalAmount - paidAmount);
    const nextStatus = calculateLoanStatus(
      principalAmount,
      nextOutstanding,
      loan.dueDate
    );

    await tx.loan.update({
      where: { id: loanId, userId },
      data: {
        outstandingAmount: nextOutstanding,
        status: nextStatus,
      },
    });
  });

  revalidateLoanPaths();

  return { success: true };
}
