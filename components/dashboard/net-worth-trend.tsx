"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";

interface NetWorthTrendProps {
  data: Array<{ month: string; balance: number }>;
}

export function NetWorthTrend({ data }: NetWorthTrendProps) {
  const { currency, locale } = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Net Worth Trend (6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data available yet
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCompactCurrency(value, currency, locale)}
                />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(
                      typeof value === "number" ? value : Number(value || 0),
                      currency,
                      locale
                    )
                  }
                  contentStyle={{ borderRadius: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Net Worth"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
