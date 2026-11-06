"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | DateRange;
  onSelect?: (date: any) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  className?: string;
}

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    if (selected instanceof Date) return new Date(selected);
    if (selected && "from" in selected && selected.from) return new Date(selected.from);
    return new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1?: Date, d2?: Date) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isInRange = (d: Date, range?: DateRange) => {
    if (!range?.from || !range?.to) return false;
    const time = d.getTime();
    const fromTime = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()).getTime();
    const toTime = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()).getTime();
    return time >= fromTime && time <= toTime;
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    if (disabled && disabled(clickedDate)) return;

    if (mode === "single") {
      onSelect?.(clickedDate);
    } else if (mode === "range") {
      const currentRange = (selected && "from" in selected ? selected : {}) as DateRange;
      if (!currentRange.from || (currentRange.from && currentRange.to)) {
        onSelect?.({ from: clickedDate, to: undefined });
      } else {
        if (clickedDate < currentRange.from) {
          onSelect?.({ from: clickedDate, to: currentRange.from });
        } else {
          onSelect?.({ from: currentRange.from, to: clickedDate });
        }
      }
    }
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className={cn("p-3 select-none bg-zinc-950 text-white rounded-lg border border-white/10 w-72", className)}>
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <span className="text-sm font-semibold text-zinc-100">
          {monthNames[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500 font-medium mb-1">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {blanksArray.map((_, i) => (
          <div key={`blank-${i}`} className="h-8 w-8" />
        ))}
        {daysArray.map((day) => {
          const dayDate = new Date(year, month, day);
          const isDisabled = disabled ? disabled(dayDate) : false;

          let isSelected = false;
          let inRange = false;

          if (mode === "single" && selected instanceof Date) {
            isSelected = isSameDay(dayDate, selected);
          } else if (mode === "range" && selected && "from" in selected) {
            isSelected = isSameDay(dayDate, selected.from) || isSameDay(dayDate, selected.to);
            inRange = isInRange(dayDate, selected);
          }

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center font-medium transition",
                isDisabled && "opacity-30 cursor-not-allowed text-zinc-600",
                !isDisabled && !isSelected && !inRange && "text-zinc-200 hover:bg-zinc-800 hover:text-white",
                inRange && !isSelected && "bg-primary/20 text-primary-foreground",
                isSelected && "bg-primary text-primary-foreground font-bold shadow"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
