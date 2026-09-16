// Seeds a demo dataset: NCPOR + Ministry + 5 vendor organizations, one
// demo auth user per role (admin/ops/field/vendor/leadership), the three
// real stations, expedition 46-ISEA, inventory, POs/requisitions,
// shipments, and a few AI agent runs so the Command Center demo isn't
// staring at an empty screen.
//
// Run with: npx tsx supabase/seed.ts
// Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and
// SUPABASE_SERVICE_ROLE_KEY in the environment — see .env.example.
// Idempotent-ish: re-running will error on unique constraints (station
// codes, vendor org names) rather than silently duplicating data. For a
// clean slate, `supabase db reset` (local) first.

import { createSupabaseServiceRoleClient, type TablesInsert } from "@polaris/supabase-client";

const supabase = createSupabaseServiceRoleClient();

const DEMO_PASSWORD = "polaris-demo-2026";

async function main() {
  console.log("Seeding POLARIS demo data...");

  // ---- Organizations -------------------------------------------------
  const { data: ncporOrg, error: ncporErr } = await supabase
    .from("organizations")
    .insert({ name: "National Centre for Polar and Ocean Research", type: "ncpor" })
    .select()
    .single();
  if (ncporErr) throw ncporErr;

  const { data: ministryOrg, error: ministryErr } = await supabase
    .from("organizations")
    .insert({ name: "Ministry of Earth Sciences", type: "ministry" })
    .select()
    .single();
  if (ministryErr) throw ministryErr;

  const vendorDefs = [
    { name: "Antarctic Fuel Logistics Pvt Ltd", category: "Fuel & POL", location: "Cape Town, ZA", performance_score: 91 },
    { name: "Southern Ocean Provisions Co.", category: "Food & Provisions", location: "Cape Town, ZA", performance_score: 87 },
    { name: "Polarquip Spares & Instruments", category: "Spares & Instruments", location: "Goa, IN", performance_score: 74 },
    { name: "Meditrans Cold Chain", category: "Medical Supplies", location: "Goa, IN", performance_score: 96 },
    { name: "Ny-Ålesund Arctic Supply AS", category: "General Provisions", location: "Longyearbyen, NO", performance_score: 82 },
  ] as const;

  const vendorOrgIds: Record<string, string> = {};
  for (const v of vendorDefs) {
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({ name: v.name, type: "vendor" })
      .select()
      .single();
    if (error) throw error;
    vendorOrgIds[v.name] = org.id;
  }

  // ---- Stations --------------------------------------------------------
  const stationDefs = [
    {
      code: "BRT",
      name: "Bharati",
      region: "antarctica" as const,
      station_type: "Year-round research station",
      coordinates: "SRID=4326;POINT(76.2 -69.4)",
      personnel_capacity: 30,
    },
    {
      code: "MTR",
      name: "Maitri",
      region: "antarctica" as const,
      station_type: "Year-round research station",
      coordinates: "SRID=4326;POINT(11.7 -70.8)",
      personnel_capacity: 25,
    },
    {
      code: "HMD",
      name: "Himadri",
      region: "arctic" as const,
      station_type: "Seasonal research station, Ny-Ålesund",
      coordinates: "SRID=4326;POINT(11.9 78.9)",
      personnel_capacity: 15,
    },
  ];

  const stationIds: Record<string, string> = {};
  for (const s of stationDefs) {
    const { data, error } = await supabase
      .from("stations")
      .insert({ ...s, organization_id: ncporOrg.id })
      .select()
      .single();
    if (error) throw error;
    stationIds[s.code] = data.id;
  }

  // ---- Vendors (business records, distinct from their organization row) --
  const vendorIds: Record<string, string> = {};
  for (const v of vendorDefs) {
    const { data, error } = await supabase
      .from("vendors")
      .insert({
        organization_id: vendorOrgIds[v.name],
        name: v.name,
        category: v.category,
        location: v.location,
        performance_score: v.performance_score,
      })
      .select()
      .single();
    if (error) throw error;
    vendorIds[v.name] = data.id;
  }

  // ---- Demo auth users + profiles --------------------------------------
  const demoUsers = [
    { email: "admin@polaris-demo.ncpor.gov.in", full_name: "Ananya Rao", role: "admin" as const, org: ncporOrg.id },
    { email: "ops@polaris-demo.ncpor.gov.in", full_name: "Vikram Sehgal", role: "ops" as const, org: ncporOrg.id },
    {
      email: "field@polaris-demo.ncpor.gov.in",
      full_name: "Priya Nair",
      role: "field" as const,
      org: ncporOrg.id,
      station_id: stationIds.BRT,
    },
    {
      email: "vendor@polaris-demo.ncpor.gov.in",
      full_name: "Rahul Mehta",
      role: "vendor" as const,
      org: vendorOrgIds["Antarctic Fuel Logistics Pvt Ltd"],
      vendor_id: vendorIds["Antarctic Fuel Logistics Pvt Ltd"],
    },
    { email: "leadership@polaris-demo.ncpor.gov.in", full_name: "Dr. S. Krishnan", role: "leadership" as const, org: ministryOrg.id },
  ];

  const profileIds: Record<string, string> = {};
  for (const u of demoUsers) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (createErr) throw createErr;

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: created.user.id,
      organization_id: u.org,
      role: u.role,
      full_name: u.full_name,
      station_id: "station_id" in u ? u.station_id : null,
      vendor_id: "vendor_id" in u ? u.vendor_id : null,
    });
    if (profileErr) throw profileErr;
    profileIds[u.role] = created.user.id;
  }

  // ---- Expedition --------------------------------------------------------
  const { data: expedition, error: expErr } = await supabase
    .from("expeditions")
    .insert({
      organization_id: ncporOrg.id,
      code: "46-ISEA",
      name: "46th Indian Scientific Expedition to Antarctica",
      season_label: "2026–27 Season",
      window_open: "2026-12-05",
      window_close: "2027-02-18",
      status: "active",
      vessel: "MV Vasiliy Golovnin (charter) + IL-76 air charter",
    })
    .select()
    .single();
  if (expErr) throw expErr;

  for (const code of ["BRT", "MTR", "HMD"]) {
    const { error } = await supabase
      .from("expedition_stations")
      .insert({ expedition_id: expedition.id, station_id: stationIds[code] });
    if (error) throw error;
  }

  // ---- Field profile's personnel record (needed for checkins/PRs later) --
  const { data: fieldPersonnel, error: fieldPersonnelErr } = await supabase
    .from("personnel")
    .insert({
      expedition_id: expedition.id,
      user_id: profileIds.field,
      station_id: stationIds.BRT,
      role_title: "Glaciologist",
      training_status: "complete",
      quarantine_status: "cleared",
      batch_label: "Batch 2",
    })
    .select()
    .single();
  if (fieldPersonnelErr) throw fieldPersonnelErr;

  // ---- Inventory ---------------------------------------------------------
  const inventoryDefs = [
    { station: "BRT", name: "Diesel (Station Genset)", category: "fuel", quantity: 18400, unit: "L", consumption_rate_per_day: 420, reorder_threshold_days: 60 },
    { station: "BRT", name: "Aviation Turbine Fuel", category: "fuel", quantity: 6200, unit: "L", consumption_rate_per_day: 180, reorder_threshold_days: 45 },
    { station: "BRT", name: "Frozen Protein Stores", category: "food", quantity: 890, unit: "kg", consumption_rate_per_day: 6.2, reorder_threshold_days: 90 },
    { station: "BRT", name: "Snowmobile Drive Belts", category: "spares", quantity: 4, unit: "units", consumption_rate_per_day: 0.03, reorder_threshold_days: 120 },
    { station: "BRT", name: "Trauma & Med Kit Refills", category: "medical", quantity: 27, unit: "kits", consumption_rate_per_day: 0.15, reorder_threshold_days: 90 },
    { station: "MTR", name: "Diesel (Station Genset)", category: "fuel", quantity: 21100, unit: "L", consumption_rate_per_day: 360, reorder_threshold_days: 60 },
    { station: "MTR", name: "Dry & Canned Provisions", category: "food", quantity: 3400, unit: "kg", consumption_rate_per_day: 18, reorder_threshold_days: 90 },
    { station: "MTR", name: "Weather Balloon Consumables", category: "instruments", quantity: 62, unit: "units", consumption_rate_per_day: 1.1, reorder_threshold_days: 45 },
    { station: "MTR", name: "Crevasse Rescue Kits", category: "spares", quantity: 8, unit: "kits", consumption_rate_per_day: 0.02, reorder_threshold_days: 90 },
    { station: "MTR", name: "Antibiotics (Cold Chain)", category: "medical", quantity: 140, unit: "doses", consumption_rate_per_day: 1.4, reorder_threshold_days: 60 },
    { station: "HMD", name: "Diesel (Station Genset)", category: "fuel", quantity: 9800, unit: "L", consumption_rate_per_day: 140, reorder_threshold_days: 60 },
    { station: "HMD", name: "Polar Bear Deterrent Kits", category: "spares", quantity: 5, unit: "kits", consumption_rate_per_day: 0.01, reorder_threshold_days: 120 },
    { station: "HMD", name: "Sample Cryo-Storage Media", category: "instruments", quantity: 210, unit: "vials", consumption_rate_per_day: 3.8, reorder_threshold_days: 45 },
    { station: "HMD", name: "Fresh Water Filtration Cartridges", category: "spares", quantity: 11, unit: "units", consumption_rate_per_day: 0.09, reorder_threshold_days: 90 },
    { station: "HMD", name: "Emergency Ration Packs", category: "food", quantity: 340, unit: "packs", consumption_rate_per_day: 2.1, reorder_threshold_days: 90 },
  ] as const;

  const inventoryIds: Record<string, string> = {};
  for (const item of inventoryDefs) {
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        station_id: stationIds[item.station],
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        consumption_rate_per_day: item.consumption_rate_per_day,
        reorder_threshold_days: item.reorder_threshold_days,
      })
      .select()
      .single();
    if (error) throw error;
    inventoryIds[`${item.station}:${item.name}`] = data.id;
  }

  // ---- Purchase requisitions + orders -------------------------------------
  const poDefs = [
    { vendor: "Antarctic Fuel Logistics Pvt Ltd", items_summary: "Aviation turbine fuel, 4,000L", packing_deadline: "2026-09-22", committed_delivery_date: null, status: "at-risk" },
    { vendor: "Polarquip Spares & Instruments", items_summary: "Snowmobile drive belts, spares kit", packing_deadline: "2026-09-25", committed_delivery_date: "2026-09-27", status: "late" },
    { vendor: "Southern Ocean Provisions Co.", items_summary: "Frozen protein stores, 600kg", packing_deadline: "2026-09-30", committed_delivery_date: "2026-09-26", status: "on-track" },
    { vendor: "Meditrans Cold Chain", items_summary: "Cold-chain antibiotics, trauma refills", packing_deadline: "2026-09-28", committed_delivery_date: "2026-09-20", status: "on-track" },
    { vendor: "Ny-Ålesund Arctic Supply AS", items_summary: "Himadri general provisions restock", packing_deadline: "2026-10-12", committed_delivery_date: "2026-10-05", status: "delivered" },
  ] as const;

  for (const po of poDefs) {
    const { data: requisition, error: prErr } = await supabase
      .from("purchase_requisitions")
      .insert({
        expedition_id: expedition.id,
        station_id: stationIds.BRT,
        requested_by: profileIds.ops,
        items: [{ name: po.items_summary, category: "fuel", quantity: 1, unit: "lot" }],
        status: "converted_to_po",
        packing_deadline: po.packing_deadline,
      })
      .select()
      .single();
    if (prErr) throw prErr;

    const { error: poErr } = await supabase.from("purchase_orders").insert({
      requisition_id: requisition.id,
      vendor_id: vendorIds[po.vendor],
      items_summary: po.items_summary,
      packing_deadline: po.packing_deadline,
      committed_delivery_date: po.committed_delivery_date,
      status: po.status,
    });
    if (poErr) throw poErr;
  }

  // ---- Shipments -----------------------------------------------------------
  const shipmentDefs = [
    { mode: "sea_vessel", route: "Cape Town → Bharati → Maitri → Cape Town", current_leg: "Southern Ocean, approaching Bharati", eta: "2026-09-20T00:00:00Z", progress_pct: 62, status: "in-transit", destination: "BRT" },
    { mode: "air_charter", route: "Goa → Cape Town → Bharati (IL-76)", current_leg: "Awaiting fuel-stop weather clearance, Cape Town", eta: "2026-09-25T00:00:00Z", progress_pct: 38, status: "delayed", destination: "BRT" },
    { mode: "helicopter", route: "Vessel-based shuttle → Maitri", current_leg: "Standing by, weather window pending", eta: null, progress_pct: 0, status: "scheduled", destination: "MTR" },
  ] as const;

  for (const sh of shipmentDefs) {
    const { error } = await supabase.from("shipments").insert({
      expedition_id: expedition.id,
      destination_station_id: stationIds[sh.destination],
      mode: sh.mode,
      route: sh.route,
      current_leg: sh.current_leg,
      eta: sh.eta,
      progress_pct: sh.progress_pct,
      status: sh.status,
    });
    if (error) throw error;
  }

  // ---- Sample AI agent runs (so the AI Activity feed isn't empty) ---------
  const agentRunDefs: TablesInsert<"ai_agent_runs">[] = [
    {
      agent_type: "reorder_forecaster",
      trigger: "nightly_cron",
      title: "Drafted PR-0042 — Aviation turbine fuel, Bharati",
      detail:
        "Consumption model projects Bharati's ATF stock crosses the 45-day reorder threshold in 11 days — inside the current packing window but tight. Auto-drafted a 5,000L requisition against Antarctic Fuel Logistics Pvt Ltd, sized to the shipping-window deadline rather than a flat reorder quantity.",
      severity: "critical",
      status: "pending_review",
      input_ref: { inventory_id: inventoryIds["BRT:Aviation Turbine Fuel"] },
    },
    {
      agent_type: "vendor_deadline_watcher",
      trigger: "on_po_update",
      title: "Escalation drafted — PO trending late for packing cutoff",
      detail:
        "Polarquip Spares & Instruments' committed delivery now lands 1 day after the packing deadline, not the shipping date. Drafted an escalation email with two mitigation options: expedite courier to Cape Town, or substitute from Maitri's spares surplus.",
      severity: "watch",
      status: "pending_review",
      input_ref: {},
    },
    {
      agent_type: "weather_contingency_planner",
      trigger: "on_weather_snapshot",
      title: "Contingency brief — early departure risk",
      detail:
        "A developing low-pressure system may force the vessel to depart Bharati 3 days ahead of schedule. If it does, two pending POs miss the vessel and would need to move to air charter at ~4.6x the freight cost per kg.",
      severity: "watch",
      status: "approved",
      reviewed_by: profileIds.ops,
      reviewed_at: new Date().toISOString(),
      input_ref: {},
    },
  ];

  for (const run of agentRunDefs) {
    const { error } = await supabase.from("ai_agent_runs").insert(run);
    if (error) throw error;
  }

  // ---- One check-in so the safety surface isn't empty either --------------
  const { error: checkinErr } = await supabase.from("checkins").insert({
    personnel_id: fieldPersonnel.id,
    is_sos: false,
    notes: "Routine check-in, station perimeter.",
  });
  if (checkinErr) throw checkinErr;

  console.log("Seed complete.");
  console.log("Demo login (all roles share the same password):");
  console.log(`  password: ${DEMO_PASSWORD}`);
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(10)} ${u.email}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
