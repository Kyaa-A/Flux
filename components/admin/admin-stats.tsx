"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Receipt, 
  Wallet,
  Shield,
  Users2,
  Crown,
} from "lucide-react";

interface AdminStatsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    totalTransactions: number;
    totalWallets: number;
    usersByRole: Array<{ role: string; count: number }>;
  };
}

export function AdminStats({ stats }: AdminStatsProps) {
  const roleIcons: Record<string, typeof Users> = {
    USER: Users2,
    ADMIN: Shield,
    SUPER_ADMIN: Crown,
  };

  const roleColors: Record<string, string> = {
    USER: "text-blue-500 bg-blue-500/10",
    ADMIN: "text-amber-500 bg-amber-500/10",
    SUPER_ADMIN: "text-purple-500 bg-purple-500/10",
  };

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {stats.activeUsers}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Banned Users
            </CardTitle>
            <UserX className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              {stats.bannedUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wallets
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWallets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {stats.usersByRole.map(({ role, count }) => {
              const Icon = roleIcons[role] || Users;
              const colorClass = roleColors[role] || "text-gray-500 bg-gray-500/10";
              
              return (
                <div
                  key={role}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 ${colorClass}`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs opacity-80">
                      {role.replace("_", " ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
