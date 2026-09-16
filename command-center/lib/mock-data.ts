// Shared mock dataset for all 4 POLARIS Command Center prototype directions.
// Every /proto/* route reads from this single module so the 4 visual
// directions are a fair, apples-to-apples comparison.

export type Station = {
  id: string;
  code: string;
  name: string;
  region: "Antarctica" | "Arctic";
  coordinates: string;
  type: string;
  capacityPct: number;
  personnelOnStation: number;
  personnelCapacity: number;
  status: "nominal" | "watch" | "critical";
  summary: string;
};

export type Expedition = {
  id: string;
  name: string;
  seasonLabel: string;
  windowOpen: string;
  windowClose: string;
  daysToWindowClose: number;
  status: "planning" | "active" | "transit" | "closed";
  vessel: string;
  stationsInvolved: string[];
};

export type InventoryItem = {
  id: string;
  stationId: string;
  name: string;
  category: "Fuel" | "Food" | "Medical" | "Spares" | "Instruments";
  quantity: number;
  unit: string;
  consumptionRatePerDay: number;
  daysRemaining: number;
  reorderThresholdDays: number;
  status: "ok" | "watch" | "critical";
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  location: string;
  performanceScore: number;
};

export type PurchaseOrder = {
  id: string;
  vendorId: string;
  itemsSummary: string;
  packingDeadline: string;
  daysToPackingDeadline: number;
  committedDeliveryDate: string;
  status: "on-track" | "at-risk" | "late" | "delivered";
};

export type Shipment = {
  id: string;
  mode: "Sea Vessel" | "Air Charter" | "Helicopter";
  route: string;
  currentLeg: string;
  etaLabel: string;
  progressPct: number;
  status: "scheduled" | "in-transit" | "arrived" | "delayed";
  cargoItemCount: number;
};

export type Personnel = {
  id: string;
  name: string;
  role: string;
  stationId: string;
  trainingStatus: "complete" | "in-progress" | "overdue";
  quarantineStatus: "cleared" | "in-progress" | "n/a";
  batch: string;
  checkinStatus: "ok" | "overdue" | "sos";
  lastCheckin: string;
};

export type AgentRun = {
  id: string;
  agentType:
    | "Reorder Forecaster"
    | "Vendor Deadline Watcher"
    | "Weather Contingency Planner"
    | "Cargo Reconciliation"
    | "Safety Escalation";
  triggeredAt: string;
  title: string;
  detail: string;
  status: "pending_review" | "approved" | "dismissed";
  severity: "info" | "watch" | "critical";
};

export const expedition: Expedition = {
  id: "46-ISEA",
  name: "46th Indian Scientific Expedition to Antarctica",
  seasonLabel: "2026–27 Season",
  windowOpen: "05 Dec 2026",
  windowClose: "18 Feb 2027",
  daysToWindowClose: 11,
  status: "active",
  vessel: "MV Vasiliy Golovnin (charter) + IL-76 air charter",
  stationsInvolved: ["bharati", "maitri", "himadri"],
};

export const stations: Station[] = [
  {
    id: "bharati",
    code: "BRT",
    name: "Bharati",
    region: "Antarctica",
    coordinates: "69.4°S, 76.2°E",
    type: "Year-round research station",
    capacityPct: 78,
    personnelOnStation: 23,
    personnelCapacity: 30,
    status: "watch",
    summary: "Fuel and spares trending tight against resupply window.",
  },
  {
    id: "maitri",
    code: "MTR",
    name: "Maitri",
    region: "Antarctica",
    coordinates: "70.8°S, 11.7°E",
    type: "Year-round research station",
    capacityPct: 64,
    personnelOnStation: 18,
    personnelCapacity: 25,
    status: "nominal",
    summary: "Nominal. Helicopter resupply window open while vessel is on-route.",
  },
  {
    id: "himadri",
    code: "HMD",
    name: "Himadri",
    region: "Arctic",
    coordinates: "78.9°N, 11.9°E",
    type: "Seasonal research station, Ny-Ålesund",
    capacityPct: 41,
    personnelOnStation: 6,
    personnelCapacity: 15,
    status: "nominal",
    summary: "Off-season staffing. Next resupply not weather-gated.",
  },
];

