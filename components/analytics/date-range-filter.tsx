"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

function toParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const presets = [
    {
      label: "This Week",
      from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
      to: today,
    },
    {
      label: "This Month",
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: today,
    },
    {
      label: "Last 3 Months",
      from: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()),
      to: today,
    },
    {
      label: "This Year",
      from: new Date(today.getFullYear(), 0, 1),
      to: today,
    },
  ];

  const applyRange = (from: Date, to: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", toParam(from));
    params.set("to", toParam(to));
    startTransition(() => {
      router.push(`/analytics?${params.toString()}`);
    });
  };

  const isPresetActive = (from: Date, to: Date) =>
    currentFrom === toParam(from) && currentTo === toParam(to);

  const hasCustomRange =
    currentFrom && !presets.some((p) => isPresetActive(p.from, p.to));

  const applyCustomRange = () => {
    if (!dateRange?.from) return;
    applyRange(dateRange.from, dateRange.to ?? dateRange.from);
    setIsOpen(false);
  };

  const clearRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    startTransition(() => {
      router.push(`/analytics?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={isPresetActive(preset.from, preset.to) ? "default" : "outline"}
          size="sm"
          onClick={() => applyRange(preset.from, preset.to)}
          disabled={isPending}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasCustomRange ? "default" : "outline"}
            size="sm"
            disabled={isPending}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            toDate={today}
          />
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={applyCustomRange} disabled={!dateRange?.from}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {currentFrom && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRange}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
