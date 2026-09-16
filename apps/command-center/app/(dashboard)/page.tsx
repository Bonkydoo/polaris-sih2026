import { AlertTriangle, Clock, Compass, Fuel, PackageCheck } from "lucide-react";
import { MetricCard, MapPanel, TimelineStep, StatusBadge, type MapMarker } from "@polaris/ui";
import { getOverviewData } from "@/lib/data/dashboard";
import { daysUntil, inventoryStatus } from "@/lib/derive";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-card ${className}`}>{children}</div>;
}

const LIFECYCLE_STEPS = ["planning", "active", "transit", "closed"] as const;

export default async function OverviewPage() {
  const { expedition, stations, inventory, shipments } = await getOverviewData();

  if (!expedition) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-foreground-subtle">
        No active expedition. An admin needs to create one to populate this dashboard.
      </div>
    );
  }

  const windowClose = daysUntil(expedition.window_close);
  const stationCriticalCount = stations.filter((s) => s.status === "critical").length;
  const stationWatchCount = stations.filter((s) => s.status === "watch").length;
  const nominalCount = stations.length - stationCriticalCount - stationWatchCount;
  const inTransitCount = shipments.filter((s) => s.status === "in-transit" || s.status === "scheduled").length;

  const itemStatuses = inventory.map(inventoryStatus);
  const itemCriticalCount = itemStatuses.filter((s) => s === "critical").length;
  const itemWatchCount = itemStatuses.filter((s) => s === "watch").length;

  const markers: MapMarker[] = stations.map((s, i) => ({
    id: s.id,
    label: s.name,
    x: 30 + i * 22,
    y: 20 + i * 25,
    tone: s.status === "ok" ? "success" : s.status === "watch" ? "warning" : "critical",
  }));

  const currentStepIndex = LIFECYCLE_STEPS.indexOf(expedition.status);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
            {expedition.season_label} · {expedition.vessel}
          </div>
          <h1 className="mt-0.5 font-heading text-2xl font-semibold text-foreground">{expedition.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-warning bg-warning-subtle px-3.5 py-2">
          <AlertTriangle className="size-4 text-warning-subtle-foreground" strokeWidth={2} />
          <span className="text-sm font-medium text-warning-subtle-foreground">
            {windowClose > 0 ? `Shipping window closes in ${windowClose} days` : "Shipping window closed"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Window Closes" value={`T-${windowClose}d`} tone="warning" icon={Clock} />
        <MetricCard label="Stations Nominal" value={`${nominalCount}/${stations.length}`} icon={Compass} />
        <MetricCard
          label="Inventory Flags"
          value={String(itemCriticalCount + itemWatchCount)}
          hint={`${itemCriticalCount} critical · ${itemWatchCount} watch`}
          tone={itemCriticalCount > 0 ? "critical" : "warning"}
          icon={Fuel}
        />
        <MetricCard label="Shipments In-Transit" value={String(inTransitCount)} icon={PackageCheck} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {stations.map((s) => (
          <Panel key={s.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">{s.region}</div>
                <div className="font-heading text-lg font-semibold">{s.name}</div>
              </div>
              <StatusBadge status={s.status === "ok" ? "nominal" : s.status} />
            </div>
            <div className="mt-3 text-xs text-foreground-subtle">{s.station_type}</div>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-foreground-subtle">
                <span>Personnel</span>
                <span className="font-mono">
                  {s.personnelOnStation} / {s.personnel_capacity}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, (s.personnelOnStation / Math.max(1, s.personnel_capacity)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <MapPanel title="Station Digital Twin" markers={markers} className="col-span-2" />
        <Panel className="p-5">
          <div className="mb-4 text-sm font-semibold text-foreground">Expedition Lifecycle</div>
          {LIFECYCLE_STEPS.map((step, i) => (
            <TimelineStep
              key={step}
              label={step[0].toUpperCase() + step.slice(1)}
              status={i < currentStepIndex ? "complete" : i === currentStepIndex ? "current" : "upcoming"}
              isLast={i === LIFECYCLE_STEPS.length - 1}
            />
          ))}
        </Panel>
      </div>

      <Panel className="mt-6 p-5">
        <div className="mb-4 text-sm font-semibold text-foreground">In-Transit Shipments</div>
        {shipments.length === 0 && <p className="text-sm text-foreground-subtle">No shipments recorded.</p>}
        <div className="space-y-4">
          {shipments.map((sh) => (
            <div key={sh.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {sh.mode.replace("_", " ")} · {(sh as { stations?: { name: string } | null }).stations?.name}
                </div>
                <StatusBadge status={sh.status} />
              </div>
              <div className="mt-1 text-xs text-foreground-subtle">{sh.route}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-accent-ink" style={{ width: `${sh.progress_pct}%` }} />
                </div>
                {sh.eta && (
                  <span className="font-mono text-xs text-foreground-subtle">
                    ETA {new Date(sh.eta).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
