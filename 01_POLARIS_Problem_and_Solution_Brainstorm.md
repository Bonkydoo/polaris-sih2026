# POLARIS
### Polar Operations, Logistics, Assets & Resource Intelligence System
**Smart India Hackathon 2026 — Problem Statement 26062**

---

## 1. Problem Statement (as issued)

| Field | Detail |
|---|---|
| PS ID | 26062 |
| Title | Integrated Polar Expedition Logistics and Asset Management System |
| Description | Develop a centralized digital platform for expedition planning, cargo tracking, inventory management, personnel movement and emergency response. |
| Organization | Ministry of Earth Sciences (MoES) |
| Department | National Centre for Polar and Ocean Research (NCPOR) |
| Category | Software |
| Theme | Smart Automation |

## 2. Why this problem is genuinely hard (the real-world context)

NCPOR runs India's entire polar footprint out of Vasco, Goa: **Bharati** and **Maitri** stations in Antarctica (currently on the ~46th Indian Scientific Expedition to Antarctica — ISEA), and **Himadri**, India's Arctic station at Ny-Ålesund, Svalbard — 1,200 km from the North Pole, historically staffed ~180 days/year and now moving toward year-round operation.

What makes this different from ordinary supply-chain software:

- **The shipping window is a hard, once-a-year wall.** Expedition cargo moves Cape Town → Bharati → Maitri → Cape Town on a chartered voyage vessel, or via chartered air cargo (India flew its first direct cargo charter — an IL-76, 18 tonnes of medicine/food/scientific equipment — from Goa via Cape Town in Oct 2025). The travel season runs roughly December–February; once the ship exits India Bay, **the station is cut off until the next season.** There is no "next-day resupply." A missed reorder isn't a delay, it's a 10–12 month problem.
- **The current process is manual and fragmented.** Purchase requisitions, cargo segregation, packing and containerization are tracked administratively; there is no single system connecting *what was ordered* → *what was packed* → *what shipped* → *what actually arrived and is in stock* → *what personnel are doing with it in the field*.
- **Multiple, unreliable transport modes** must be reconciled: sea voyage (bulk, cheap, slow, only during the season), chartered air freight (fast, expensive, weather- and fuel-stop dependent), and ship-based helicopters at Maitri (available only when the ship is nearby and weather permits).
- **Personnel logistics are safety-critical**, not just HR: mandatory Cape Town quarantine, firefighting/cold-weather/polar-bear-safety training before deployment, batch travel, and in-field movement in genuinely dangerous terrain (crevasses, sea ice, polar bears at Himadri, whiteouts).
- **Connectivity is the opposite of a normal SaaS environment** — satellite links at the stations are low-bandwidth and intermittent. Any system that assumes constant internet will fail exactly where it's needed most.
- **Space is brutally constrained.** Containerised/modular lab and storage space at the stations is limited, so over-ordering isn't a safe fallback — it wastes scarce cargo capacity that could have carried something more critical.

This is the brief in one sentence: **the scarce resource isn't money, it's time and cargo-weight inside a shipping window that only opens once a year** — and almost every failure mode (running out of a spare part, a vendor missing a packing deadline, a team member not accounted for during an evacuation) is catastrophic rather than merely inconvenient. That's exactly the kind of high-stakes, deadline-driven, physically-constrained domain where autonomous AI monitoring earns its keep — not a chatbot bolted onto a CRUD app, but a system that watches consumption curves, shipping deadlines and weather 24/7 and acts *before* a human would have noticed.

## 3. The Vision — "Runs while you sleep"

POLARIS is not a tracking dashboard that waits for someone to log in. It is an **AI-native command layer** sitting on top of the expedition's entire lifecycle, with autonomous agents that:

- Forecast station-level consumption of fuel, food, medical supplies and spares against the *actual* remaining time until the next resupply window, and **auto-draft a reorder/re-provisioning requisition** before a human would think to check.
- Watch vendor commitments against the shipping cutoff and **escalate automatically** the moment a delivery is trending late for the packing deadline — not the shipping date.
- Cross-reference weather forecasts against the vessel's route and helicopter operations and **auto-generate contingency plans** (e.g. "if the ship departs 3 days early, these 4 pending deliveries will miss the window — here are two mitigation options").
- Reconcile cargo manifests against what's scanned in at the station and **flag discrepancies** (shortfall, damage, mis-shipment) without anyone manually cross-checking a spreadsheet.
- Monitor personnel check-ins/GPS pings and **auto-escalate to the emergency response workflow** if a check-in is missed past a hazard-aware threshold.
- **Auto-draft the recurring reports** NCPOR already has to produce for MoES/Parliament — expedition status, cargo utilisation, safety incidents — as clean, ready-to-review documents.

Everything above happens as background jobs and edge functions, not as a feature a user has to remember to click.

