import { DataTable, StatusBadge } from "@polaris/ui";
import { getInventoryData } from "@/lib/data/inventory";
import { daysRemaining, inventoryStatus } from "@/lib/derive";

export default async function InventoryPage() {
  const { stations, inventory } = await getInventoryData();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
          Station Inventory & Asset Register
        </div>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
          Consumption vs. Resupply Window
        </h2>
      </div>

      {stations.length === 0 && (
        <p className="text-sm text-foreground-subtle">No stations visible to this account.</p>
      )}

      {stations.map((s) => {
        const stationItems = inventory.filter((i) => i.station_id === s.id);
        if (stationItems.length === 0) return null;
        return (
          <div key={s.id} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-semibold text-foreground">{s.name}</div>
              <span className="text-xs text-foreground-subtle">{s.code}</span>
            </div>
            <DataTable
              keyField={(i) => i.id}
              data={stationItems}
              columns={[
                { header: "Item", accessor: (i) => <span className="font-medium">{i.name}</span> },
                { header: "Category", accessor: (i) => <span className="text-foreground-muted capitalize">{i.category}</span> },
                { header: "Quantity", numeric: true, accessor: (i) => `${i.quantity.toLocaleString()} ${i.unit}` },
                {
                  header: "Days Remaining",
                  numeric: true,
                  accessor: (i) => {
                    const d = daysRemaining(i);
                    return (
                      <>
                        {Number.isFinite(d) ? Math.round(d) : "—"}d{" "}
                        <span className="text-foreground-subtle">(reorder at {i.reorder_threshold_days}d)</span>
                      </>
                    );
                  },
                },
                { header: "Status", accessor: (i) => <StatusBadge status={inventoryStatus(i)} /> },
              ]}
            />
          </div>
        );
      })}
    </div>
  );
}
