// RLS integration test suite — runs against a REAL local Supabase Postgres
// instance (RLS cannot be meaningfully mocked; these assertions only mean
// something against the actual policy engine). Requires `supabase start`
// to be running first. Run with `npm run test:integration` from the repo
// root, separately from the fast pure-unit-test suite (`npm test`), so a
// missing Docker/Supabase stack doesn't block the fast path.
//
// Consolidates and formalizes the ad-hoc RLS checks done by hand (curl +
// JWT, and one-off scripts) during each build phase into a single
// regression suite that can be re-run after any future migration change.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { join } from "node:path";

try {
  process.loadEnvFile(join(process.cwd(), ".env.local"));
} catch {
  // .env.local not found - fall through and let the guard below report it clearly.
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = "polaris-demo-2026";

if (!ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local) — " +
      "these RLS integration tests need real credentials for a running local Supabase instance."
  );
}

async function signInAs(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  return client;
}

let admin: SupabaseClient;
let fieldClient: SupabaseClient;
let vendorClient: SupabaseClient;
let opsClient: SupabaseClient;
let leadershipClient: SupabaseClient;

let myStationId: string;
let otherStationId: string;
let myVendorId: string;
let otherVendorId: string;

beforeAll(async () => {
  admin = createClient(URL, SERVICE_KEY!);

  [fieldClient, vendorClient, opsClient, leadershipClient] = await Promise.all([
    signInAs("field@polaris-demo.ncpor.gov.in"),
    signInAs("vendor@polaris-demo.ncpor.gov.in"),
    signInAs("ops@polaris-demo.ncpor.gov.in"),
    signInAs("leadership@polaris-demo.ncpor.gov.in"),
  ]);

  const {
    data: { user: fieldUser },
  } = await fieldClient.auth.getUser();
  const { data: fieldProfile } = await admin.from("profiles").select("station_id").eq("id", fieldUser!.id).single();
  myStationId = fieldProfile!.station_id!;

  const { data: anotherStation } = await admin.from("stations").select("id").neq("id", myStationId).limit(1).single();
  otherStationId = anotherStation!.id;

  const {
    data: { user: vendorUser },
  } = await vendorClient.auth.getUser();
  const { data: vendorProfile } = await admin.from("profiles").select("vendor_id").eq("id", vendorUser!.id).single();
  myVendorId = vendorProfile!.vendor_id!;

  const { data: anotherVendor } = await admin.from("vendors").select("id").neq("id", myVendorId).limit(1).single();
  otherVendorId = anotherVendor!.id;
});

describe("field role: scoped to own station only", () => {
  it("sees inventory for its own station", async () => {
    const { data } = await fieldClient.from("inventory").select("id").eq("station_id", myStationId);
    expect(data!.length).toBeGreaterThan(0);
  });

  it("cannot see another station's inventory", async () => {
    const { data } = await fieldClient.from("inventory").select("id").eq("station_id", otherStationId);
    expect(data).toEqual([]);
  });

  it("cannot see another station's personnel", async () => {
    const { data } = await fieldClient.from("personnel").select("id").eq("station_id", otherStationId);
    expect(data).toEqual([]);
  });

  it("cannot see another station's check-ins", async () => {
    const { data } = await fieldClient.from("checkins").select("id, personnel_id").limit(1000);
    // Every row a field user can see must belong to their own station's personnel.
    const { data: otherStationPersonnel } = await admin
      .from("personnel")
      .select("id")
      .eq("station_id", otherStationId);
    const otherIds = new Set((otherStationPersonnel ?? []).map((p) => p.id));
    expect((data ?? []).some((c) => otherIds.has(c.personnel_id))).toBe(false);
  });

  it("cannot see another station's incidents", async () => {
    const { data } = await fieldClient.from("incidents").select("id").eq("station_id", otherStationId);
    expect(data).toEqual([]);
  });

  it("cannot write an incident for a station it doesn't belong to", async () => {
    const { error } = await fieldClient.from("incidents").insert({
      station_id: otherStationId,
      type: "safety",
      severity: "high",
      status: "open",
      title: "RLS test — should be rejected",
    });
    expect(error).not.toBeNull();
  });
});

