"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/components/providers/currency-provider";

interface ExpenseDonutProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

interface TooltipPayloadItem {
  payload: { name: string; value: number; color: string };
}

function CustomTooltip({ active, payload, total, formatAmount }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
  formatAmount: (value: number | string) => string;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-foreground font-medium">{item.name}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatAmount(item.value)} ({percentage.toFixed(1)}%)
        </div>
      </div>
    );
  }
  return null;
}

export function ExpenseDonut({ data }: ExpenseDonutProps) {
  const { formatAmount } = useCurrency();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px] sm:h-[300px]">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">No expense data</div>
            <div className="text-sm text-muted-foreground/70">Add expenses to see breakdown</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] sm:h-[200px] mb-3 sm:mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} formatAmount={formatAmount} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {data.slice(0, 5).map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate max-w-[96px] sm:max-w-[120px]">
                    {item.name}
                  </span>
                </div>
                <span className="text-foreground font-medium">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
          {data.length > 5 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              +{data.length - 5} more categories
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
