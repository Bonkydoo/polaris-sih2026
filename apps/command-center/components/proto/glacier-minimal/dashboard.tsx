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
  Snowflake,
  Check,
  X,
  Pencil,
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
  { id: "overview", label: "Overview", icon: Compass },
  { id: "cargo", label: "Cargo", icon: Ship },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "personnel", label: "Personnel", icon: Users },
  { id: "ai", label: "AI Feed", icon: Sparkles },
];

function tone(status: string) {
  switch (status) {
    case "critical":
    case "late":
    case "sos":
    case "overdue":
      return "bg-rose-100/80 text-rose-700";
    case "watch":
    case "at-risk":
    case "delayed":
      return "bg-amber-100/80 text-amber-700";
    default:
      return "bg-emerald-100/80 text-emerald-700";
  }
}

function Pill({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tone(status)}`}>
      {status.replace("-", " ")}
    </span>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/70 bg-white/60 shadow-[0_8px_30px_-12px_rgba(51,90,110,0.25)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default function GlacierMinimalDashboard() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div
      className="min-h-screen text-[#12303D]"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, #E9F4FA 0%, transparent 60%), radial-gradient(1000px 500px at 100% 0%, #F1F8F2 0%, transparent 55%), #F6FAFC",
      }}
    >
      <div className="sticky top-0 z-20 px-6 pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-[0_8px_30px_-15px_rgba(51,90,110,0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-teal-200 text-[#12303D]">
              <Snowflake className="size-4" strokeWidth={2} />
            </div>
            <span className="text-sm font-bold tracking-tight">POLARIS</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full bg-[#12303D]/[0.04] p-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-white text-[#12303D] shadow-sm" : "text-[#5C7A87] hover:text-[#12303D]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <Link
            href="/proto"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5C7A87] hover:text-[#12303D]"
          >
            <ArrowLeft className="size-3.5" /> All directions
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#5C7A87]">
              {expedition.seasonLabel}
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#12303D]">{expedition.name}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50/90 px-4 py-2.5 text-amber-800 ring-1 ring-amber-200">
            <span className="text-sm font-semibold">
              {expedition.daysToWindowClose} days to window close
            </span>
          </div>
        </div>

        {section === "overview" && <Overview />}
        {section === "cargo" && <Cargo />}
        {section === "inventory" && <Inventory />}
        {section === "personnel" && <Personnel />}
        {section === "ai" && <AIActivity />}
      </main>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight text-[#12303D]">{title}</h2>
      <p className="mt-1 text-sm text-[#5C7A87]">{sub}</p>
    </div>
  );
}

function Overview() {
  return (
    <div>
      <Heading title="Expedition overview" sub="A calm read across all three stations." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stations.map((s) => (
          <Glass key={s.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-[#5C7A87]">{s.region}</div>
                <div className="text-lg font-bold">{s.name}</div>
              </div>
              <Pill status={s.status} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#375160]">{s.summary}</p>
            <div className="mt-5">
              <div className="flex justify-between text-xs text-[#5C7A87]">
                <span>Personnel</span>
                <span>
                  {s.personnelOnStation}/{s.personnelCapacity}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#12303D]/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-300 to-teal-300"
                  style={{ width: `${(s.personnelOnStation / s.personnelCapacity) * 100}%` }}
                />
              </div>
            </div>
          </Glass>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Glass className="p-6 lg:col-span-2">
          <div className="mb-4 text-sm font-bold text-[#12303D]">In-transit shipments</div>
          <div className="space-y-5">
            {shipments.map((sh) => (
              <div key={sh.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {sh.mode} · {sh.id}
                  </span>
                  <Pill status={sh.status} />
                </div>
                <div className="mt-1 text-xs text-[#5C7A87]">{sh.route}</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#12303D]/[0.06]">
                  <div className="h-full rounded-full bg-sky-300" style={{ width: `${sh.progressPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Glass>
        <Glass className="p-6">
          <div className="mb-4 text-sm font-bold text-[#12303D]">Season window</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5C7A87]">Opens</span>
              <span className="font-semibold">{expedition.windowOpen}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C7A87]">Closes</span>
              <span className="font-semibold">{expedition.windowClose}</span>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

