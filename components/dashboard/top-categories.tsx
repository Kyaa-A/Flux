import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface TopCategory {
  name: string;
  value: number;
  color: string;
}

export function TopCategories({
  data,
  currency = "USD",
  locale = "en-US",
}: {
  data: TopCategory[];
  currency?: string;
  locale?: string;
}) {
  const total = data.reduce((sum, c) => sum + c.value, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Spending Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No expenses this month
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Spending</CardTitle>
        <CardAction>
          <Link
            href="/analytics"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        {data.slice(0, 5).map((category) => {
          const percentage = total > 0 ? (category.value / total) * 100 : 0;
          return (
            <div key={category.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="font-semibold">{formatCurrency(category.value, currency, locale)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
