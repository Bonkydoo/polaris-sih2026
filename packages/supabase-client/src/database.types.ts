// Hand-written to match supabase/migrations/*.sql exactly. This is a
// stand-in for the real thing — once a Supabase project exists (local or
// cloud), regenerate with `npm run gen-types` in this package and this
// comment block goes away. Shape follows the standard `supabase gen types`
// output so nothing downstream needs to change when that happens.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrgType = "ncpor" | "ministry" | "vendor";
export type UserRole = "admin" | "ops" | "field" | "vendor" | "leadership";
export type StationRegion = "antarctica" | "arctic";
export type ExpeditionStatus = "planning" | "active" | "transit" | "closed";
export type TrainingStatus = "complete" | "in-progress" | "overdue";
export type QuarantineStatus = "cleared" | "in-progress" | "not-required";
export type TravelMode = "sea" | "air";
export type CargoCategory = "fuel" | "food" | "medical" | "spares" | "instruments";
export type RequisitionStatus = "draft" | "submitted" | "approved" | "converted_to_po" | "rejected";
export type PoStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "on-track"
  | "at-risk"
  | "late"
  | "delivered"
  | "cancelled";
export type ShipmentMode = "sea_vessel" | "air_charter" | "helicopter";
export type ShipmentStatus = "scheduled" | "in-transit" | "arrived" | "delayed";
export type IncidentType = "safety" | "medical" | "logistics";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "resolved";
export type HazardType = "crevasse" | "wildlife" | "whiteout-risk";
export type AgentType =
  | "reorder_forecaster"
  | "vendor_deadline_watcher"
  | "weather_contingency_planner"
  | "cargo_reconciliation"
  | "safety_escalation"
  | "report_drafter"
  | "command_copilot";
export type AgentRunStatus = "pending_review" | "approved" | "dismissed";
export type AgentRunSeverity = "info" | "watch" | "critical";

type Timestamped = {
  created_at: string;
  updated_at: string;
};

// postgrest-js's GenericTable requires a `Relationships` array alongside
// Row/Insert/Update, and GenericSchema requires Views/Functions keys to
// exist (even empty) — without both, generic inference on .insert() /
// .update() silently collapses to `never[]`. This wrapper injects
// Relationships: [] onto every table below so the raw definitions can
// stay focused on the columns that actually matter.
type WithRelationships<T> = {
  [K in keyof T]: T[K] extends { Row: infer R; Insert: infer I; Update: infer U }
    ? { Row: R; Insert: I; Update: U; Relationships: [] }
    : never;
};

