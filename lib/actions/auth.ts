"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { registerSchema, resetPasswordSchema, type RegisterFormData } from "@/lib/validations";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { bootstrapUserWorkspace } from "@/lib/user-bootstrap";
import { logAuditAction } from "@/lib/audit";

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

    await bootstrapUserWorkspace(user.id);

    await logAuditAction({
      action: "AUTH_REGISTER_SUCCESS",
      actorId: user.id,
      targetUserId: user.id,
      details: { method: "credentials" },
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
    // Validate password strength
    resetPasswordSchema.shape.password.parse(newPassword);

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

    const resetUser = await prisma.user.findUnique({
      where: { email: resetToken.email },
      select: { id: true },
    });
    if (resetUser) {
      await logAuditAction({
        action: "AUTH_PASSWORD_RESET_SUCCESS",
        actorId: resetUser.id,
        targetUserId: resetUser.id,
      });
    }

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
