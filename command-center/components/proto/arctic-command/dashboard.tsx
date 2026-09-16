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
  CheckCircle2,
  Clock,
  ChevronRight,
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

const NAV: { id: Section; label: string; icon: typeof Compass }[] = [
  { id: "overview", label: "Expedition Overview", icon: Compass },
  { id: "cargo", label: "Cargo & Freight", icon: Ship },
  { id: "inventory", label: "Station Inventory", icon: Boxes },
  { id: "personnel", label: "Personnel & Safety", icon: Users },
  { id: "ai", label: "AI Activity", icon: Sparkles },
];

function statusTone(status: string) {
  switch (status) {
    case "critical":
    case "late":
    case "sos":
    case "overdue":
      return { text: "text-[#B3261E]", bg: "bg-[#B3261E]/10", ring: "ring-[#B3261E]/20", label: "Critical" };
    case "watch":
    case "at-risk":
    case "delayed":
      return { text: "text-[#9A6A00]", bg: "bg-[#9A6A00]/10", ring: "ring-[#9A6A00]/20", label: "Watch" };
    default:
      return { text: "text-[#0B6B3A]", bg: "bg-[#0B6B3A]/10", ring: "ring-[#0B6B3A]/20", label: "Nominal" };
  }
}

function StatusPill({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${t.text} ${t.bg} ${t.ring}`}
      style={{ fontFamily: "var(--font-ac-mono)" }}
    >
      {status.replace("-", " ")}
    </span>
  );
}

export default function ArcticCommandDashboard() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="flex min-h-screen bg-[#F3F5F7] text-[#0B1E33]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#0B1E33] text-[#DCE8F2]">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-sm bg-[#4FA8D8] text-[#0B1E33]">
            <Compass className="size-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white" style={{ fontFamily: "var(--font-ac-serif)" }}>
              POLARIS
            </div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#7FA8C4]">NCPOR Command Center</div>
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
                    ? "bg-[#123A5C] text-white font-medium"
                    : "text-[#9FBBD1] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-4" strokeWidth={2} />
                {item.label}
                {active && <ChevronRight className="ml-auto size-3.5 text-[#4FA8D8]" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.15em] text-[#7FA8C4]">Active Expedition</div>
          <div className="mt-1 text-sm font-semibold text-white">{expedition.id}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#F2C265]">
            <Clock className="size-3.5" />
            {expedition.daysToWindowClose} days to window close
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 border-t border-white/10 px-5 py-3.5 text-xs text-[#7FA8C4] transition hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> All directions
        </Link>
      </aside>

      {/* Main */}
      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-10 border-b border-[#D8E0E6] bg-[#F3F5F7]/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#5E7284]">
                {expedition.seasonLabel} · {expedition.vessel}
              </div>
              <h1
                className="mt-0.5 text-2xl font-semibold text-[#0B1E33]"
                style={{ fontFamily: "var(--font-ac-serif)" }}
              >
                {expedition.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-[#F2C265] bg-[#FDF3DE] px-3.5 py-2">
              <AlertTriangle className="size-4 text-[#9A6A00]" strokeWidth={2} />
              <span className="text-sm font-medium text-[#7A5300]">
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
          {section === "ai" && <AIActivity />}
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-[0.15em] text-[#5E7284]">{eyebrow}</div>
      <h2 className="mt-1 text-xl font-semibold text-[#0B1E33]" style={{ fontFamily: "var(--font-ac-serif)" }}>
        {title}
      </h2>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-[#D8E0E6] bg-white ${className}`}>{children}</div>
  );
}

