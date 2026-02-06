"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

export async function registerUser(data: RegisterFormData) {
  try {
    // Validate data
    const validatedData = registerSchema.parse(data);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { error: "Email already registered" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      },
    });

    // Create default wallet for new user
    await prisma.wallet.create({
      data: {
        name: "Cash",
        type: "CASH",
        balance: 0,
        color: "#22c55e",
        icon: "wallet",
        userId: user.id,
      },
    });

    // Create default categories
    const defaultCategories = [
      // Income categories
      { name: "Salary", type: "INCOME" as const, color: "#22c55e", icon: "briefcase" },
      { name: "Freelance", type: "INCOME" as const, color: "#14b8a6", icon: "laptop" },
      { name: "Investment", type: "INCOME" as const, color: "#6366f1", icon: "trending-up" },
      { name: "Other Income", type: "INCOME" as const, color: "#8b5cf6", icon: "plus-circle" },
      // Expense categories
      { name: "Food & Dining", type: "EXPENSE" as const, color: "#f97316", icon: "utensils" },
      { name: "Transportation", type: "EXPENSE" as const, color: "#eab308", icon: "car" },
      { name: "Shopping", type: "EXPENSE" as const, color: "#ec4899", icon: "shopping-bag" },
      { name: "Entertainment", type: "EXPENSE" as const, color: "#f43f5e", icon: "gamepad-2" },
      { name: "Bills & Utilities", type: "EXPENSE" as const, color: "#06b6d4", icon: "file-text" },
      { name: "Healthcare", type: "EXPENSE" as const, color: "#10b981", icon: "heart-pulse" },
      { name: "Education", type: "EXPENSE" as const, color: "#3b82f6", icon: "graduation-cap" },
      { name: "Other Expense", type: "EXPENSE" as const, color: "#71717a", icon: "more-horizontal" },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((cat) => ({
        ...cat,
        userId: user.id,
      })),
    });

    // Send verification email
    try {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: validatedData.email,
          token,
          expires,
        },
      });

      await sendVerificationEmail(validatedData.email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't block registration if email fails
    }

    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create account" };
  }
}

/**
 * Request a password reset email
 */
export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate token
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    await sendPasswordResetEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { error: "Failed to send reset email. Please try again." };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return { error: "Invalid or expired reset link" };
    }

    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { token } });
      return { error: "Reset link has expired. Please request a new one." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({ where: { token } });

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "Failed to reset password. Please try again." };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string) {
  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationToken) {
      return { error: "Invalid or expired verification link" };
    }

    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token,
          },
        },
      });
      return { error: "Verification link has expired. Please request a new one." };
    }

    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "Failed to verify email. Please try again." };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: true }; // Prevent email enumeration
    }

    if (user.emailVerified) {
      return { error: "Email is already verified" };
    }

    // Delete existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendVerificationEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "Failed to send verification email" };
  }
}
