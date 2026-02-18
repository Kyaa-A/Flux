import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@/app/generated/prisma/client";
import { bootstrapUserWorkspace } from "@/lib/user-bootstrap";
import { logAuditAction } from "@/lib/audit";

// Extend the default session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      currency: string;
      locale: string;
      onboardedAt: Date | null;
    };
  }
  interface User {
    role: Role;
    currency: string;
    locale: string;
    onboardedAt: Date | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        if (user.isBanned) {
          throw new Error("Your account has been suspended");
        }

        if (!user.isActive) {
          throw new Error("Your account is inactive");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          currency: user.currency,
          locale: user.locale,
          onboardedAt: user.onboardedAt,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, isActive: true, isBanned: true },
      });

      if (!dbUser || dbUser.isBanned || !dbUser.isActive) {
        return false;
      }

      if (account?.provider && account.provider !== "credentials") {
        await bootstrapUserWorkspace(dbUser.id);
      }

      await logAuditAction({
        action: "AUTH_LOGIN_SUCCESS",
        actorId: dbUser.id,
        targetUserId: dbUser.id,
        details: { provider: account?.provider || "credentials" },
      });

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.currency = user.currency;
        token.locale = user.locale;
        token.onboardedAt = user.onboardedAt ?? null;
      }
      // Refresh user data when session is updated
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { currency: true, locale: true, name: true, role: true, onboardedAt: true },
        });
        if (dbUser) {
          token.currency = dbUser.currency;
          token.locale = dbUser.locale;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.onboardedAt = dbUser.onboardedAt ?? null;
        }
      }
      return token;
    },
  },
});
