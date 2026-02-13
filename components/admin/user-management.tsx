"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateUserRole, banUser, unbanUser, toggleUserActive } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MoreHorizontal, 
  Shield, 
  Ban, 
  CheckCircle,
  UserX,
  UserCheck,
  Crown,
  User,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
  _count: {
    transactions: number;
    wallets: number;
  };
}

interface UserManagementProps {
  users: UserData[];
}

const ROLE_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof User }> = {
  USER: { variant: "secondary", icon: User },
  ADMIN: { variant: "default", icon: Shield },
  SUPER_ADMIN: { variant: "default", icon: Crown },
};

export function UserManagement({ users }: UserManagementProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [banDialog, setBanDialog] = useState<{ userId: string; email: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  const currentUserRole = session?.user?.role as string;
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: string) => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole as "USER" | "ADMIN" | "SUPER_ADMIN");
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  };

  const handleBan = async () => {
    if (!banDialog) return;
    
    startTransition(async () => {
      const result = await banUser(banDialog.userId, banReason || "No reason provided");
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("User banned");
        router.refresh();
      }
      setBanDialog(null);
      setBanReason("");
    });
  };

  const handleUnban = async (userId: string) => {
    startTransition(async () => {
      try {
        await unbanUser(userId);
        toast.success("User unbanned");
        router.refresh();
      } catch {
        toast.error("Failed to unban user");
      }
    });
  };

  const handleToggleActive = async (userId: string) => {
    startTransition(async () => {
      const result = await toggleUserActive(userId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("User status updated");
        router.refresh();
      }
    });
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isCurrentUser = user.id === session?.user?.id;
                const RoleIcon = ROLE_BADGES[user.role]?.icon || User;
                
                return (
                  <TableRow key={user.id} className={isCurrentUser ? "bg-muted/50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.name || "No name"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGES[user.role]?.variant || "secondary"}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isBanned ? (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3 mr-1" />
                          Banned
                        </Badge>
                      ) : user.isActive ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{user._count.wallets} wallets</p>
                        <p className="text-muted-foreground">
                          {user._count.transactions} transactions
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(new Date(user.createdAt))}
                    </TableCell>
                    <TableCell>
                      {!isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(user.id, "USER")}
                                      disabled={user.role === "USER"}
                                    >
                                      <User className="h-4 w-4 mr-2" />
                                      User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(user.id, "ADMIN")}
                                      disabled={user.role === "ADMIN"}
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(user.id, "SUPER_ADMIN")}
                                      disabled={user.role === "SUPER_ADMIN"}
                                    >
                                      <Crown className="h-4 w-4 mr-2" />
                                      Super Admin
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            <DropdownMenuItem onClick={() => handleToggleActive(user.id)}>
                              {user.isActive ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {user.isBanned ? (
                              <DropdownMenuItem onClick={() => handleUnban(user.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setBanDialog({ userId: user.id, email: user.email })}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <AlertDialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Ban User
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Are you sure you want to ban <strong>{banDialog?.email}</strong>?
                They will no longer be able to log in.
              </p>
              <div>
                <label className="text-sm font-medium">
                  Reason (optional):
                </label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter ban reason"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBanReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
