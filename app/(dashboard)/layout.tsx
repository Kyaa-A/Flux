"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  PiggyBank,
  Wallet,
  Tag,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Wallets", href: "/wallets", icon: Wallet },
  { name: "Budgets", href: "/budgets", icon: PiggyBank },
  { name: "Recurring", href: "/transactions/recurring", icon: Repeat },
  { name: "Analytics", href: "/analytics", icon: PieChart },
];

const bottomNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];


function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <Image src="/flux.png" alt="Flux" width={36} height={36} />
        <span className="text-xl font-bold text-foreground tracking-tight">Flux</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-emerald-600 dark:text-emerald-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-card border-border">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-72 lg:flex-col bg-card border-r border-border">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 lg:px-8 bg-background/80 backdrop-blur-xl border-b border-border">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search placeholder - can be expanded later */}
          <div className="hidden lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationDropdown />

            <ModeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 hover:bg-muted"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-400 text-white dark:text-zinc-900 text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-foreground">
                    {session?.user?.name || "User"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
              >
                <DropdownMenuLabel className="text-muted-foreground">
                  {session?.user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
