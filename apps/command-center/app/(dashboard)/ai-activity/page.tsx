import { getAgentRuns } from "@/lib/data/ai";
import { AgentRunCard } from "./agent-run-card";

export default async function AIActivityPage() {
  const runs = await getAgentRuns();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">AI Command Layer</div>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">Autonomous Activity Feed</h2>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-foreground-subtle">No agent activity yet.</p>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <AgentRunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
