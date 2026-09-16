"use client";

import { useTransition } from "react";
import { AlertCard, type AlertCardStatus } from "@polaris/ui";
import { reviewAgentRun } from "./actions";
import type { Tables } from "@polaris/supabase-client";

const AGENT_LABELS: Record<string, string> = {
  reorder_forecaster: "Reorder Forecaster",
  vendor_deadline_watcher: "Vendor Deadline Watcher",
  weather_contingency_planner: "Weather Contingency Planner",
  cargo_reconciliation: "Cargo Reconciliation",
  safety_escalation: "Safety Escalation",
  report_drafter: "Report Drafter",
  command_copilot: "Command Copilot",
};

export function AgentRunCard({ run }: { run: Tables<"ai_agent_runs"> }) {
  const [isPending, startTransition] = useTransition();

  function review(status: "approved" | "dismissed") {
    startTransition(async () => {
      await reviewAgentRun(run.id, status);
    });
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <AlertCard
        agentType={AGENT_LABELS[run.agent_type] ?? run.agent_type}
        triggeredAt={new Date(run.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        title={run.title}
        detail={run.detail}
        severity={run.severity}
        status={run.status as AlertCardStatus}
        onApprove={() => review("approved")}
        onDismiss={() => review("dismissed")}
      />
    </div>
  );
}
