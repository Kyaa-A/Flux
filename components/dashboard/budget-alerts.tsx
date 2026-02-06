"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface BudgetAlert {
  id: string;
  name: string;
  amount: number;
  spent: number;
  percentUsed: number;
  period: string;
}

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
}

export function BudgetAlerts({ alerts }: BudgetAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          Budget Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              href="/budgets"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{alert.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(alert.spent)} / {formatCurrency(alert.amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(alert.percentUsed, 100)}%`,
                      backgroundColor:
                        alert.percentUsed >= 100 ? "hsl(var(--destructive))" : "#f59e0b",
                    }}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    alert.percentUsed >= 100 ? "text-destructive" : "text-amber-500"
                  }`}
                >
                  {alert.percentUsed.toFixed(0)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
