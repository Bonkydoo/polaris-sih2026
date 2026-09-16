"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Ship,
  Boxes,
  Users,
  Sparkles,
  AlertTriangle,
  Clock,
  ChevronRight,
  Fuel,
  PackageCheck,
} from "lucide-react";
import {
  expedition,
  stations,
  inventory,
  vendors,
  purchaseOrders,
  shipments,
  personnel,
  agentRuns,
  vendorById,
  stationById,
  type AgentRun,
} from "@/lib/mock-data";
import {
  StatusBadge,
  AlertCard,
  type AlertCardStatus,
  MetricCard,
  TimelineStep,
  DataTable,
  MapPanel,
  type MapMarker,
} from "@polaris/ui";

type Section = "overview" | "cargo" | "inventory" | "personnel" | "ai";

const NAV: { id: Section; label: string; icon: typeof Compass }[] = [
  { id: "overview", label: "Expedition Overview", icon: Compass },
  { id: "cargo", label: "Cargo & Freight", icon: Ship },
  { id: "inventory", label: "Station Inventory", icon: Boxes },
  { id: "personnel", label: "Personnel & Safety", icon: Users },
  { id: "ai", label: "AI Activity", icon: Sparkles },
];

const STATION_MARKERS: MapMarker[] = [
  { id: "bharati", label: "Bharati", x: 38, y: 62, tone: "warning" },
  { id: "maitri", label: "Maitri", x: 58, y: 70, tone: "success" },
  { id: "himadri", label: "Himadri", x: 72, y: 18, tone: "success" },
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-card ${className}`}>{children}</div>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">{eyebrow}</div>
      <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export default function ArcticCommandDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [runOverrides, setRunOverrides] = useState<Record<string, AlertCardStatus>>({});

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <Compass className="size-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide text-white">POLARIS</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
              NCPOR Command Center
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="size-4" strokeWidth={2} />
                {item.label}
                {active && <ChevronRight className="ml-auto size-3.5 text-sidebar-primary" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
            Active Expedition
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{expedition.id}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-warning-subtle-foreground">
            <Clock className="size-3.5" />
            {expedition.daysToWindowClose} days to window close
          </div>
        </div>

        <Link
          href="/proto"
          className="flex items-center gap-2 border-t border-sidebar-border px-5 py-3.5 text-xs text-sidebar-foreground/70 transition hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> All directions
        </Link>
      </aside>

      {/* Main */}
      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
                {expedition.seasonLabel} · {expedition.vessel}
              </div>
              <h1 className="mt-0.5 font-heading text-2xl font-semibold text-foreground">
                {expedition.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-warning bg-warning-subtle px-3.5 py-2">
              <AlertTriangle className="size-4 text-warning-subtle-foreground" strokeWidth={2} />
              <span className="text-sm font-medium text-warning-subtle-foreground">
                Shipping window closes in {expedition.daysToWindowClose} days
              </span>
            </div>
          </div>
        </header>

        <main className="px-8 py-8">
          {section === "overview" && <Overview />}
          {section === "cargo" && <Cargo />}
          {section === "inventory" && <Inventory />}
          {section === "personnel" && <Personnel />}
          {section === "ai" && (
            <AIActivity overrides={runOverrides} setOverrides={setRunOverrides} />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview() {
  const criticalItems = inventory.filter((i) => i.status === "critical").length;
  const watchItems = inventory.filter((i) => i.status === "watch").length;

  return (
    <div>
      <SectionHeading eyebrow="Mission Control" title="Expedition Overview" />

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Window Closes"
          value={`T-${expedition.daysToWindowClose}d`}
          tone="warning"
          icon={Clock}
        />
        <MetricCard
          label="Stations Nominal"
          value={`${stations.filter((s) => s.status === "nominal").length}/${stations.length}`}
          icon={Compass}
        />
        <MetricCard
          label="Inventory Flags"
          value={String(criticalItems + watchItems)}
          hint={`${criticalItems} critical · ${watchItems} watch`}
          tone={criticalItems > 0 ? "critical" : "warning"}
          icon={Fuel}
        />
        <MetricCard
          label="Shipments In-Transit"
          value={String(shipments.filter((s) => s.status !== "arrived").length)}
          icon={PackageCheck}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {stations.map((s) => (
          <Panel key={s.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
                  {s.region}
                </div>
                <div className="font-heading text-lg font-semibold">{s.name}</div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-3 text-xs text-foreground-subtle">{s.coordinates}</div>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">{s.summary}</p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-foreground-subtle">
                <span>Personnel</span>
                <span className="font-mono">
                  {s.personnelOnStation} / {s.personnelCapacity}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(s.personnelOnStation / s.personnelCapacity) * 100}%` }}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <MapPanel title="Station Digital Twin" markers={STATION_MARKERS} className="col-span-2" />
        <Panel className="p-5">
          <div className="mb-4 text-sm font-semibold text-foreground">Expedition Lifecycle</div>
          <TimelineStep label="Proposal intake" status="complete" isLast={false} />
          <TimelineStep label="Team formation" status="complete" isLast={false} />
          <TimelineStep
            label="Training & quarantine"
            description="Cape Town quarantine batch 3 in progress"
            status="current"
            isLast={false}
          />
          <TimelineStep label="Travel window" status="upcoming" isLast={false} />
          <TimelineStep label="Active on station" status="upcoming" isLast />
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <Panel className="col-span-2 p-5">
          <div className="mb-4 text-sm font-semibold text-foreground">In-Transit Shipments</div>
          <div className="space-y-4">
            {shipments.map((sh) => (
              <div key={sh.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {sh.id} · {sh.mode}
                  </div>
                  <StatusBadge status={sh.status} />
                </div>
                <div className="mt-1 text-xs text-foreground-subtle">{sh.route}</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-accent-ink" style={{ width: `${sh.progressPct}%` }} />
                  </div>
                  <span className="font-mono text-xs text-foreground-subtle">{sh.etaLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 text-sm font-semibold text-foreground">Season Window</div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground-subtle">Window opens</dt>
              <dd className="font-mono">{expedition.windowOpen}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-subtle">Window closes</dt>
              <dd className="font-mono">{expedition.windowClose}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-subtle">Status</dt>
              <dd className="font-medium capitalize">{expedition.status}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-sm bg-muted p-3 text-xs leading-relaxed text-foreground-subtle">
            Once the vessel exits India Bay, resupply is unavailable until next season. Every
            reorder and PO below is being tracked against this date, not delivery date alone.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Cargo() {
  return (
    <div>
      <SectionHeading eyebrow="Cargo & Freight Orchestration" title="Purchase Orders & Shipment Tracker" />

      <DataTable
        keyField={(po) => po.id}
        data={purchaseOrders}
        columns={[
          { header: "PO", accessor: (po) => <span className="font-medium">{po.id}</span>, numeric: true },
          { header: "Vendor", accessor: (po) => vendorById(po.vendorId)?.name },
          { header: "Items", accessor: (po) => <span className="text-foreground-muted">{po.itemsSummary}</span> },
          {
            header: "Packing Deadline",
            accessor: (po) => (
              <>
                {po.packingDeadline}{" "}
                <span className="text-xs text-foreground-subtle">({po.daysToPackingDeadline}d)</span>
              </>
            ),
          },
          { header: "Status", accessor: (po) => <StatusBadge status={po.status} /> },
        ]}
      />

      <div className="mt-8 mb-4 text-sm font-semibold text-foreground">Shipment Tracker</div>
      <div className="grid grid-cols-3 gap-4">
        {shipments.map((sh) => (
          <Panel key={sh.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{sh.mode}</div>
              <StatusBadge status={sh.status} />
            </div>
            <div className="mt-2 text-xs text-foreground-subtle">{sh.id}</div>
            <p className="mt-3 text-sm text-foreground-muted">{sh.currentLeg}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${sh.progressPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-foreground-subtle">
              <span>{sh.cargoItemCount} cargo items</span>
              <span className="font-mono">{sh.etaLabel}</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 mb-4 text-sm font-semibold text-foreground">Vendor Performance</div>
      <DataTable
        keyField={(v) => v.id}
        data={vendors}
        columns={[
          { header: "Vendor", accessor: (v) => <span className="font-medium">{v.name}</span> },
          { header: "Category", accessor: (v) => <span className="text-foreground-muted">{v.category}</span> },
          { header: "Location", accessor: (v) => <span className="text-foreground-subtle">{v.location}</span> },
          {
            header: "Performance",
            numeric: true,
            accessor: (v) => (
              <>
                {v.performanceScore}
                <span className="text-foreground-subtle">/100</span>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

function Inventory() {
  return (
    <div>
      <SectionHeading eyebrow="Station Inventory & Asset Register" title="Consumption vs. Resupply Window" />
      {stations.map((s) => (
        <div key={s.id} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{s.name}</div>
            <span className="text-xs text-foreground-subtle">{s.code}</span>
          </div>
          <DataTable
            keyField={(i) => i.id}
            data={inventory.filter((i) => i.stationId === s.id)}
            columns={[
              { header: "Item", accessor: (i) => <span className="font-medium">{i.name}</span> },
              { header: "Category", accessor: (i) => <span className="text-foreground-muted">{i.category}</span> },
              {
                header: "Quantity",
                numeric: true,
                accessor: (i) => `${i.quantity.toLocaleString()} ${i.unit}`,
              },
              {
                header: "Days Remaining",
                numeric: true,
                accessor: (i) => (
                  <>
                    {i.daysRemaining}d{" "}
                    <span className="text-foreground-subtle">(reorder at {i.reorderThresholdDays}d)</span>
                  </>
                ),
              },
              { header: "Status", accessor: (i) => <StatusBadge status={i.status} /> },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

function Personnel() {
  return (
    <div>
      <SectionHeading eyebrow="Personnel & Safety Operations" title="Roster & Check-In Status" />
      <DataTable
        keyField={(p) => p.id}
        data={personnel}
        columns={[
          { header: "Name", accessor: (p) => <span className="font-medium">{p.name}</span> },
          { header: "Role", accessor: (p) => <span className="text-foreground-muted">{p.role}</span> },
          { header: "Station", accessor: (p) => stationById(p.stationId)?.name },
          {
            header: "Training",
            accessor: (p) => <StatusBadge status={p.trainingStatus === "complete" ? "ok" : p.trainingStatus} />,
          },
          {
            header: "Last Check-in",
            accessor: (p) => <span className="font-mono text-foreground-subtle">{p.lastCheckin}</span>,
          },
          { header: "Status", accessor: (p) => <StatusBadge status={p.checkinStatus} /> },
        ]}
      />
    </div>
  );
}

function AIActivity({
  overrides,
  setOverrides,
}: {
  overrides: Record<string, AlertCardStatus>;
  setOverrides: (updater: (prev: Record<string, AlertCardStatus>) => Record<string, AlertCardStatus>) => void;
}) {
  const setStatus = (id: string, status: AlertCardStatus) =>
    setOverrides((prev) => ({ ...prev, [id]: status }));

  return (
    <div>
      <SectionHeading eyebrow="AI Command Layer" title="Autonomous Activity Feed" />
      <div className="space-y-4">
        {agentRuns.map((run: AgentRun) => (
          <AlertCard
            key={run.id}
            agentType={run.agentType}
            triggeredAt={run.triggeredAt}
            title={run.title}
            detail={run.detail}
            severity={run.severity}
            status={overrides[run.id] ?? run.status}
            onApprove={() => setStatus(run.id, "approved")}
            onDismiss={() => setStatus(run.id, "dismissed")}
          />
        ))}
      </div>
    </div>
  );
}
