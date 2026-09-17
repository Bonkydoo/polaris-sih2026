import { StatusBadge } from "@polaris/ui";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { PoStatusForm } from "./po-status-form";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default async function PurchaseOrdersPage() {
  const purchaseOrders = await getPurchaseOrders();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">Your Purchase Orders</div>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">Packing Deadlines</h1>
      </div>

      {purchaseOrders.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-foreground-subtle">
          No purchase orders on file yet.
        </div>
      ) : (
        <div className="space-y-4">
          {purchaseOrders.map((po) => {
            const days = daysUntil(po.packing_deadline);
            const requisition = po.purchase_requisitions as {
              items: { name: string; quantity: number; unit: string }[];
              stations?: { name: string } | null;
            } | null;

            return (
              <div key={po.id} className="rounded-md border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{po.items_summary}</div>
                    <div className="mt-1 text-xs text-foreground-subtle">
                      Destination: {requisition?.stations?.name ?? "—"}
                    </div>
                  </div>
                  <StatusBadge status={po.status} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[11px] uppercase text-foreground-subtle">Packing deadline</div>
                    <div className="mt-0.5 font-mono text-foreground">
                      {po.packing_deadline}{" "}
                      <span className={days < 0 ? "text-critical" : days <= 7 ? "text-warning" : "text-foreground-subtle"}>
                        ({days >= 0 ? `${days}d` : `${Math.abs(days)}d overdue`})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-foreground-subtle">Committed delivery</div>
                    <div className="mt-0.5 font-mono text-foreground">{po.committed_delivery_date ?? "Not set"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-foreground-subtle">Status</div>
                    <div className="mt-0.5 capitalize text-foreground">{po.status.replace("-", " ")}</div>
                  </div>
                </div>

                {po.status !== "delivered" && po.status !== "cancelled" && (
                  <div className="mt-4">
                    <PoStatusForm poId={po.id} currentDate={po.committed_delivery_date} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
