import { DataTable, StatusBadge } from "@polaris/ui";
import { getCargoData } from "@/lib/data/cargo";
import { daysUntil } from "@/lib/derive";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md border border-border bg-card ${className}`}>{children}</div>;
}

export default async function CargoPage() {
  const { purchaseOrders, shipments, vendors } = await getCargoData();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
          Cargo & Freight Orchestration
        </div>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
          Purchase Orders & Shipment Tracker
        </h2>
      </div>

      <DataTable
        keyField={(po) => po.id}
        data={purchaseOrders}
        columns={[
          { header: "PO", accessor: (po) => <span className="font-medium">{po.id.slice(0, 8)}</span>, numeric: true },
          { header: "Vendor", accessor: (po) => po.vendors?.name ?? "—" },
          { header: "Items", accessor: (po) => <span className="text-foreground-muted">{po.items_summary}</span> },
          {
            header: "Packing Deadline",
            accessor: (po) => (
              <>
                {po.packing_deadline}{" "}
                <span className="text-xs text-foreground-subtle">({daysUntil(po.packing_deadline)}d)</span>
              </>
            ),
          },
          { header: "Status", accessor: (po) => <StatusBadge status={po.status} /> },
        ]}
      />

      <div className="mt-8 mb-4 text-sm font-semibold text-foreground">Shipment Tracker</div>
      {shipments.length === 0 && <p className="text-sm text-foreground-subtle">No shipments recorded.</p>}
      <div className="grid grid-cols-3 gap-4">
        {shipments.map((sh) => (
          <Panel key={sh.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold capitalize">{sh.mode.replace("_", " ")}</div>
              <StatusBadge status={sh.status} />
            </div>
            <div className="mt-2 text-xs text-foreground-subtle">{sh.stations?.name}</div>
            <p className="mt-3 text-sm text-foreground-muted">{sh.current_leg ?? sh.route}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${sh.progress_pct}%` }} />
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-8 mb-4 text-sm font-semibold text-foreground">Vendor Performance</div>
      {vendors.length === 0 ? (
        <p className="text-sm text-foreground-subtle">No vendors visible to this account.</p>
      ) : (
        <DataTable
          keyField={(v) => v.id}
          data={vendors}
          columns={[
            { header: "Vendor", accessor: (v) => <span className="font-medium">{v.name}</span> },
            { header: "Category", accessor: (v) => <span className="text-foreground-muted">{v.category}</span> },
            { header: "Location", accessor: (v) => <span className="text-foreground-subtle">{v.location}</span> },
            {
              header: "Performance",
              numeric: true,
              accessor: (v) => (
                <>
                  {v.performance_score}
                  <span className="text-foreground-subtle">/100</span>
                </>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
