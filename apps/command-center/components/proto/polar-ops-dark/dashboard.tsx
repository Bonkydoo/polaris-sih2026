"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Radar,
  Ship,
  Boxes,
  Users,
  Sparkles,
  Activity,
  AlertOctagon,
  CheckCircle2,
  XCircle,
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
} from "@/lib/mock-data";

type Section = "overview" | "cargo" | "inventory" | "personnel" | "ai";

const NAV: { id: Section; label: string; icon: typeof Radar }[] = [
  { id: "overview", label: "OVERVIEW", icon: Radar },
  { id: "cargo", label: "CARGO", icon: Ship },
  { id: "inventory", label: "INVENTORY", icon: Boxes },
  { id: "personnel", label: "PERSONNEL", icon: Users },
  { id: "ai", label: "AI FEED", icon: Sparkles },
];

function toneColor(status: string) {
  switch (status) {
    case "critical":
    case "late":
    case "sos":
    case "overdue":
      return "#FB4747";
    case "watch":
    case "at-risk":
    case "delayed":
      return "#F2B33D";
    default:
      return "#3DDC97";
  }
}

function Tag({ status }: { status: string }) {
  const c = toneColor(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color: c, backgroundColor: `${c}1A`, border: `1px solid ${c}40` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
      {status.replace("-", " ")}
    </span>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-white/10 bg-[#0B1119] ${className}`}>
      {title && (
        <div className="border-b border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#5B7A8C]">
          {title}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function Bar({ pct, color = "#22D3EE" }: { pct: number; color?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function PolarOpsDarkDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const criticalCount = agentRuns.filter((r) => r.severity === "critical").length;

  return (
    <div className="flex min-h-screen bg-[#05080D] text-[#C9D8E3]">
      {/* Icon rail */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col items-center border-r border-white/10 bg-[#070B12] py-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-[#22D3EE]/10 text-[#22D3EE]">
          <Radar className="size-4.5" strokeWidth={2} />
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                title={item.label}
                className={`flex size-10 items-center justify-center rounded-md transition ${
                  active ? "bg-[#22D3EE]/15 text-[#22D3EE]" : "text-[#4C6578] hover:bg-white/5 hover:text-[#C9D8E3]"
                }`}
              >
                <Icon className="size-4.5" strokeWidth={2} />
              </button>
            );
          })}
        </nav>
        <Link
          href="/"
          className="mt-auto flex size-10 items-center justify-center rounded-md text-[#4C6578] hover:bg-white/5 hover:text-[#C9D8E3]"
          title="All directions"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </aside>

      <div className="ml-16 flex-1">
        {/* Ticker header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#05080D]/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-6">
            <div>
              <div
                className="text-sm font-bold tracking-tight text-white"
                style={{ fontFamily: "var(--font-pd-display)" }}
              >
                POLARIS // {expedition.id}
              </div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#5B7A8C]">
                {expedition.seasonLabel}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <Metric label="WINDOW CLOSE" value={`T-${expedition.daysToWindowClose}d`} color="#F2B33D" />
            <Metric label="STATIONS NOMINAL" value={`${stations.filter((s) => s.status === "nominal").length}/${stations.length}`} />
            <Metric label="AGENT ALERTS" value={String(criticalCount)} color="#FB4747" />
            <Metric label="SHIPMENTS IN-TRANSIT" value={String(shipments.filter((s) => s.status !== "arrived").length)} />
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#3DDC97]">
            <Activity className="size-3.5 animate-pulse" />
            Live feed
          </div>
        </header>

        <main className="px-6 py-6">
          {section === "overview" && <Overview />}
          {section === "cargo" && <Cargo />}
          {section === "inventory" && <Inventory />}
          {section === "personnel" && <Personnel />}
          {section === "ai" && <AIActivity />}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, color = "#C9D8E3" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#5B7A8C]">{label}</div>
      <div className="text-sm font-bold" style={{ color, fontFamily: "var(--font-pd-display)" }}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-white"
      style={{ fontFamily: "var(--font-pd-display)" }}
    >
      {children}
    </h2>
  );
}

function Overview() {
  return (
    <div>
      <SectionTitle>Grid Overview</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {stations.map((s) => (
          <Panel key={s.id} title={`${s.code} · ${s.region.toUpperCase()}`}>
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-white" style={{ fontFamily: "var(--font-pd-display)" }}>
                {s.name}
              </div>
              <Tag status={s.status} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#8CA3B3]">{s.summary}</p>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-[#5B7A8C]">
                <span>CAPACITY</span>
                <span>{s.capacityPct}%</span>
              </div>
              <Bar pct={s.capacityPct} color={toneColor(s.status)} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[#5B7A8C]">
              <span>PERSONNEL</span>
              <span>
                {s.personnelOnStation}/{s.personnelCapacity}
              </span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Panel title="SHIPMENT TELEMETRY" className="col-span-2">
          <div className="space-y-3">
            {shipments.map((sh) => (
              <div key={sh.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <div className="text-xs font-semibold text-white">{sh.mode}</div>
                  <div className="text-[10px] text-[#5B7A8C]">{sh.id}</div>
                </div>
                <div className="flex-1">
                  <Bar pct={sh.progressPct} color={toneColor(sh.status)} />
                </div>
                <div className="w-16 shrink-0 text-right">
                  <Tag status={sh.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="SEASON WINDOW">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#5B7A8C]">OPEN</span>
              <span className="text-white">{expedition.windowOpen}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5B7A8C]">CLOSE</span>
              <span className="text-white">{expedition.windowClose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5B7A8C]">VESSEL</span>
              <span className="text-right text-white">{expedition.vessel}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Cargo() {
  return (
    <div>
      <SectionTitle>Cargo &amp; Freight</SectionTitle>
      <Panel title="PURCHASE ORDERS">
        <div className="space-y-0 divide-y divide-white/5">
          {purchaseOrders.map((po) => {
            const v = vendorById(po.vendorId);
            return (
              <div key={po.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-[#22D3EE]">{po.id}</span>
                  <div>
                    <div className="text-xs font-medium text-white">{v?.name}</div>
                    <div className="text-[10px] text-[#5B7A8C]">{po.itemsSummary}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-[#5B7A8C]">
                    CUTOFF {po.packingDeadline} (T-{po.daysToPackingDeadline}d)
                  </span>
                  <Tag status={po.status} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {shipments.map((sh) => (
          <Panel key={sh.id} title={sh.mode.toUpperCase()}>
            <div className="text-[10px] text-[#5B7A8C]">{sh.id}</div>
            <p className="mt-1 text-xs text-[#8CA3B3]">{sh.currentLeg}</p>
            <div className="mt-3">
              <Bar pct={sh.progressPct} color={toneColor(sh.status)} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[#5B7A8C]">
              <span>{sh.cargoItemCount} ITEMS</span>
              <Tag status={sh.status} />
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-3">
        <Panel title="VENDOR PERFORMANCE">
          <div className="grid grid-cols-2 gap-3">
            {vendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded bg-white/[0.02] px-3 py-2">
                <div>
                  <div className="text-xs font-medium text-white">{v.name}</div>
                  <div className="text-[10px] text-[#5B7A8C]">{v.category}</div>
                </div>
                <span className="text-sm font-bold text-[#22D3EE]">{v.performanceScore}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Inventory() {
  return (
    <div>
      <SectionTitle>Station Inventory</SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {stations.map((s) => (
          <Panel key={s.id} title={`${s.name.toUpperCase()} — ${s.code}`}>
            <div className="space-y-3">
              {inventory
                .filter((i) => i.stationId === s.id)
                .map((i) => (
                  <div key={i.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{i.name}</span>
                      <Tag status={i.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#5B7A8C]">
                      <span>
                        {i.quantity.toLocaleString()} {i.unit}
                      </span>
                      <span>{i.daysRemaining}d remaining</span>
                    </div>
                    <div className="mt-1">
                      <Bar
                        pct={Math.min(100, (i.daysRemaining / (i.reorderThresholdDays * 2)) * 100)}
                        color={toneColor(i.status)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Personnel() {
  return (
    <div>
      <SectionTitle>Personnel &amp; Safety</SectionTitle>
      <Panel title="ROSTER">
        <div className="divide-y divide-white/5">
          {personnel.map((p) => {
            const st = stationById(p.stationId);
            return (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-xs font-semibold text-white">{p.name}</div>
                  <div className="text-[10px] text-[#5B7A8C]">
                    {p.role} · {st?.name} · {p.batch}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#5B7A8C]">{p.lastCheckin}</span>
                  <Tag status={p.trainingStatus === "complete" ? "ok" : p.trainingStatus} />
                  <Tag status={p.checkinStatus} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function AIActivity() {
  return (
    <div>
      <SectionTitle>Autonomous Agent Feed</SectionTitle>
      <div className="space-y-3">
        {agentRuns.map((run) => (
          <Panel key={run.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#22D3EE]/10 text-[#22D3EE]">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#5B7A8C]">
                    {run.agentType} · {run.triggeredAt}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-white">{run.title}</div>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#8CA3B3]">{run.detail}</p>
                </div>
              </div>
              <Tag status={run.severity} />
            </div>
            {run.status === "pending_review" ? (
              <div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
                <button className="flex items-center gap-1.5 rounded bg-[#22D3EE] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#05080D]">
                  <CheckCircle2 className="size-3.5" /> Approve
                </button>
                <button className="rounded border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#C9D8E3] hover:bg-white/5">
                  Edit draft
                </button>
                <button className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5B7A8C] hover:bg-white/5">
                  <XCircle className="size-3.5" /> Dismiss
                </button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-[10px] font-bold uppercase tracking-wide text-[#3DDC97]">
                <CheckCircle2 className="size-3.5" /> Approved by command staff
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="mt-3">
        <Panel title="AGENT STATUS">
          <div className="flex items-center gap-2 text-xs text-[#8CA3B3]">
            <AlertOctagon className="size-3.5 text-[#F2B33D]" />
            2 drafts pending human sign-off. Nothing executes automatically.
          </div>
        </Panel>
      </div>
    </div>
  );
}
