import { db, type OutboxItem } from "./db";
import { syncOutbox } from "./sync";

// The write path every field action goes through, online or off: land
// in the outbox first, optimistically update the local cache so the UI
// reflects it immediately, then try to sync right away if there's a
// connection. If there isn't, the row just sits in the outbox until the
// next online event or the 60s background poll picks it up — see
// lib/auth.tsx.

export async function queueConsumptionLog(params: { inventoryId: string; quantityUsed: number; loggedBy: string }) {
  const recordedOffline = !navigator.onLine;
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    kind: "consumption_log",
    payload: {
      inventory_id: params.inventoryId,
      quantity_used: params.quantityUsed,
      logged_by: params.loggedBy,
      logged_at: new Date().toISOString(),
      recorded_offline: recordedOffline,
    },
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };
  await db.outbox.add(item);

  const current = await db.inventory.get(params.inventoryId);
  if (current) {
    await db.inventory.update(params.inventoryId, {
      quantity: Math.max(0, current.quantity - params.quantityUsed),
    });
  }

  if (navigator.onLine) await syncOutbox();
}

export async function queueCheckin(params: { personnelId: string; isSos: boolean; notes?: string }) {
  const recordedOffline = !navigator.onLine;
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    kind: "checkin",
    payload: {
      personnel_id: params.personnelId,
      is_sos: params.isSos,
      notes: params.notes ?? null,
      checkin_at: new Date().toISOString(),
      recorded_offline: recordedOffline,
    },
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };
  await db.outbox.add(item);

  if (navigator.onLine) await syncOutbox();
}
