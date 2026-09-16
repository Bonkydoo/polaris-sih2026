import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

export type TimelineStepStatus = "complete" | "current" | "upcoming";

export function TimelineStep({
  label,
  description,
  status,
  isLast = false,
}: {
  label: string;
  description?: string;
  status: TimelineStepStatus;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
            status === "complete" && "border-success bg-success text-success-foreground",
            status === "current" && "border-accent-ink bg-background text-accent-ink",
            status === "upcoming" && "border-border bg-background text-foreground-subtle"
          )}
        >
          {status === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </div>
        {!isLast && (
          <div
            className={cn(
              "mt-1 w-px flex-1",
              status === "complete" ? "bg-success" : "bg-border"
            )}
          />
        )}
      </div>
      <div className={cn("pb-6", isLast && "pb-0")}>
        <div
          className={cn(
            "text-sm font-semibold",
            status === "upcoming" ? "text-foreground-subtle" : "text-foreground"
          )}
        >
          {label}
        </div>
        {description && <p className="mt-0.5 text-xs text-foreground-subtle">{description}</p>}
      </div>
    </div>
  );
}
