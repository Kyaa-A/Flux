import type { NextAuthConfig } from "next-auth";

// Lightweight auth config for Edge Runtime (middleware)
// Does NOT import Prisma or any Node.js-only modules

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as unknown as Record<string, unknown>;
        token.role = u.role;
        token.currency = u.currency;
        token.locale = u.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        const s = session.user as unknown as Record<string, unknown>;
        s.role = token.role;
        s.currency = (token.currency as string) || "USD";
        s.locale = (token.locale as string) || "en-US";
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const publicRoutes = ["/login", "/register", "/forgot-password"];
      const adminRoutes = ["/admin"];

      // Allow API auth routes
      if (pathname.startsWith("/api/auth")) return true;

      // Allow cron API routes
      if (pathname.startsWith("/api/cron")) return true;

      // Allow reset-password and verify-email routes (dynamic)
      if (
        pathname.startsWith("/reset-password/") ||
        pathname.startsWith("/verify-email/")
      ) {
        return true;
      }

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && publicRoutes.includes(pathname)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Allow public routes and landing page
      if (publicRoutes.includes(pathname) || pathname === "/") return true;

      // Redirect unauthenticated users to login
      if (!isLoggedIn) {
        const callbackUrl = encodeURIComponent(pathname);
        return Response.redirect(
          new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
        );
      }

      // Redirect non-admin users from admin routes
      const userRole = (auth?.user as unknown as Record<string, unknown>)?.role;
      if (
        adminRoutes.some((route) => pathname.startsWith(route)) &&
        userRole !== "ADMIN" &&
        userRole !== "SUPER_ADMIN"
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Providers are added in the full auth.ts
} satisfies NextAuthConfig;
