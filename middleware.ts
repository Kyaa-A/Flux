import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the lightweight auth config that doesn't import Prisma
// This ensures the middleware runs in Edge Runtime without Node.js built-ins
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$).*)",
  ],
};