export const inventory: InventoryItem[] = [
  { id: "inv-001", stationId: "bharati", name: "Diesel (Station Genset)", category: "Fuel", quantity: 18400, unit: "L", consumptionRatePerDay: 420, daysRemaining: 44, reorderThresholdDays: 60, status: "watch" },
  { id: "inv-002", stationId: "bharati", name: "Aviation Turbine Fuel", category: "Fuel", quantity: 6200, unit: "L", consumptionRatePerDay: 180, daysRemaining: 34, reorderThresholdDays: 45, status: "critical" },
  { id: "inv-003", stationId: "bharati", name: "Frozen Protein Stores", category: "Food", quantity: 890, unit: "kg", consumptionRatePerDay: 6.2, daysRemaining: 143, reorderThresholdDays: 90, status: "ok" },
  { id: "inv-004", stationId: "bharati", name: "Snowmobile Drive Belts", category: "Spares", quantity: 4, unit: "units", consumptionRatePerDay: 0.03, daysRemaining: 133, reorderThresholdDays: 120, status: "watch" },
  { id: "inv-005", stationId: "bharati", name: "Trauma & Med Kit Refills", category: "Medical", quantity: 27, unit: "kits", consumptionRatePerDay: 0.15, daysRemaining: 180, reorderThresholdDays: 90, status: "ok" },
  { id: "inv-006", stationId: "maitri", name: "Diesel (Station Genset)", category: "Fuel", quantity: 21100, unit: "L", consumptionRatePerDay: 360, daysRemaining: 58, reorderThresholdDays: 60, status: "watch" },
  { id: "inv-007", stationId: "maitri", name: "Dry & Canned Provisions", category: "Food", quantity: 3400, unit: "kg", consumptionRatePerDay: 18, daysRemaining: 188, reorderThresholdDays: 90, status: "ok" },
  { id: "inv-008", stationId: "maitri", name: "Weather Balloon Consumables", category: "Instruments", quantity: 62, unit: "units", consumptionRatePerDay: 1.1, daysRemaining: 56, reorderThresholdDays: 45, status: "ok" },
  { id: "inv-009", stationId: "maitri", name: "Crevasse Rescue Kits", category: "Spares", quantity: 8, unit: "kits", consumptionRatePerDay: 0.02, daysRemaining: 400, reorderThresholdDays: 90, status: "ok" },
  { id: "inv-010", stationId: "maitri", name: "Antibiotics (Cold Chain)", category: "Medical", quantity: 140, unit: "doses", consumptionRatePerDay: 1.4, daysRemaining: 100, reorderThresholdDays: 60, status: "ok" },
  { id: "inv-011", stationId: "himadri", name: "Diesel (Station Genset)", category: "Fuel", quantity: 9800, unit: "L", consumptionRatePerDay: 140, daysRemaining: 70, reorderThresholdDays: 60, status: "ok" },
  { id: "inv-012", stationId: "himadri", name: "Polar Bear Deterrent Kits", category: "Spares", quantity: 5, unit: "kits", consumptionRatePerDay: 0.01, daysRemaining: 500, reorderThresholdDays: 120, status: "ok" },
  { id: "inv-013", stationId: "himadri", name: "Sample Cryo-Storage Media", category: "Instruments", quantity: 210, unit: "vials", consumptionRatePerDay: 3.8, daysRemaining: 55, reorderThresholdDays: 45, status: "watch" },
  { id: "inv-014", stationId: "himadri", name: "Fresh Water Filtration Cartridges", category: "Spares", quantity: 11, unit: "units", consumptionRatePerDay: 0.09, daysRemaining: 122, reorderThresholdDays: 90, status: "ok" },
  { id: "inv-015", stationId: "himadri", name: "Emergency Ration Packs", category: "Food", quantity: 340, unit: "packs", consumptionRatePerDay: 2.1, daysRemaining: 161, reorderThresholdDays: 90, status: "ok" },
];

export const vendors: Vendor[] = [
  { id: "vnd-001", name: "Antarctic Fuel Logistics Pvt Ltd", category: "Fuel & POL", location: "Cape Town, ZA", performanceScore: 91 },
  { id: "vnd-002", name: "Southern Ocean Provisions Co.", category: "Food & Provisions", location: "Cape Town, ZA", performanceScore: 87 },
  { id: "vnd-003", name: "Polarquip Spares & Instruments", category: "Spares & Instruments", location: "Goa, IN", performanceScore: 74 },
  { id: "vnd-004", name: "Meditrans Cold Chain", category: "Medical Supplies", location: "Goa, IN", performanceScore: 96 },
  { id: "vnd-005", name: "Ny-Ålesund Arctic Supply AS", category: "General Provisions", location: "Longyearbyen, NO", performanceScore: 82 },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-2031", vendorId: "vnd-001", itemsSummary: "Aviation turbine fuel, 4,000L", packingDeadline: "22 Sep 2026", daysToPackingDeadline: 6, committedDeliveryDate: "18 Sep 2026", status: "at-risk" },
  { id: "PO-2029", vendorId: "vnd-003", itemsSummary: "Snowmobile drive belts, spares kit", packingDeadline: "25 Sep 2026", daysToPackingDeadline: 9, committedDeliveryDate: "24 Sep 2026", status: "late" },
  { id: "PO-2027", vendorId: "vnd-002", itemsSummary: "Frozen protein stores, 600kg", packingDeadline: "30 Sep 2026", daysToPackingDeadline: 14, committedDeliveryDate: "26 Sep 2026", status: "on-track" },
  { id: "PO-2024", vendorId: "vnd-004", itemsSummary: "Cold-chain antibiotics, trauma refills", packingDeadline: "28 Sep 2026", daysToPackingDeadline: 12, committedDeliveryDate: "20 Sep 2026", status: "on-track" },
  { id: "PO-2019", vendorId: "vnd-005", itemsSummary: "Himadri general provisions restock", packingDeadline: "12 Oct 2026", daysToPackingDeadline: 26, committedDeliveryDate: "05 Oct 2026", status: "delivered" },
];

