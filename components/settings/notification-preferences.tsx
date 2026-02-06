"use client";

import { useState } from "react";
import { Bell, AlertTriangle, Repeat, PiggyBank } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationPrefs {
  budgetAlerts: boolean;
  budgetExceeded: boolean;
  recurringProcessed: boolean;
}

export function NotificationPreferences() {
  // Store preferences in localStorage (could be extended to server-side later)
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    if (typeof window === "undefined") {
      return { budgetAlerts: true, budgetExceeded: true, recurringProcessed: true };
    }
    const saved = localStorage.getItem("flux-notification-prefs");
    return saved
      ? JSON.parse(saved)
      : { budgetAlerts: true, budgetExceeded: true, recurringProcessed: true };
  });

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    localStorage.setItem("flux-notification-prefs", JSON.stringify(updated));
  };

  const items = [
    {
      key: "budgetAlerts" as const,
      label: "Budget Warnings",
      description: "Get notified when spending reaches 80% of a budget",
      icon: PiggyBank,
    },
    {
      key: "budgetExceeded" as const,
      label: "Budget Exceeded",
      description: "Get notified when a budget is exceeded",
      icon: AlertTriangle,
    },
    {
      key: "recurringProcessed" as const,
      label: "Recurring Transactions",
      description: "Get notified when recurring transactions are processed",
      icon: Repeat,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor={item.key} className="font-medium cursor-pointer">
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            <Switch
              id={item.key}
              checked={prefs[item.key]}
              onCheckedChange={(v) => updatePref(item.key, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