type PublicTablesRaw = {
      organizations: {
        Row: { id: string; name: string; type: OrgType } & Timestamped;
        Insert: { id?: string; name: string; type: OrgType; created_at?: string; updated_at?: string };
        Update: Partial<PublicTablesRaw["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          role: UserRole;
          full_name: string;
          station_id: string | null;
          vendor_id: string | null;
        } & Timestamped;
        Insert: {
          id: string;
          organization_id: string;
          role: UserRole;
          full_name: string;
          station_id?: string | null;
          vendor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["profiles"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: "insert" | "update" | "delete";
          entity_table: string;
          entity_id: string;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: never; // written only by the log_audit_event() trigger
        Update: never;
      };
      stations: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          region: StationRegion;
          station_type: string;
          coordinates: string | null; // geography(point) as WKT/GeoJSON text
          personnel_capacity: number;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          region: StationRegion;
          station_type: string;
          coordinates?: string | null;
          personnel_capacity?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["stations"]["Insert"]>;
      };
      expeditions: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          season_label: string;
          window_open: string;
          window_close: string;
          status: ExpeditionStatus;
          vessel: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          season_label: string;
          window_open: string;
          window_close: string;
          status?: ExpeditionStatus;
          vessel?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["expeditions"]["Insert"]>;
      };
      expedition_stations: {
        Row: { expedition_id: string; station_id: string };
        Insert: { expedition_id: string; station_id: string };
        Update: Partial<PublicTablesRaw["expedition_stations"]["Insert"]>;
      };
      personnel: {
        Row: {
          id: string;
          expedition_id: string;
          user_id: string;
          station_id: string;
          role_title: string;
          training_status: TrainingStatus;
          quarantine_status: QuarantineStatus;
          batch_label: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          expedition_id: string;
          user_id: string;
          station_id: string;
          role_title: string;
          training_status?: TrainingStatus;
          quarantine_status?: QuarantineStatus;
          batch_label?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["personnel"]["Insert"]>;
      };
      travel_batches: {
        Row: {
          id: string;
          expedition_id: string;
          batch_code: string;
          mode: TravelMode;
          transit_legs: Json;
          departure_date: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          expedition_id: string;
          batch_code: string;
          mode: TravelMode;
          transit_legs?: Json;
          departure_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["travel_batches"]["Insert"]>;
      };
      travel_batch_members: {
        Row: { travel_batch_id: string; personnel_id: string };
        Insert: { travel_batch_id: string; personnel_id: string };
        Update: Partial<PublicTablesRaw["travel_batch_members"]["Insert"]>;
      };
      vendors: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category: string;
          location: string | null;
          performance_score: number;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category: string;
          location?: string | null;
          performance_score?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["vendors"]["Insert"]>;
      };
      purchase_requisitions: {
        Row: {
          id: string;
          expedition_id: string;
          station_id: string;
          requested_by: string;
          items: Json;
          status: RequisitionStatus;
          packing_deadline: string;
          drafted_by_agent_run_id: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          expedition_id: string;
          station_id: string;
          requested_by: string;
          items?: Json;
          status?: RequisitionStatus;
          packing_deadline: string;
          drafted_by_agent_run_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["purchase_requisitions"]["Insert"]>;
      };
      purchase_orders: {
        Row: {
          id: string;
          requisition_id: string;
          vendor_id: string;
          items_summary: string;
          packing_deadline: string;
          committed_delivery_date: string | null;
          status: PoStatus;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          requisition_id: string;
          vendor_id: string;
          items_summary: string;
          packing_deadline: string;
          committed_delivery_date?: string | null;
          status?: PoStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["purchase_orders"]["Insert"]>;
      };
      cargo_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          name: string;
          category: CargoCategory;
          quantity: number;
          unit: string;
          weight_kg: number | null;
          volume_m3: number | null;
          shipment_id: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          purchase_order_id: string;
          name: string;
          category: CargoCategory;
          quantity: number;
          unit: string;
          weight_kg?: number | null;
          volume_m3?: number | null;
          shipment_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["cargo_items"]["Insert"]>;
      };
      shipments: {
        Row: {
          id: string;
          expedition_id: string;
          destination_station_id: string;
          mode: ShipmentMode;
          route: string;
          current_leg: string | null;
          current_position: string | null;
          eta: string | null;
          progress_pct: number;
          status: ShipmentStatus;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          expedition_id: string;
          destination_station_id: string;
          mode: ShipmentMode;
          route: string;
          current_leg?: string | null;
          current_position?: string | null;
          eta?: string | null;
          progress_pct?: number;
          status?: ShipmentStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["shipments"]["Insert"]>;
      };
      inventory: {
        Row: {
          id: string;
          station_id: string;
          name: string;
          category: CargoCategory;
          quantity: number;
          unit: string;
          consumption_rate_per_day: number;
          reorder_threshold_days: number;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          station_id: string;
          name: string;
          category: CargoCategory;
          quantity?: number;
          unit: string;
          consumption_rate_per_day?: number;
          reorder_threshold_days?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        // quantity is intentionally excluded from Update in practice — it's
        // maintained by the apply_consumption_log() trigger, not written
        // directly. The type still allows it (DB has no column-level
        // grant enforcing this yet); treat direct quantity writes as an
        // admin-only correction path, not the normal flow.
        Update: Partial<PublicTablesRaw["inventory"]["Insert"]>;
      };
      consumption_logs: {
        Row: {
          id: string;
          inventory_id: string;
          quantity_used: number;
          logged_at: string;
          logged_by: string;
          recorded_offline: boolean;
        };
        Insert: {
          id?: string;
          inventory_id: string;
          quantity_used: number;
          logged_at?: string;
          logged_by: string;
          recorded_offline?: boolean;
        };
        Update: never; // append-only
      };
      incidents: {
        Row: {
          id: string;
          station_id: string;
          expedition_id: string | null;
          type: IncidentType;
          severity: IncidentSeverity;
          status: IncidentStatus;
          title: string;
          description: string | null;
          timeline: Json;
          reported_by: string;
          raised_by_agent_run_id: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          station_id: string;
          expedition_id?: string | null;
          type: IncidentType;
          severity: IncidentSeverity;
          status?: IncidentStatus;
          title: string;
          description?: string | null;
          timeline?: Json;
          reported_by: string;
          raised_by_agent_run_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["incidents"]["Insert"]>;
      };
      hazard_zones: {
        Row: {
          id: string;
          station_id: string;
          name: string;
          type: HazardType;
          geometry: string; // geography(polygon) as WKT/GeoJSON text
          risk_notes: string | null;
          created_by: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          station_id: string;
          name: string;
          type: HazardType;
          geometry: string;
          risk_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PublicTablesRaw["hazard_zones"]["Insert"]>;
      };
      checkins: {
        Row: {
          id: string;
          personnel_id: string;
          checkin_at: string;
          location: string | null;
          hazard_zone_id: string | null;
          is_sos: boolean;
          notes: string | null;
          recorded_offline: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          personnel_id: string;
          checkin_at?: string;
          location?: string | null;
          hazard_zone_id?: string | null;
          is_sos?: boolean;
          notes?: string | null;
          recorded_offline?: boolean;
          created_at?: string;
        };
        Update: never; // append-only
      };
      weather_snapshots: {
        Row: {
          id: string;
          station_id: string | null;
          shipment_id: string | null;
          source: string;
          window_start: string;
          window_end: string;
          risk_score: number;
          raw_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          station_id?: string | null;
          shipment_id?: string | null;
          source: string;
          window_start: string;
          window_end: string;
          risk_score: number;
          raw_payload?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      ai_agent_runs: {
        Row: {
          id: string;
          agent_type: AgentType;
          trigger: string;
          input_ref: Json;
          title: string;
          detail: string;
          output: Json | null;
          severity: AgentRunSeverity;
          status: AgentRunStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        // Written by Edge Functions via the service role (bypasses RLS).
        Insert: {
          id?: string;
          agent_type: AgentType;
          trigger: string;
          input_ref?: Json;
          title: string;
          detail: string;
          output?: Json | null;
          severity?: AgentRunSeverity;
          status?: AgentRunStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        // The only client-facing mutation: flip status to approved/dismissed.
        Update: { status?: AgentRunStatus; reviewed_by?: string | null; reviewed_at?: string | null };
      };
      report_embeddings: {
        Row: {
          id: string;
          source_table: string;
          source_id: string;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_table: string;
          source_id: string;
          content: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: never;
      };
};

export interface Database {
  public: {
    Tables: WithRelationships<PublicTablesRaw>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      org_type: OrgType;
      user_role: UserRole;
      station_region: StationRegion;
      expedition_status: ExpeditionStatus;
      training_status: TrainingStatus;
      quarantine_status: QuarantineStatus;
      travel_mode: TravelMode;
      cargo_category: CargoCategory;
      requisition_status: RequisitionStatus;
      po_status: PoStatus;
      shipment_mode: ShipmentMode;
      shipment_status: ShipmentStatus;
      incident_type: IncidentType;
      incident_severity: IncidentSeverity;
      incident_status: IncidentStatus;
      hazard_type: HazardType;
      agent_type: AgentType;
      agent_run_status: AgentRunStatus;
      agent_run_severity: AgentRunSeverity;
    };
  };
}

export type Tables<T extends keyof PublicTablesRaw> = PublicTablesRaw[T]["Row"];
export type TablesInsert<T extends keyof PublicTablesRaw> =
  PublicTablesRaw[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTablesRaw> =
  PublicTablesRaw[T]["Update"];
