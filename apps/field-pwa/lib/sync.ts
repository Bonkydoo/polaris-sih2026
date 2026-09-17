import { supabase } from "./supabase";
import { db, type OutboxItem } from "./db";

// Conflict resolution note (TRD NFR: "last-write-wins + audit trail"):
// consumption_logs and checkins are append-only tables (see the RLS
// migrations — there's no update policy for either, only insert). So
// there's no row for two offline writes to actually collide on; each
// queued entry becomes its own new row whenever it syncs, in whatever
// order that happens to be. inventory.quantity — the one place that
// really could go stale — is never written directly; it's decremented
// by a DB trigger reacting to each consumption_logs insert (see
// supabase/migrations/20260916150006_logistics_tables.sql), so
// out-of-order sync still lands on the correct total rather than one
// device's write clobbering another's. The audit trail is
// public.audit_log, populated by the same trigger that runs regardless
// of whether the insert came from a live request or a synced outbox item.

const MAX_ATTEMPTS = 5;

export async function syncOutbox(): Promise<{ synced: number; failed: number; remaining: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0, remaining: await db.outbox.count() };

  const items = await db.outbox.toArray();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    const result = await syncOne(item);
    if (result === "synced") {
      await db.outbox.delete(item.id);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed, remaining: await db.outbox.count() };
}

async function syncOne(item: OutboxItem): Promise<"synced" | "failed"> {
  try {
    const table = item.kind === "consumption_log" ? "consumption_logs" : "checkins";
    const { error } = await supabase.from(table).insert(item.payload as never);
    if (error) throw error;
    return "synced";
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const attempts = item.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.outbox.update(item.id, { status: "failed", lastError: message, attempts });
    } else {
      await db.outbox.update(item.id, { status: "pending", lastError: message, attempts });
    }
    return "failed";
  }
}
