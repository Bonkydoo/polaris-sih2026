// Regression test for the Field PWA's offline-first write path: queue in
// Dexie/IndexedDB while offline, then drain the outbox once back online.
// This is the automated complement to the manual airplane-mode test done
// in the browser during the Field PWA build phase (see README.md) — that
// confirmed the real UI behaves correctly with a real service worker and
// a real IndexedDB; this locks in the sync *algorithm* itself (retry
// counting, failure threshold, ordering) against regressions, using
// fake-indexeddb to give Dexie a working IndexedDB inside Node.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
vi.mock("./supabase", () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));

// Imported after the mock/polyfill are in place so Dexie sees fake-indexeddb
// and sync.ts sees the mocked supabase client.
const { db } = await import("./db");
const { syncOutbox } = await import("./sync");
const { queueConsumptionLog, queueCheckin } = await import("./queue");

function setOnline(online: boolean) {
  vi.stubGlobal("navigator", { onLine: online });
}

beforeEach(async () => {
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  await db.outbox.clear();
  await db.inventory.clear();
});

describe("queueConsumptionLog", () => {
  it("stays queued and does not touch the network while offline", async () => {
    setOnline(false);
    await db.inventory.put({ id: "inv-1", quantity: 10 } as never);

    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 3, loggedBy: "user-1" });

    expect(insertMock).not.toHaveBeenCalled();
    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].status).toBe("pending");
    expect(outbox[0].payload.recorded_offline).toBe(true);
  });

  it("optimistically decrements the local cached quantity immediately, even offline", async () => {
    setOnline(false);
    await db.inventory.put({ id: "inv-1", quantity: 10 } as never);

    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 3, loggedBy: "user-1" });

    const updated = await db.inventory.get("inv-1");
    expect(updated?.quantity).toBe(7);
  });

  it("never drops the cached quantity below zero", async () => {
    setOnline(false);
    await db.inventory.put({ id: "inv-1", quantity: 2 } as never);

    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 5, loggedBy: "user-1" });

    const updated = await db.inventory.get("inv-1");
    expect(updated?.quantity).toBe(0);
  });

  it("syncs immediately when online, clearing the outbox entry on success", async () => {
    setOnline(true);
    await db.inventory.put({ id: "inv-1", quantity: 10 } as never);

    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 3, loggedBy: "user-1" });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(await db.outbox.count()).toBe(0);
  });
});

describe("queueCheckin", () => {
  it("marks an offline SOS check-in as recorded_offline and queues it", async () => {
    setOnline(false);
    await queueCheckin({ personnelId: "p-1", isSos: true, notes: "test" });

    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].kind).toBe("checkin");
    expect(outbox[0].payload.is_sos).toBe(true);
    expect(outbox[0].payload.recorded_offline).toBe(true);
  });
});

describe("syncOutbox — reconnect draining (the airplane-mode-off scenario)", () => {
  it("does nothing and reports remaining items when still offline", async () => {
    setOnline(false);
    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 1, loggedBy: "user-1" });

    setOnline(false);
    const result = await syncOutbox();

    expect(result).toEqual({ synced: 0, failed: 0, remaining: 1 });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("drains every queued item once back online, in one pass", async () => {
    setOnline(false);
    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 1, loggedBy: "user-1" });
    await queueCheckin({ personnelId: "p-1", isSos: false });
    expect(await db.outbox.count()).toBe(2);

    setOnline(true);
    const result = await syncOutbox();

    expect(result).toEqual({ synced: 2, failed: 0, remaining: 0 });
    expect(await db.outbox.count()).toBe(0);
  });

  it("keeps a failed item pending and increments its attempt count below the retry ceiling", async () => {
    setOnline(false);
    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 1, loggedBy: "user-1" });

    setOnline(true);
    // supabase-js's PostgrestError extends Error (see
    // node_modules/@supabase/postgrest-js/src/PostgrestError.ts), so the
    // mock must too — a plain { message } object would misrepresent what
    // sync.ts's `err instanceof Error` check actually sees in production.
    insertMock.mockResolvedValue({ error: new Error("network blip") });
    const result = await syncOutbox();

    expect(result).toEqual({ synced: 0, failed: 1, remaining: 1 });
    const [item] = await db.outbox.toArray();
    expect(item.status).toBe("pending");
    expect(item.attempts).toBe(1);
    expect(item.lastError).toBe("network blip");
  });

  it("flips an item to failed status only once attempts reach the ceiling (5)", async () => {
    setOnline(false);
    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 1, loggedBy: "user-1" });

    setOnline(true);
    insertMock.mockResolvedValue({ error: new Error("still down") });
    for (let i = 0; i < 4; i++) {
      await syncOutbox();
    }
    let [item] = await db.outbox.toArray();
    expect(item.attempts).toBe(4);
    expect(item.status).toBe("pending");

    await syncOutbox();
    [item] = await db.outbox.toArray();
    expect(item.attempts).toBe(5);
    expect(item.status).toBe("failed");
  });

  it("recovers a previously-failed-attempt item once the network comes back", async () => {
    setOnline(false);
    await queueConsumptionLog({ inventoryId: "inv-1", quantityUsed: 1, loggedBy: "user-1" });

    setOnline(true);
    insertMock.mockResolvedValueOnce({ error: new Error("flaky") });
    await syncOutbox();
    const [item] = await db.outbox.toArray();
    expect(item.attempts).toBe(1);

    insertMock.mockResolvedValue({ error: null });
    const result = await syncOutbox();

    expect(result).toEqual({ synced: 1, failed: 0, remaining: 0 });
  });
});
