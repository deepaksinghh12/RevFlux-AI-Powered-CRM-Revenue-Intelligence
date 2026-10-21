import { cn } from "../../lib/utils";

/**
 * Basic Vercel-inspired subtle shimmer skeleton block.
 * Uses muted surface background with a smooth moving gradient.
 * Respects prefers-reduced-motion via CSS.
 */
export function Skeleton({ className, rounded = "rounded-xl", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer shrink-0", rounded, className)}
      {...props}
    />
  );
}

/**
 * Text line placeholder with configurable lines and varying natural widths.
 */
export function SkeletonText({
  lines = 3,
  lineClassName = "h-3.5",
  gap = "space-y-2",
  lastLineWidth = "w-3/5",
  className,
  ...props
}) {
  return (
    <div aria-hidden="true" className={cn(gap, className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        const widthClass = isLast
          ? lastLineWidth
          : i % 2 === 1
          ? "w-4/5"
          : "w-full";
        return (
          <Skeleton
            key={i}
            className={cn(lineClassName, widthClass)}
          />
        );
      })}
    </div>
  );
}

/**
 * Card container skeleton matching RevFlux's card aesthetics.
 */
export function SkeletonCard({
  hasHeader = true,
  lines = 3,
  className,
  children,
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center justify-between pb-1">
          <div className="space-y-1.5 w-1/2">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      )}
      {children || <SkeletonText lines={lines} />}
    </div>
  );
}

/**
 * Table placeholder skeleton matching RevFlux's table layouts.
 */
export function SkeletonTable({
  rows = 5,
  columns = 5,
  className,
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface shadow-xs",
        className
      )}
      {...props}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-line bg-surface-muted/40 px-6 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            className={cn("h-3.5 rounded-md", i === 0 ? "w-28" : "w-20")}
          />
        ))}
      </div>
      {/* Data Rows */}
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`tr-${r}`}
            className="flex items-center justify-between px-6 py-4"
          >
            {Array.from({ length: columns }).map((_, c) => {
              const widths = ["w-36", "w-24", "w-20", "w-28", "w-16"];
              return (
                <div key={`td-${r}-${c}`} className="flex items-center gap-3">
                  {c === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                  <Skeleton
                    className={cn(
                      "h-3.5 rounded-md",
                      widths[c % widths.length]
                    )}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Centered spinner for full-section loading states. */
export function Spinner({ className }) {
  return (
    <div className={cn("flex items-center justify-center p-10", className)}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  );
}
