import { cn } from "../../lib/utils";

export type StatusTone = "success" | "warning" | "critical" | "info" | "neutral";

/**
 * Canonical mapping from the many raw status strings used across the data
 * model (shipment status, PO status, check-in status, training status...)
 * to one of the 4 semantic tones. Centralizing this avoids re-deriving the
 * same tone/label logic in every screen.
 */
const STATUS_MAP: Record<string, { tone: StatusTone; label: string }> = {
  ok: { tone: "success", label: "Nominal" },
  nominal: { tone: "success", label: "Nominal" },
  complete: { tone: "success", label: "Complete" },
  "on-track": { tone: "success", label: "On Track" },
  delivered: { tone: "success", label: "Delivered" },
  cleared: { tone: "success", label: "Cleared" },
  approved: { tone: "success", label: "Approved" },
  arrived: { tone: "success", label: "Arrived" },

  watch: { tone: "warning", label: "Watch" },
  "at-risk": { tone: "warning", label: "At Risk" },
  delayed: { tone: "warning", label: "Delayed" },
  "in-progress": { tone: "warning", label: "In Progress" },
  "in-transit": { tone: "info", label: "In Transit" },
  scheduled: { tone: "info", label: "Scheduled" },
  planning: { tone: "info", label: "Planning" },
  pending_review: { tone: "info", label: "Pending Review" },

  critical: { tone: "critical", label: "Critical" },
  late: { tone: "critical", label: "Late" },
  sos: { tone: "critical", label: "SOS" },
  overdue: { tone: "critical", label: "Overdue" },
};

export function resolveStatus(raw: string): { tone: StatusTone; label: string } {
  return STATUS_MAP[raw] ?? { tone: "neutral", label: raw.replace(/-/g, " ") };
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success-subtle-foreground ring-success/20",
  warning: "bg-warning-subtle text-warning-subtle-foreground ring-warning/20",
  critical: "bg-critical-subtle text-critical-subtle-foreground ring-critical/20",
  info: "bg-info-subtle text-info-subtle-foreground ring-info/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const SOLID_TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  critical: "bg-critical text-critical-foreground",
  info: "bg-info text-info-foreground",
  neutral: "bg-secondary text-secondary-foreground",
};

export function StatusBadge({
  status,
  label,
  variant = "subtle",
  className,
}: {
  /** Either a raw status string from the data model, or an explicit tone. */
  status: string | StatusTone;
  label?: string;
  variant?: "subtle" | "solid";
  className?: string;
}) {
  const isTone = (["success", "warning", "critical", "info", "neutral"] as const).includes(
    status as StatusTone
  );
  const resolved = isTone ? { tone: status as StatusTone, label: label ?? status } : resolveStatus(status);
  const displayLabel = label ?? resolved.label;
  const toneClasses = variant === "solid" ? SOLID_TONE_CLASSES : TONE_CLASSES;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        variant === "subtle" && "ring-1",
        toneClasses[resolved.tone],
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
