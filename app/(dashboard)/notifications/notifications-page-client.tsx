"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/actions/notifications";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Date;
}

const TYPE_ICONS: Record<string, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ERROR: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  INFO: "text-blue-500",
  WARNING: "text-amber-500",
  SUCCESS: "text-emerald-500",
  ERROR: "text-rose-500",
};

export function NotificationsPageClient({
  notifications,
  page,
  pages,
}: {
  notifications: NotificationItem[];
  page: number;
  pages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.push(`/notifications${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const onMarkAsRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      await deleteNotification(id);
      router.refresh();
    });
  };

  const onMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>All Notifications</CardTitle>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" disabled={isPending} onClick={onMarkAll}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark page as read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notifications found</p>
          </div>
        ) : (
          <>
            {notifications.map((notification, i) => {
              const Icon = TYPE_ICONS[notification.type] || Info;
              const iconColor = TYPE_COLORS[notification.type] || "text-muted-foreground";
              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 px-4 py-4 ${i < notifications.length - 1 ? "border-b" : ""} ${
                    !notification.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isPending}
                            onClick={() => onMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending}
                          onClick={() => onDelete(notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {notification.actionUrl && (
                        <Badge variant="outline" className="text-xs">
                          {notification.actionUrl}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending || page <= 1}
                  onClick={() => updatePage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending || page >= pages}
                  onClick={() => updatePage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
