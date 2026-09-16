"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  WifiOff,
  Compass,
  Ship,
  Boxes,
  Users,
  Sparkles,
  TriangleAlert,
  Check,
  X,
} from "lucide-react";
import {
  expedition,
  stations,
  inventory,
  shipments,
  personnel,
  agentRuns,
  stationById,
} from "@/lib/mock-data";

type Section = "overview" | "cargo" | "inventory" | "personnel" | "ai";

const NAV: { id: Section; label: string; icon: typeof Compass }[] = [
  { id: "overview", label: "Home", icon: Compass },
  { id: "cargo", label: "Cargo", icon: Ship },
  { id: "inventory", label: "Stock", icon: Boxes },
  { id: "personnel", label: "Team", icon: Users },
  { id: "ai", label: "Alerts", icon: Sparkles },
];

function tone(status: string) {
  switch (status) {
    case "critical":
    case "late":
    case "sos":
    case "overdue":
      return { bg: "bg-[#FF4433]", text: "text-white" };
    case "watch":
    case "at-risk":
    case "delayed":
      return { bg: "bg-[#FF6A00]", text: "text-white" };
    default:
      return { bg: "bg-[#1FA24A]", text: "text-white" };
  }
}

function Tag({ status }: { status: string }) {
  const t = tone(status);
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${t.bg} ${t.text}`}>
      {status.replace("-", " ")}
    </span>
  );
}

export default function FieldFirstDashboard() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-10">
      <div className="mx-auto mb-6 flex max-w-[420px] items-center justify-between px-1">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white">
          <ArrowLeft className="size-4" /> All directions
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">
          Field App preview
        </span>
      </div>

      {/* Phone frame */}
      <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[2.5rem] border-[10px] border-black bg-black shadow-2xl">
        <div className="flex h-[820px] flex-col bg-white">
          {/* Offline banner */}
          <div className="flex items-center gap-2 bg-[#FF6A00] px-4 py-2.5 text-white">
            <WifiOff className="size-4" strokeWidth={2.5} />
            <span className="text-xs font-extrabold uppercase tracking-wide">
              Offline — 3 entries queued to sync
            </span>
          </div>

          {/* Top bar */}
          <div className="border-b-4 border-black px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-black/50">
              {expedition.id} · Bharati Station
            </div>
            <div className="mt-0.5 text-xl font-black text-black">
              {expedition.daysToWindowClose} days to resupply window close
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {section === "overview" && <Overview />}
            {section === "cargo" && <Cargo />}
            {section === "inventory" && <Inventory />}
            {section === "personnel" && <Personnel />}
            {section === "ai" && <AIActivity />}
          </div>

          {/* SOS floating button */}
          <div className="px-5">
            <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF4433] py-5 text-lg font-black uppercase tracking-wide text-white active:scale-[0.98]">
              <TriangleAlert className="size-6" strokeWidth={2.5} />
              SOS — Emergency
            </button>
          </div>

          {/* Bottom tab bar */}
          <nav className="grid grid-cols-5 border-t-4 border-black bg-white">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-3.5 ${
                    active ? "bg-black text-white" : "text-black"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-2xl font-black text-black">{children}</h2>;
}

function Overview() {
  return (
    <div>
      <H>Stations</H>
      <div className="space-y-4">
        {stations.map((s) => {
          const t = tone(s.status);
          return (
            <div key={s.id} className="rounded-2xl border-4 border-black p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-black">{s.name}</span>
                <Tag status={s.status} />
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-black/70">{s.summary}</p>
              <div className={`mt-3 h-3 w-full rounded-full ${t.bg}`} style={{ opacity: 0.25 }}>
                <div
                  className={`h-3 rounded-full ${t.bg}`}
                  style={{ width: `${(s.personnelOnStation / s.personnelCapacity) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs font-bold text-black/50">
                {s.personnelOnStation}/{s.personnelCapacity} on station
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cargo() {
  return (
    <div>
      <H>Shipments</H>
      <div className="space-y-4">
        {shipments.map((sh) => (
          <div key={sh.id} className="rounded-2xl border-4 border-black p-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-black">{sh.mode}</span>
              <Tag status={sh.status} />
            </div>
            <p className="mt-2 text-sm font-semibold text-black/70">{sh.currentLeg}</p>
            <div className="mt-2 text-sm font-bold text-black">{sh.etaLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Inventory() {
  const flagged = inventory.filter((i) => i.status !== "ok");
  return (
    <div>
      <H>Needs attention</H>
      <div className="space-y-4">
        {flagged.map((i) => {
          const st = stationById(i.stationId);
          return (
            <div key={i.id} className="rounded-2xl border-4 border-black p-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-black">{i.name}</span>
                <Tag status={i.status} />
              </div>
              <div className="mt-1 text-sm font-bold text-black/60">{st?.name}</div>
              <div className="mt-2 text-lg font-black text-black">{i.daysRemaining} days left</div>
            </div>
          );
        })}
        <button className="w-full rounded-2xl bg-black py-5 text-base font-black uppercase tracking-wide text-white active:scale-[0.98]">
          + Log consumption
        </button>
      </div>
    </div>
  );
}

function Personnel() {
  return (
    <div>
      <H>Check-ins</H>
      <div className="space-y-4">
        {personnel.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl border-4 border-black p-4">
            <div>
              <div className="text-base font-black text-black">{p.name}</div>
              <div className="text-xs font-bold text-black/50">{p.lastCheckin}</div>
            </div>
            <Tag status={p.checkinStatus} />
          </div>
        ))}
        <button className="w-full rounded-2xl bg-[#1FA24A] py-5 text-base font-black uppercase tracking-wide text-white active:scale-[0.98]">
          One-tap check in
        </button>
      </div>
    </div>
  );
}

function AIActivity() {
  return (
    <div>
      <H>Alerts for you</H>
      <div className="space-y-4">
        {agentRuns
          .filter((r) => r.status === "pending_review")
          .map((run) => (
            <div key={run.id} className="rounded-2xl border-4 border-black p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-black/50">{run.agentType}</span>
                <Tag status={run.severity} />
              </div>
              <div className="mt-1 text-base font-black leading-snug text-black">{run.title}</div>
              <div className="mt-3 flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-black py-3.5 text-xs font-extrabold uppercase text-white active:scale-[0.98]">
                  <Check className="size-4" /> Approve
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-4 border-black py-3.5 text-xs font-extrabold uppercase text-black active:scale-[0.98]">
                  <X className="size-4" /> Dismiss
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
