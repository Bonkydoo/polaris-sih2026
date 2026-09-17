# POLARIS Field

Offline-first PWA for expedition personnel — station manifest, inventory,
consumption logging, and one-tap check-in/SOS. See TRD NFR "Offline
resilience": this is the one requirement in the whole system treated as a
first-class architectural constraint, not an add-on.

## Why this app is structured differently from command-center

`next.config.ts` sets `output: "export"` — a fully static build, no
server at all. Every other app in this monorepo is SSR-first; this one
can't be, because the whole point is that the app shell (including the
login screen) has to load from the service worker cache with zero
network. That rules out Server Components fetching data, Route Handlers,
and Middleware. Auth uses plain `@supabase/supabase-js` with default
localStorage session persistence (not `@polaris/supabase-client`'s
SSR-oriented cookie-based client) for the same reason — there's no server
half for a cookie to sync with here.

## The three pieces of the offline story

1. **`public/sw.js`** — hand-rolled service worker, no Workbox/next-pwa.
   Runtime caching (cache-as-you-go), not a build-time precache list,
   because Next's static export hashes every asset filename per build and
   a hand-rolled SW has no build step to generate a matching manifest
   from. Supabase API calls are never intercepted here — see below.
2. **`lib/db.ts`** — Dexie (IndexedDB) local-first cache + write queue.
   Reads render from here, never from a live Supabase query. `lib/refresh.ts`
   repopulates the cache from Supabase when online.
3. **`lib/queue.ts` + `lib/sync.ts`** — every write (consumption log,
   check-in) lands in the `outbox` table first, with an optimistic local
   update so the UI reflects it immediately. `syncOutbox()` drains it
   against real Supabase inserts on reconnect (an `online` event listener
   in `lib/auth.tsx`) and on a 60s poll (the practical substitute for the
   Background Sync API, which Safari doesn't implement).

**Conflict resolution** (TRD NFR: "last-write-wins + audit trail"):
`consumption_logs` and `checkins` are append-only tables — there's no
update policy for either in the RLS migrations, only insert. So there's
no row for two offline writes to actually collide on; each queued entry
becomes its own new row whenever it syncs. `inventory.quantity` — the one
value that could go stale — is never written directly; it's decremented
by a DB trigger reacting to each `consumption_logs` insert, so
out-of-order sync still lands on the correct total. The audit trail is
`public.audit_log`, populated by the same trigger regardless of whether
the insert came from a live request or a synced outbox item.

## Testing the airplane-mode scenario

There's no browser API to flip real Wi-Fi off from a test script, so the
verified approach was: override `navigator.onLine`, monkey-patch
`window.fetch` to reject requests to the Supabase origin, and dispatch a
real `offline` event — then do the reverse to reconnect. This exercises
the actual code paths (the `online`/`offline` listeners, `syncOutbox()`,
the optimistic UI update) rather than a separate offline-only code path
that might not match what really runs. See the session notes for the
verified run: a consumption log and a check-in queued while "offline",
confirmed durable in IndexedDB, then synced to real Supabase rows
(`recorded_offline: true` on both) within ~2s of the simulated
reconnect, with the server-side inventory trigger correctly decrementing
stock.

## Local development

```bash
npm run dev --workspace field-pwa       # dev server, hot reload
npm run build --workspace field-pwa     # static export to apps/field-pwa/out
npx serve -s apps/field-pwa/out         # serve the real production build —
                                         # test PWA/service-worker behavior
                                         # against this, not `next dev`
```