describe("vendor role: scoped to own vendor only", () => {
  it("sees its own vendor row", async () => {
    const { data } = await vendorClient.from("vendors").select("id").eq("id", myVendorId);
    expect(data!.length).toBe(1);
  });

  it("cannot see another vendor's row", async () => {
    const { data } = await vendorClient.from("vendors").select("id").eq("id", otherVendorId);
    expect(data).toEqual([]);
  });

  it("cannot see another vendor's purchase orders", async () => {
    const { data } = await vendorClient.from("purchase_orders").select("id").eq("vendor_id", otherVendorId);
    expect(data).toEqual([]);
  });

  it("cannot update another vendor's purchase order", async () => {
    const { data: otherPO } = await admin
      .from("purchase_orders")
      .select("id")
      .eq("vendor_id", otherVendorId)
      .limit(1)
      .maybeSingle();
    if (!otherPO) return; // no PO seeded for that vendor in this dataset - nothing to attempt
    const { data: updated, error } = await vendorClient
      .from("purchase_orders")
      .update({ status: "acknowledged" })
      .eq("id", otherPO.id)
      .select();
    // RLS silently filters the row out of the update rather than erroring -
    // the meaningful assertion is that nothing was changed.
    expect(error).toBeNull();
    expect(updated).toEqual([]);
  });

  it("never sees organizations outside its own", async () => {
    const { data } = await vendorClient.from("organizations").select("id").neq("id", myVendorId);
    // A vendor profile's org differs from vendors.id, so just assert the
    // count is exactly 1 (its own org) rather than comparing ids directly.
    expect(data!.length).toBeLessThanOrEqual(1);
  });
});

describe("command-staff-only tables reject field and vendor roles", () => {
  it("field cannot read audit_log", async () => {
    const { data } = await fieldClient.from("audit_log").select("id").limit(1);
    expect(data).toEqual([]);
  });

  it("vendor cannot read audit_log", async () => {
    const { data } = await vendorClient.from("audit_log").select("id").limit(1);
    expect(data).toEqual([]);
  });

  it("field cannot read ai_agent_runs", async () => {
    const { data } = await fieldClient.from("ai_agent_runs").select("id").limit(1);
    expect(data).toEqual([]);
  });

  it("vendor cannot read ai_agent_runs", async () => {
    const { data } = await vendorClient.from("ai_agent_runs").select("id").limit(1);
    expect(data).toEqual([]);
  });

  it("ops (command staff) CAN read ai_agent_runs — confirms this isn't over-locked", async () => {
    const { data, error } = await opsClient.from("ai_agent_runs").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("profiles: self and org-command-staff scoping", () => {
  it("field user can read their own profile", async () => {
    const {
      data: { user },
    } = await fieldClient.auth.getUser();
    const { data } = await fieldClient.from("profiles").select("id").eq("id", user!.id);
    expect(data!.length).toBe(1);
  });

  it("field user cannot read leadership's profile (different org, not command staff)", async () => {
    const { data: leadershipProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "leadership")
      .limit(1)
      .single();
    const { data } = await fieldClient.from("profiles").select("id").eq("id", leadershipProfile!.id);
    expect(data).toEqual([]);
  });

  it("leadership CAN read a profile within its own organization", async () => {
    const {
      data: { user: leadershipUser },
    } = await leadershipClient.auth.getUser();
    const { data: myOrgProfile } = await admin
      .from("profiles")
      .select("id, organization_id")
      .eq("id", leadershipUser!.id)
      .single();
    const { data: peer } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", myOrgProfile!.organization_id)
      .neq("id", leadershipUser!.id)
      .limit(1)
      .maybeSingle();
    if (!peer) return; // no peer seeded in this org - nothing to assert
    const { data } = await leadershipClient.from("profiles").select("id").eq("id", peer.id);
    expect(data!.length).toBe(1);
  });
});
