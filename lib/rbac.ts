"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

// Role types
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

/**
 * Get current user with role from session
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      isBanned: true,
      currency: true,
      locale: true,
    },
  });

  return user;
}

/**
 * Check if user has a specific role or higher
 */
export async function hasRole(userRole: Role, requiredRole: Role): Promise<boolean> {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Check if user is an admin (ADMIN or SUPER_ADMIN)
 */
export async function isAdmin(role: Role): Promise<boolean> {
  return await hasRole(role, "ADMIN");
}

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(role: Role): Promise<boolean> {
  return role === "SUPER_ADMIN";
}

/**
 * Server action to require authentication
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.isBanned) {
    redirect("/banned");
  }
  if (!user.isActive) {
    redirect("/inactive");
  }
  return user;
}

/**
 * Server action to require admin role
 * Redirects to dashboard if not admin
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (!(await isAdmin(user.role as Role))) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Server action to require super admin role
 */
export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (!(await isSuperAdmin(user.role as Role))) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const currentUser = await requireAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      isBanned: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          wallets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

/**
 * Update user role (super admin only)
 */
export async function updateUserRole(userId: string, newRole: Role) {
  const currentUser = await requireSuperAdmin();

  // Cannot change own role
  if (currentUser.id === userId) {
    return { error: "Cannot change your own role" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  return { success: true };
}

/**
 * Ban user (admin only)
 */
export async function banUser(userId: string, reason: string) {
  const currentUser = await requireAdmin();

  // Cannot ban self
  if (currentUser.id === userId) {
    return { error: "Cannot ban yourself" };
  }

  // Check target user role
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!targetUser) {
    return { error: "User not found" };
  }

  // Cannot ban someone with equal or higher role
  if (!(await hasRole(currentUser.role as Role, targetUser.role as Role))) {
    return { error: "Cannot ban user with equal or higher role" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
      bannedReason: reason,
    },
  });

  return { success: true };
}

/**
 * Unban user (admin only)
 */
export async function unbanUser(userId: string) {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
      bannedAt: null,
      bannedReason: null,
    },
  });

  return { success: true };
}

/**
 * Toggle user active status (admin only)
 */
export async function toggleUserActive(userId: string) {
  const currentUser = await requireAdmin();

  // Cannot deactivate self
  if (currentUser.id === userId) {
    return { error: "Cannot deactivate yourself" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!user) {
    return { error: "User not found" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  return { success: true };
}

/**
 * Get system stats (admin only)
 */
export async function getSystemStats() {
  await requireAdmin();

  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    totalTransactions,
    totalWallets,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.transaction.count(),
    prisma.wallet.count(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    bannedUsers,
    totalTransactions,
    totalWallets,
    usersByRole: usersByRole.map((r) => ({
      role: r.role,
      count: r._count.role,
    })),
  };
}
