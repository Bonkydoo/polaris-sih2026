import Dexie, { type EntityTable } from "dexie";
import type { Tables } from "@polaris/supabase-client";

// Local-first cache + write queue. Reads render from here, never
// directly from a live Supabase query — the whole point of "local-first"
// is that the UI doesn't know or care whether the last sync was 3
// seconds or 3 hours ago. Writes go here first too (see lib/sync.ts):
// an outbox row is the durable record of "the user did this," and it
// only gets deleted once Supabase has confirmed it.

export type OutboxKind = "consumption_log" | "checkin";

export type OutboxItem = {
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "failed";
  lastError?: string;
  attempts: number;
};

export type CachedInventoryItem = Tables<"inventory">;
export type CachedPersonnel = Tables<"personnel"> & {
  full_name: string | null;
  station_name: string | null;
};
export type CachedShipment = Tables<"shipments">;
export type MetaRow = { key: string; value: string };

class FieldDB extends Dexie {
  inventory!: EntityTable<CachedInventoryItem, "id">;
  personnel!: EntityTable<CachedPersonnel, "id">;
  shipments!: EntityTable<CachedShipment, "id">;
  outbox!: EntityTable<OutboxItem, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("polaris-field");
    this.version(1).stores({
      inventory: "id, station_id, name",
      personnel: "id, station_id",
      shipments: "id, destination_station_id",
      outbox: "id, status, createdAt",
      meta: "key",
    });
  }
}

export const db = new FieldDB();

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.meta.get(key))?.value;
}

export async function setMeta(key: string, value: string) {
  await db.meta.put({ key, value });
}
