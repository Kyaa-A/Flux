import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSystemStats, getAllUsers } from "@/lib/rbac";
import { AdminStats } from "@/components/admin/admin-stats";
import { UserManagement } from "@/components/admin/user-management";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, Users, Activity } from "lucide-react";

export const metadata = {
  title: "Admin Dashboard | Flux",
  description: "Manage users and system settings",
};

async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user?.role) {
    redirect("/dashboard");
  }
  if (session.user.role === "USER") {
    redirect("/dashboard");
  }
  return session.user;
}

async function SystemStatsSection() {
  const stats = await getSystemStats();
  return <AdminStats stats={stats} />;
}

async function UsersSection() {
  const users = await getAllUsers();
  return <UserManagement users={users} />;
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-32 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const currentUser = await checkAdminAccess();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                System overview and user management
              </p>
            </div>
          </div>
        </div>
        <Badge 
          variant={currentUser.role === "SUPER_ADMIN" ? "default" : "secondary"}
          className="self-start"
        >
          {currentUser.role?.replace("_", " ")}
        </Badge>
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href="/admin/audit-log">View Audit Log</Link>
        </Button>
      </div>

      {/* System Stats */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Overview
        </h2>
        <Suspense fallback={<StatsSkeleton />}>
          <SystemStatsSection />
        </Suspense>
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </h2>
        <Suspense fallback={<UsersSkeleton />}>
          <UsersSection />
        </Suspense>
      </section>
    </div>
  );
}
