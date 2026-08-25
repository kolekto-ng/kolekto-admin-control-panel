import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * First-visit placeholder for a data table.
 *
 * This is shown only when there is genuinely nothing to display (React Query's
 * `isPending` — no cached page for this key). A revisit or a filter change
 * keeps the previous rows on screen and uses `RefreshingIndicator` instead, so
 * the admin never watches a skeleton replace data that is already known.
 */
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="p-4 space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading data…</span>
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-1">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Subtle "checking for updates" affordance used while cached data is on screen.
 * Intentionally small and non-blocking — it must never imply the visible rows
 * are unusable.
 */
export function RefreshingIndicator({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
      role="status"
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      Refreshing
    </span>
  );
}
