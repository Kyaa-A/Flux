import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

interface UpcomingRecurringProps {
  items: Array<{
    id: string;
    description: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    frequency: string;
    nextRunDate: Date;
    categoryName: string;
    categoryColor: string;
    walletName: string;
  }>;
  currency?: string;
  locale?: string;
}

export function UpcomingRecurring({
  items,
  currency = "USD",
  locale = "en-US",
}: UpcomingRecurringProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Upcoming Recurring
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active recurring templates
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.walletName} - {item.frequency}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      item.type === "INCOME" ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {item.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(item.amount, currency, locale)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    style={{ borderColor: item.categoryColor, color: item.categoryColor }}
                  >
                    {item.categoryName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.nextRunDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
