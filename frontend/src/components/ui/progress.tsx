"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const setProgressRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (node) {
          node.style.setProperty("--progress-value", `${percentage}%`);
        }
      },
      [percentage]
    );

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-800",
          className
        )}
        {...props}
      >
        <div
          ref={setProgressRef}
          className="progress-indicator h-full bg-gradient-to-r from-netflix-red to-red-600 transition-all duration-300 ease-in-out rounded-full"
        />
      </div>
    );
  }
)
Progress.displayName = "Progress"

export { Progress }
