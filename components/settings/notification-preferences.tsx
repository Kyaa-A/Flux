"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Repeat, PiggyBank, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/actions/settings";

interface NotificationPrefs {
  budgetAlerts: boolean;
  budgetExceeded: boolean;
  recurringProcessed: boolean;
  adminAccountStatus: boolean;
  largeTransaction: boolean;
  largeTransactionThreshold: number | null;
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    budgetAlerts: true,
    budgetExceeded: true,
    recurringProcessed: true,
    adminAccountStatus: true,
    largeTransaction: false,
    largeTransactionThreshold: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const serverPrefs = await getNotificationPreferences();
        const normalized: NotificationPrefs = {
          budgetAlerts: serverPrefs.budgetWarnings,
          budgetExceeded: serverPrefs.budgetExceeded,
          recurringProcessed: serverPrefs.recurringProcessed,
          adminAccountStatus: serverPrefs.adminAccountStatus,
          largeTransaction: serverPrefs.largeTransaction,
          largeTransactionThreshold: serverPrefs.largeTransactionThreshold,
        };
        setPrefs(normalized);
        setThresholdDraft(
          normalized.largeTransactionThreshold
            ? String(normalized.largeTransactionThreshold)
            : ""
        );
      } catch {
        toast.error("Failed to load notification preferences");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const savePrefs = async (next: NotificationPrefs) => {
    setSaving(true);
    setPrefs(next);
    try {
      await updateNotificationPreferences({
        budgetWarnings: next.budgetAlerts,
        budgetExceeded: next.budgetExceeded,
        recurringProcessed: next.recurringProcessed,
        adminAccountStatus: next.adminAccountStatus,
        largeTransaction: next.largeTransaction,
        largeTransactionThreshold: next.largeTransactionThreshold,
      });
    } catch {
      toast.error("Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    if (key === "largeTransaction" && !value) {
      updated.largeTransactionThreshold = null;
      setThresholdDraft("");
    }
    await savePrefs(updated);
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
    {
      key: "adminAccountStatus" as const,
      label: "Admin Account Actions",
      description: "Get notified when your account status or role is changed by admins",
      icon: ShieldAlert,
    },
  ];

  const handleThresholdSave = async () => {
    const parsed = thresholdDraft.trim() ? Number(thresholdDraft) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Threshold must be a positive number");
      return;
    }
    await savePrefs({
      ...prefs,
      largeTransactionThreshold: parsed,
    });
    toast.success("Threshold updated");
  };

  if (loading) {
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
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

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
              disabled={saving}
              onCheckedChange={(v) => void updatePref(item.key, v)}
            />
          </div>
        ))}

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="large-transaction-toggle" className="font-medium cursor-pointer">
                Large Transaction Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Notify me when a transaction exceeds a configured threshold
              </p>
            </div>
            <Switch
              id="large-transaction-toggle"
              checked={prefs.largeTransaction}
              disabled={saving}
              onCheckedChange={(v) => void updatePref("largeTransaction", v)}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500"
              value={thresholdDraft}
              disabled={!prefs.largeTransaction || saving}
              onChange={(e) => setThresholdDraft(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!prefs.largeTransaction || saving}
              onClick={() => void handleThresholdSave()}
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