function Overview() {
  return (
    <div>
      <SectionHeading eyebrow="Mission Control" title="Expedition Overview" />
      <div className="grid grid-cols-3 gap-4">
        {stations.map((s) => (
          <Panel key={s.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-[#5E7284]">{s.region}</div>
                <div className="text-lg font-semibold" style={{ fontFamily: "var(--font-ac-serif)" }}>
                  {s.name}
                </div>
              </div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-3 text-xs text-[#5E7284]">{s.coordinates}</div>
            <p className="mt-3 text-sm leading-relaxed text-[#2B3E4E]">{s.summary}</p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#5E7284]">
                <span>Personnel</span>
                <span style={{ fontFamily: "var(--font-ac-mono)" }}>
                  {s.personnelOnStation} / {s.personnelCapacity}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7ECF0]">
                <div
                  className="h-full bg-[#123A5C]"
                  style={{ width: `${(s.personnelOnStation / s.personnelCapacity) * 100}%` }}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <Panel className="col-span-2 p-5">
          <div className="mb-4 text-sm font-semibold text-[#0B1E33]">In-Transit Shipments</div>
          <div className="space-y-4">
            {shipments.map((sh) => (
              <div key={sh.id} className="border-b border-[#EDF1F4] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {sh.id} · {sh.mode}
                  </div>
                  <StatusPill status={sh.status} />
                </div>
                <div className="mt-1 text-xs text-[#5E7284]">{sh.route}</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7ECF0]">
                    <div className="h-full bg-[#4FA8D8]" style={{ width: `${sh.progressPct}%` }} />
                  </div>
                  <span className="text-xs text-[#5E7284]" style={{ fontFamily: "var(--font-ac-mono)" }}>
                    {sh.etaLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="mb-4 text-sm font-semibold text-[#0B1E33]">Season Window</div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#5E7284]">Window opens</dt>
              <dd style={{ fontFamily: "var(--font-ac-mono)" }}>{expedition.windowOpen}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5E7284]">Window closes</dt>
              <dd style={{ fontFamily: "var(--font-ac-mono)" }}>{expedition.windowClose}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#5E7284]">Status</dt>
              <dd className="font-medium capitalize">{expedition.status}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-sm bg-[#F3F5F7] p-3 text-xs leading-relaxed text-[#5E7284]">
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
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D8E0E6] text-left text-[11px] uppercase tracking-wide text-[#5E7284]">
              <th className="px-5 py-3 font-medium">PO</th>
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Items</th>
              <th className="px-5 py-3 font-medium">Packing Deadline</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => {
              const vendor = vendorById(po.vendorId);
              return (
                <tr key={po.id} className="border-b border-[#EDF1F4] last:border-0">
                  <td className="px-5 py-3.5 font-medium" style={{ fontFamily: "var(--font-ac-mono)" }}>
                    {po.id}
                  </td>
                  <td className="px-5 py-3.5">{vendor?.name}</td>
                  <td className="px-5 py-3.5 text-[#2B3E4E]">{po.itemsSummary}</td>
                  <td className="px-5 py-3.5">
                    <span style={{ fontFamily: "var(--font-ac-mono)" }}>{po.packingDeadline}</span>
                    <span className="ml-2 text-xs text-[#5E7284]">
                      ({po.daysToPackingDeadline}d)
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={po.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <div className="mt-8 mb-4 text-sm font-semibold text-[#0B1E33]">Shipment Tracker</div>
      <div className="grid grid-cols-3 gap-4">
        {shipments.map((sh) => (
          <Panel key={sh.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{sh.mode}</div>
              <StatusPill status={sh.status} />
            </div>
            <div className="mt-2 text-xs text-[#5E7284]">{sh.id}</div>
            <p className="mt-3 text-sm text-[#2B3E4E]">{sh.currentLeg}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E7ECF0]">
              <div className="h-full bg-[#123A5C]" style={{ width: `${sh.progressPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[#5E7284]">
              <span>{sh.cargoItemCount} cargo items</span>
              <span style={{ fontFamily: "var(--font-ac-mono)" }}>{sh.etaLabel}</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 mb-4 text-sm font-semibold text-[#0B1E33]">Vendor Performance</div>
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D8E0E6] text-left text-[11px] uppercase tracking-wide text-[#5E7284]">
              <th className="px-5 py-3 font-medium">Vendor</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Performance</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b border-[#EDF1F4] last:border-0">
                <td className="px-5 py-3.5 font-medium">{v.name}</td>
                <td className="px-5 py-3.5 text-[#2B3E4E]">{v.category}</td>
                <td className="px-5 py-3.5 text-[#5E7284]">{v.location}</td>
                <td className="px-5 py-3.5">
                  <span style={{ fontFamily: "var(--font-ac-mono)" }}>{v.performanceScore}</span>
                  <span className="text-[#5E7284]">/100</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
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
            <div className="text-sm font-semibold text-[#0B1E33]">{s.name}</div>
            <span className="text-xs text-[#5E7284]">{s.code}</span>
          </div>
          <Panel>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D8E0E6] text-left text-[11px] uppercase tracking-wide text-[#5E7284]">
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Days Remaining</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory
                  .filter((i) => i.stationId === s.id)
                  .map((i) => (
                    <tr key={i.id} className="border-b border-[#EDF1F4] last:border-0">
                      <td className="px-5 py-3.5 font-medium">{i.name}</td>
                      <td className="px-5 py-3.5 text-[#2B3E4E]">{i.category}</td>
                      <td className="px-5 py-3.5" style={{ fontFamily: "var(--font-ac-mono)" }}>
                        {i.quantity.toLocaleString()} {i.unit}
                      </td>
                      <td className="px-5 py-3.5" style={{ fontFamily: "var(--font-ac-mono)" }}>
                        {i.daysRemaining}d{" "}
                        <span className="text-[#5E7284]">(reorder at {i.reorderThresholdDays}d)</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={i.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>
        </div>
      ))}
    </div>
  );
}

function Personnel() {
  return (
    <div>
      <SectionHeading eyebrow="Personnel & Safety Operations" title="Roster & Check-In Status" />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D8E0E6] text-left text-[11px] uppercase tracking-wide text-[#5E7284]">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Station</th>
              <th className="px-5 py-3 font-medium">Training</th>
              <th className="px-5 py-3 font-medium">Last Check-in</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map((p) => {
              const st = stationById(p.stationId);
              return (
                <tr key={p.id} className="border-b border-[#EDF1F4] last:border-0">
                  <td className="px-5 py-3.5 font-medium">{p.name}</td>
                  <td className="px-5 py-3.5 text-[#2B3E4E]">{p.role}</td>
                  <td className="px-5 py-3.5 text-[#5E7284]">{st?.name}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={p.trainingStatus === "complete" ? "ok" : p.trainingStatus} />
                  </td>
                  <td className="px-5 py-3.5 text-[#5E7284]" style={{ fontFamily: "var(--font-ac-mono)" }}>
                    {p.lastCheckin}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={p.checkinStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function AIActivity() {
  return (
    <div>
      <SectionHeading eyebrow="AI Command Layer" title="Autonomous Activity Feed" />
      <div className="space-y-4">
        {agentRuns.map((run) => (
          <Panel key={run.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-[#123A5C] text-[#4FA8D8]">
                  <Sparkles className="size-4" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-[#5E7284]">
                    {run.agentType} · {run.triggeredAt}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-[#0B1E33]">{run.title}</div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#2B3E4E]">{run.detail}</p>
                </div>
              </div>
              <StatusPill status={run.severity} />
            </div>
            {run.status === "pending_review" ? (
              <div className="mt-4 flex gap-2 border-t border-[#EDF1F4] pt-4">
                <button className="flex items-center gap-1.5 rounded-sm bg-[#0B1E33] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#123A5C]">
                  <CheckCircle2 className="size-3.5" /> Approve
                </button>
                <button className="rounded-sm border border-[#D8E0E6] px-3.5 py-1.5 text-xs font-medium text-[#2B3E4E] hover:bg-[#F3F5F7]">
                  Edit draft
                </button>
                <button className="rounded-sm px-3.5 py-1.5 text-xs font-medium text-[#5E7284] hover:bg-[#F3F5F7]">
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="mt-4 border-t border-[#EDF1F4] pt-3 text-xs font-medium text-[#0B6B3A]">
                Approved by Command Staff
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