## 4. Core Product Pillars

| # | Pillar | What it does |
|---|---|---|
| 1 | **Mission Control** — Expedition & Voyage Planning | Full expedition lifecycle: proposal intake → team formation → training/quarantine milestones → travel-window calendar → live "digital twin" of each station and the voyage/flight in progress. |
| 2 | **Cargo & Freight Orchestration** | Purchase requisition → procurement → packing/segregation → containerization → mode selection (sea vessel / air charter / helicopter) with cost, weight and weather-risk scoring; live shipment tracking through Cape Town transit. |
| 3 | **Station Inventory & Asset Register** | Digital twin of stock at Bharati, Maitri and Himadri: consumables, fuel, spares, scientific instruments, with barcode/QR check-in, consumption-rate modelling, and **autonomous reorder-before-window** alerts. |
| 4 | **Personnel & Safety Operations** | Roster, training/quarantine compliance, batch travel manifests, in-field movement & check-ins, hazard-zone mapping (crevasses, polar-bear zones), one-tap SOS and structured emergency-response workflows. |
| 5 | **Vendor & Supplier Portal** | External, self-service portal for suppliers: PO acceptance, packing-deadline countdown, document/compliance upload (customs, MSDS, quality certs), delivery status, and a transparent performance scorecard. |
| 6 | **AI Command Layer** | The autonomous layer: forecasting agents, anomaly detection, weather-triggered re-planning, natural-language copilot for command staff ("what happens to the fuel budget if Maitri's departure moves up a week?"), and auto-drafted reports. |

## 5. Portals & Personas

POLARIS ships as **three distinct experiences**, one codebase, role-based access:

1. **Command Center (NCPOR Ops/Admin)** — desktop-first, data-dense "mission control" for planning, approvals, cross-station visibility, AI copilot, and reporting to MoES leadership.
2. **Field App (Expedition Personnel)** — installable, **offline-first PWA** built for satellite-link reality: local-first data, background sync when connectivity appears, huge touch targets and high contrast for use in gloves/low light, SOS always one tap away.
3. **Vendor Portal** — clean, focused web app for external suppliers to manage POs, upload compliance docs and track their own delivery-window countdown — no NCPOR internal clutter.

*(A fourth, read-only Leadership/Ministry view is a natural v2 extension — pre-baked into the role model so it's a permission change, not a rebuild.)*

## 6. What makes this the winning solution (judge-facing differentiators)

- **Grounded in the real process** — the data model mirrors how NCPOR actually runs an ISEA expedition (requisition → segregation → packing → shipment → station), not a generic "logistics app" skin.
- **Offline-first, not offline-tolerant.** Built assuming the network will disappear, because at 78°N and in the Southern Ocean, it will.
- **Genuinely autonomous**, not just automated forms — the AI layer initiates action (draft reorders, escalations, contingency plans) rather than waiting to be asked.
- **The scarce-resource framing is explicit in the UI**: every screen answers "what happens if the window closes on us," which is the actual question NCPOR planners lose sleep over.
- **Digital twin visualization** of stations and the in-transit voyage gives judges an immediately legible, visually striking demo.
- **Designed for three real, different users** (ops staff at a desk, a scientist in a parka with satellite data, a vendor's logistics coordinator) instead of one generic dashboard reused for everyone.

## 7. Scope: MVP (hackathon prototype) vs. Full Product

| Capability | MVP / Prototype | Full Product (v1.0) |
|---|---|---|
| Expedition planning | Static timeline + milestone tracker | Full digital-twin planner with scenario simulation |
| Cargo tracking | Manual status updates, mocked shipment feed | Live integration hooks (AIS/vessel position, courier APIs), auto mode-selection engine |
| Inventory | CRUD + manual consumption entry | Real-time consumption forecasting, auto-reorder agent |
| Personnel & safety | Roster + manual check-in log | GPS-aware check-ins, hazard-zone geofencing, automated SOS escalation |
| Vendor portal | Basic PO view + status update | Full self-service portal, compliance doc workflow, performance scoring |
| AI layer | Rule-based alerts + one Claude-powered copilot demo (chat + report drafting) | Full autonomous agent suite (forecasting, anomaly detection, weather-triggered replanning), scheduled via cron/edge functions |
| Offline support | Basic PWA install + cached views | True offline-first with conflict-resolved sync |

The **prototype's job is to make the vision unmistakably legible in a 5–10 minute demo**: a live-looking Command Center, a working offline Field App simulation, a Vendor portal, and at least one visibly autonomous AI action happening on stage ("watch — it just flagged that Vendor X will miss the packing deadline and drafted an escalation email, unprompted").

---
*Continue to `02_POLARIS_Technical_Requirements_Document.md` for the architecture and stack, and `03_POLARIS_Claude_Code_Handoff_Prompts.md` for ready-to-paste build prompts.*
