import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";
import type { StatusTone } from "./status-badge";

const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  critical: "text-critical",
  info: "text-info",
  neutral: "text-foreground",
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatusTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-foreground-subtle">
          {label}
        </span>
        {Icon && <Icon className={cn("size-4", TONE_TEXT[tone])} strokeWidth={2} />}
      </div>
      <div className={cn("mt-1.5 font-mono text-2xl font-semibold", TONE_TEXT[tone])}>{value}</div>
      {hint && <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}
