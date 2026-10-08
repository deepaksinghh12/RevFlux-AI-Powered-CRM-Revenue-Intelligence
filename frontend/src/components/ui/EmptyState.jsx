import { FolderOpen } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No data found",
  description = "Get started by creating your first entry.",
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 p-10 text-center shadow-xs",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas border border-line text-ink-soft mb-4 shadow-xs">
        <Icon className="h-6 w-6 text-brand-600" />
      </div>
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
