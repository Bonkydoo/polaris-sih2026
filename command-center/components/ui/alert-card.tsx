"use client";

import { Sparkles, CheckCircle2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export type AlertCardStatus = "pending_review" | "approved" | "dismissed";

/**
 * The one component every AI-agent-drafted action renders through, across
 * all three portals. Nothing an agent produces executes on its own — this
 * card is the human-in-the-loop checkpoint (see AI Automation Architecture,
 * TRD §5): it always shows Approve / Edit / Dismiss until a human acts.
 */
export function AlertCard({
  agentType,
  triggeredAt,
  title,
  detail,
  /** Raw severity string from the data model (e.g. "critical", "watch",
   *  "info") — resolved to a tone the same way StatusBadge resolves any
   *  other status, so callers don't need to pre-map it. */
  severity,
  status,
  onApprove,
  onEdit,
  onDismiss,
  className,
}: {
  agentType: string;
  triggeredAt: string;
  title: string;
  detail: string;
  severity: string;
  status: AlertCardStatus;
  onApprove?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-accent">
            <Sparkles className="size-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
              {agentType} · {triggeredAt}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-muted">{detail}</p>
          </div>
        </div>
        <StatusBadge status={severity} />
      </div>

      {status === "pending_review" ? (
        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={onApprove} className="gap-1.5">
            <CheckCircle2 className="size-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
            <Pencil className="size-3.5" /> Edit draft
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 text-foreground-subtle">
            <X className="size-3.5" /> Dismiss
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs font-medium",
            status === "approved" ? "text-success" : "text-foreground-subtle"
          )}
        >
          <CheckCircle2 className="size-3.5" />
          {status === "approved" ? "Approved by Command Staff" : "Dismissed"}
        </div>
      )}
    </div>
  );
}