function Cargo() {
  return (
    <div>
      <Heading title="Cargo & freight" sub="Purchase orders tracked against the packing cutoff, not the ship date." />
      <div className="space-y-4">
        {purchaseOrders.map((po) => {
          const v = vendorById(po.vendorId);
          return (
            <Glass key={po.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <div className="text-sm font-bold">
                  {po.id} <span className="font-normal text-[#5C7A87]">· {v?.name}</span>
                </div>
                <div className="mt-1 text-sm text-[#375160]">{po.itemsSummary}</div>
                <div className="mt-1 text-xs text-[#5C7A87]">
                  Packing deadline {po.packingDeadline} ({po.daysToPackingDeadline}d)
                </div>
              </div>
              <Pill status={po.status} />
            </Glass>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {shipments.map((sh) => (
          <Glass key={sh.id} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{sh.mode}</span>
              <Pill status={sh.status} />
            </div>
            <p className="mt-2 text-xs text-[#5C7A87]">{sh.currentLeg}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#12303D]/[0.06]">
              <div className="h-full rounded-full bg-teal-300" style={{ width: `${sh.progressPct}%` }} />
            </div>
          </Glass>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {vendors.map((v) => (
          <Glass key={v.id} className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm font-semibold">{v.name}</div>
              <div className="text-xs text-[#5C7A87]">{v.category} · {v.location}</div>
            </div>
            <div className="text-lg font-bold text-[#12303D]">{v.performanceScore}</div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

function Inventory() {
  return (
    <div>
      <Heading title="Station inventory" sub="Consumption modelled against days remaining in the season." />
      {stations.map((s) => (
        <div key={s.id} className="mb-6">
          <div className="mb-3 text-sm font-bold text-[#12303D]">{s.name}</div>
          <Glass className="divide-y divide-white/60 p-2">
            {inventory
              .filter((i) => i.stationId === s.id)
              .map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <div className="text-sm font-semibold">{i.name}</div>
                    <div className="text-xs text-[#5C7A87]">
                      {i.category} · {i.quantity.toLocaleString()} {i.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#5C7A87]">{i.daysRemaining}d left</span>
                    <Pill status={i.status} />
                  </div>
                </div>
              ))}
          </Glass>
        </div>
      ))}
    </div>
  );
}

function Personnel() {
  return (
    <div>
      <Heading title="Personnel & safety" sub="Roster, training and check-in status across stations." />
      <Glass className="divide-y divide-white/60 p-2">
        {personnel.map((p) => {
          const st = stationById(p.stationId);
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-[#5C7A87]">
                  {p.role} · {st?.name} · {p.lastCheckin}
                </div>
              </div>
              <div className="flex gap-2">
                <Pill status={p.trainingStatus === "complete" ? "ok" : p.trainingStatus} />
                <Pill status={p.checkinStatus} />
              </div>
            </div>
          );
        })}
      </Glass>
    </div>
  );
}

function AIActivity() {
  return (
    <div>
      <Heading title="AI activity" sub="Autonomous drafts waiting on a human sign-off." />
      <div className="space-y-4">
        {agentRuns.map((run) => (
          <Glass key={run.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200 to-teal-200">
                  <Sparkles className="size-4 text-[#12303D]" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[#5C7A87]">
                    {run.agentType} · {run.triggeredAt}
                  </div>
                  <div className="mt-0.5 text-sm font-bold">{run.title}</div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#375160]">{run.detail}</p>
                </div>
              </div>
              <Pill status={run.severity} />
            </div>
            {run.status === "pending_review" && (
              <div className="mt-4 flex gap-2 border-t border-white/60 pt-4">
                <button className="flex items-center gap-1.5 rounded-full bg-[#12303D] px-4 py-1.5 text-xs font-semibold text-white">
                  <Check className="size-3.5" /> Approve
                </button>
                <button className="flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#12303D] ring-1 ring-[#12303D]/10">
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-[#5C7A87]">
                  <X className="size-3.5" /> Dismiss
                </button>
              </div>
            )}
          </Glass>
        ))}
      </div>
    </div>
  );
}
