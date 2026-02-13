"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface IncomeExpenseData {
  name: string;
  income: number;
  expense: number;
}

interface IncomeExpenseBarProps {
  data: IncomeExpenseData[];
}

interface TooltipPayloadItem {
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-2 rounded-lg shadow-xl">
        <p className="text-sm font-medium mb-2">{label}</p>
        <p className="text-sm text-emerald-500">
          Income: {formatCurrency(payload[0].value)}
        </p>
        <p className="text-sm text-rose-500">
          Expense: {formatCurrency(payload[1].value)}
        </p>
      </div>
    );
  }
  return null;
}

export function IncomeExpenseBar({ data }: IncomeExpenseBarProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
          <XAxis dataKey="name" className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
          <YAxis
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
