import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flux - Personal Finance Tracker",
  description: "Track your income, expenses, and grow your wealth with Flux",
  keywords: ["finance", "budget", "expense tracker", "income tracker", "personal finance"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

import { auth } from "@/lib/auth";
import SessionProvider from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider session={session}>
          <CurrencyProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster position="top-right" richColors />
            </ThemeProvider>
          </CurrencyProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
