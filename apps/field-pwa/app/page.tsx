"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Compass, Boxes, Users, WifiOff, RefreshCw, LogOut, TriangleAlert, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { queueConsumptionLog, queueCheckin } from "@/lib/queue";

type Section = "home" | "stock" | "team";

export default function FieldHomePage() {
  const router = useRouter();
  const { loading, session, profile, personnelId, isOnline, pendingCount, lastSyncAt, signOut, triggerSync } =
    useAuth();
  const [section, setSection] = useState<Section>("home");

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  const inventory = useLiveQuery(() => db.inventory.orderBy("name").toArray(), []) ?? [];
  const personnel = useLiveQuery(() => db.personnel.toArray(), []) ?? [];
  const shipments = useLiveQuery(() => db.shipments.toArray(), []) ?? [];

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm font-bold text-foreground-subtle">Loading…</p>
      </div>
    );
  }

  const stationName = personnel.find((p) => p.id === personnelId)?.station_name ?? "your station";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-accent px-4 py-2.5 text-accent-foreground">
          <WifiOff className="size-4" strokeWidth={2.5} />
          <span className="text-xs font-extrabold uppercase tracking-wide">
            Offline — {pendingCount} {pendingCount === 1 ? "entry" : "entries"} queued to sync
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-b-4 border-black px-5 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground-subtle">
            {profile?.full_name} · {stationName}
          </div>
          <div className="mt-0.5 text-lg font-black text-foreground">
            {section === "home" && "Station Manifest"}
            {section === "stock" && "Inventory"}
            {section === "team" && "Team Check-Ins"}
          </div>
        </div>
        <button
          onClick={triggerSync}
          disabled={!isOnline}
          className="flex size-10 items-center justify-center rounded-xl border-4 border-black disabled:opacity-40"
          title={lastSyncAt ? `Last synced ${new Date(lastSyncAt).toLocaleTimeString()}` : "Not synced yet"}
        >
          <RefreshCw className="size-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {section === "home" && <HomeSection shipments={shipments} pendingCount={pendingCount} />}
        {section === "stock" && (
          <StockSection inventory={inventory} loggedBy={session.user.id} />
        )}
        {section === "team" && (
          <TeamSection personnel={personnel} selfPersonnelId={personnelId} />
        )}
      </div>

      <div className="px-5">
        <SosButton personnelId={personnelId} />
      </div>

      <nav className="grid grid-cols-4 border-t-4 border-black bg-card">
        <TabButton active={section === "home"} onClick={() => setSection("home")} icon={Compass} label="Home" />
        <TabButton active={section === "stock"} onClick={() => setSection("stock")} icon={Boxes} label="Stock" />
        <TabButton active={section === "team"} onClick={() => setSection("team")} icon={Users} label="Team" />
        <button onClick={signOut} className="flex flex-col items-center justify-center gap-1 py-3.5 text-foreground">
          <LogOut className="size-5" strokeWidth={2} />
          <span className="text-[10px] font-extrabold uppercase tracking-wide">Sign out</span>
        </button>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Compass;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-3.5 ${active ? "bg-black text-white" : "text-foreground"}`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-extrabold uppercase tracking-wide">{label}</span>
    </button>
  );
}

function HomeSection({
  shipments,
  pendingCount,
}: {
  shipments: { id: string; mode: string; route: string; status: string; current_leg: string | null }[];
  pendingCount: number;
}) {
  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-2xl border-4 border-accent bg-card p-4">
          <div className="text-sm font-black text-foreground">{pendingCount} entries queued</div>
          <p className="mt-1 text-xs font-semibold text-foreground-subtle">
            Will sync automatically once you&apos;re back online.
          </p>
        </div>
      )}
      <div className="text-lg font-black text-foreground">Inbound shipments</div>
      {shipments.length === 0 && <p className="text-sm font-semibold text-foreground-subtle">No shipments on file.</p>}
      {shipments.map((sh) => (
        <div key={sh.id} className="rounded-2xl border-4 border-black p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-black capitalize text-foreground">{sh.mode.replace("_", " ")}</span>
            <span className="rounded-md bg-black px-2.5 py-1 text-xs font-extrabold uppercase text-white">
              {sh.status}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground-subtle">{sh.current_leg ?? sh.route}</p>
        </div>
      ))}
    </div>
  );
}

function StockSection({
  inventory,
  loggedBy,
}: {
  inventory: { id: string; name: string; quantity: number; unit: string; consumption_rate_per_day: number; reorder_threshold_days: number }[];
  loggedBy: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [justLogged, setJustLogged] = useState<string | null>(null);

  async function submit(id: string) {
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) return;
    await queueConsumptionLog({ inventoryId: id, quantityUsed: quantity, loggedBy });
    setOpenId(null);
    setQty("");
    setJustLogged(id);
    setTimeout(() => setJustLogged(null), 2000);
  }

  return (
    <div className="space-y-4">
      {inventory.length === 0 && <p className="text-sm font-semibold text-foreground-subtle">No inventory cached yet.</p>}
      {inventory.map((item) => {
        const days = item.consumption_rate_per_day > 0 ? item.quantity / item.consumption_rate_per_day : Infinity;
        const flagged = days <= item.reorder_threshold_days;
        return (
          <div key={item.id} className="rounded-2xl border-4 border-black p-4">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
              <div>
                <div className="text-base font-black text-foreground">{item.name}</div>
                <div className="text-sm font-semibold text-foreground-subtle">
                  {item.quantity.toLocaleString()} {item.unit}
                </div>
              </div>
              {flagged && (
                <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-extrabold uppercase text-accent-foreground">
                  Low
                </span>
              )}
              {justLogged === item.id && (
                <span className="flex items-center gap-1 text-xs font-extrabold uppercase text-success">
                  <Check className="size-4" /> Logged
                </span>
              )}
            </button>

            {openId === item.id && (
              <div className="mt-3 flex gap-2 border-t-4 border-black pt-3">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={`Qty used (${item.unit})`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="flex-1 rounded-xl border-4 border-border-strong bg-background px-3 py-3 text-base font-bold text-foreground outline-none"
                />
                <button
                  onClick={() => submit(item.id)}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-extrabold uppercase text-white active:scale-[0.98]"
                >
                  Log
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamSection({
  personnel,
  selfPersonnelId,
}: {
  personnel: { id: string; full_name: string | null; role_title: string }[];
  selfPersonnelId: string | null;
}) {
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  async function checkInSelf() {
    if (!selfPersonnelId) return;
    await queueCheckin({ personnelId: selfPersonnelId, isSos: false });
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 2000);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={checkInSelf}
        disabled={!selfPersonnelId}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-5 text-base font-black uppercase tracking-wide text-white active:scale-[0.98] disabled:opacity-50"
      >
        {justCheckedIn ? (
          <>
            <Check className="size-5" /> Checked in
          </>
        ) : (
          "One-tap check in"
        )}
      </button>

      <div className="text-lg font-black text-foreground">Station roster</div>
      {personnel.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-2xl border-4 border-black p-4">
          <div>
            <div className="text-base font-black text-foreground">{p.full_name ?? "Unknown"}</div>
            <div className="text-xs font-bold uppercase text-foreground-subtle">{p.role_title}</div>
          </div>
          {p.id === selfPersonnelId && (
            <span className="rounded-md bg-black px-2.5 py-1 text-xs font-extrabold uppercase text-white">You</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SosButton({ personnelId }: { personnelId: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);

  async function trigger() {
    if (!personnelId) return;
    await queueCheckin({ personnelId, isSos: true, notes: "SOS triggered from Field App" });
    setConfirming(false);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  if (sent) {
    return (
      <div className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-5 text-lg font-black uppercase tracking-wide text-white">
        <Check className="size-6" /> SOS sent
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="mb-3 flex gap-2">
        <button
          onClick={trigger}
          className="flex-1 rounded-2xl bg-critical py-5 text-base font-black uppercase tracking-wide text-critical-foreground active:scale-[0.98]"
        >
          Confirm SOS
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-2xl border-4 border-black px-6 py-5 text-base font-black uppercase text-foreground active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={!personnelId}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-critical py-5 text-lg font-black uppercase tracking-wide text-critical-foreground active:scale-[0.98] disabled:opacity-50"
    >
      <TriangleAlert className="size-6" strokeWidth={2.5} />
      SOS — Emergency
    </button>
  );
}