export const shipments: Shipment[] = [
  { id: "SHP-114", mode: "Sea Vessel", route: "Cape Town → Bharati → Maitri → Cape Town", currentLeg: "Southern Ocean, approaching Bharati", etaLabel: "ETA Bharati in 4 days", progressPct: 62, status: "in-transit", cargoItemCount: 214 },
  { id: "SHP-115", mode: "Air Charter", route: "Goa → Cape Town → Bharati (IL-76)", currentLeg: "Awaiting fuel-stop weather clearance, Cape Town", etaLabel: "ETA Bharati in 9 days", progressPct: 38, status: "delayed", cargoItemCount: 46 },
  { id: "SHP-116", mode: "Helicopter", route: "Vessel-based shuttle → Maitri", currentLeg: "Standing by, weather window pending", etaLabel: "Next window in 2 days", progressPct: 0, status: "scheduled", cargoItemCount: 12 },
];

export const personnel: Personnel[] = [
  { id: "p-01", name: "Dr. Ananya Rao", role: "Station Leader", stationId: "bharati", trainingStatus: "complete", quarantineStatus: "cleared", batch: "Batch 3", checkinStatus: "ok", lastCheckin: "12 min ago" },
  { id: "p-02", name: "Cdr. Vikram Sehgal", role: "Logistics Officer", stationId: "bharati", trainingStatus: "complete", quarantineStatus: "cleared", batch: "Batch 3", checkinStatus: "ok", lastCheckin: "40 min ago" },
  { id: "p-03", name: "Dr. Priya Nair", role: "Glaciologist", stationId: "bharati", trainingStatus: "complete", quarantineStatus: "cleared", batch: "Batch 2", checkinStatus: "overdue", lastCheckin: "6 hr 40 min ago" },
  { id: "p-04", name: "Rakesh Menon", role: "Comms & IT", stationId: "maitri", trainingStatus: "complete", quarantineStatus: "cleared", batch: "Batch 2", checkinStatus: "ok", lastCheckin: "3 min ago" },
  { id: "p-05", name: "Dr. Sameer Joshi", role: "Medical Officer", stationId: "maitri", trainingStatus: "complete", quarantineStatus: "cleared", batch: "Batch 1", checkinStatus: "ok", lastCheckin: "22 min ago" },
  { id: "p-06", name: "Neha Kulkarni", role: "Atmospheric Scientist", stationId: "himadri", trainingStatus: "in-progress", quarantineStatus: "n/a", batch: "Batch 5", checkinStatus: "ok", lastCheckin: "1 hr ago" },
  { id: "p-07", name: "Arjun Bhatt", role: "Field Technician", stationId: "himadri", trainingStatus: "overdue", quarantineStatus: "n/a", batch: "Batch 5", checkinStatus: "ok", lastCheckin: "48 min ago" },
];

export const agentRuns: AgentRun[] = [
  {
    id: "run-4402",
    agentType: "Reorder Forecaster",
    triggeredAt: "Today, 02:14 IST",
    title: "Drafted PR-0042 — Aviation turbine fuel, Bharati",
    detail:
      "Consumption model projects Bharati's ATF stock crosses the 45-day reorder threshold in 11 days — inside the current packing window but tight. Auto-drafted a 5,000L requisition against Antarctic Fuel Logistics Pvt Ltd, sized to the shipping-window deadline rather than a flat reorder quantity.",
    status: "pending_review",
    severity: "critical",
  },
  {
    id: "run-4398",
    agentType: "Vendor Deadline Watcher",
    triggeredAt: "Today, 01:52 IST",
    title: "Escalation drafted — PO-2029 trending late for packing cutoff",
    detail:
      "Polarquip Spares & Instruments' committed delivery for PO-2029 (snowmobile drive belts) now lands 1 day after the 25 Sep packing deadline, not the shipping date. Drafted an escalation email to the vendor's logistics coordinator with two mitigation options: expedite courier to Cape Town, or substitute from Maitri's spares surplus.",
    status: "pending_review",
    severity: "watch",
  },
  {
    id: "run-4391",
    agentType: "Weather Contingency Planner",
    triggeredAt: "Yesterday, 22:40 IST",
    title: "Contingency brief — early departure risk, SHP-114",
    detail:
      "A developing low-pressure system may force MV Vasiliy Golovnin to depart Bharati 3 days ahead of schedule. If it does, PO-2031 and PO-2029 miss the vessel and would need to move to air charter SHP-115 at ~4.6x the freight cost per kg.",
    status: "approved",
    severity: "watch",
  },
];

export function stationById(id: string) {
  return stations.find((s) => s.id === id);
}

export function vendorById(id: string) {
  return vendors.find((v) => v.id === id);
}

export function inventoryByStation(stationId: string) {
  return inventory.filter((i) => i.stationId === stationId);
}

export function personnelByStation(stationId: string) {
  return personnel.filter((p) => p.stationId === stationId);
}
