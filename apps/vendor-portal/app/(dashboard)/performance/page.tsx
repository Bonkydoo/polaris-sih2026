import { MetricCard } from "@polaris/ui";
import { Star, PackageCheck, AlertTriangle } from "lucide-react";
import { getVendor, getPurchaseOrders } from "@/lib/data/purchase-orders";

export default async function PerformancePage() {
  const [vendor, purchaseOrders] = await Promise.all([getVendor(), getPurchaseOrders()]);

  const delivered = purchaseOrders.filter((po) => po.status === "delivered");
  const late = purchaseOrders.filter((po) => po.status === "late");
  const total = purchaseOrders.length;
  const onTimeRate = total > 0 ? Math.round(((total - late.length) / total) * 100) : 100;

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">Scorecard</div>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">Performance</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Performance Score"
          value={`${vendor?.performance_score ?? "—"}/100`}
          icon={Star}
          tone={vendor && vendor.performance_score >= 85 ? "success" : vendor && vendor.performance_score >= 70 ? "warning" : "critical"}
        />
        <MetricCard label="Orders Delivered" value={String(delivered.length)} hint={`of ${total} total`} icon={PackageCheck} />
        <MetricCard
          label="On-Time Rate"
          value={`${onTimeRate}%`}
          icon={AlertTriangle}
          tone={onTimeRate >= 90 ? "success" : onTimeRate >= 70 ? "warning" : "critical"}
        />
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <p className="text-sm text-foreground-subtle">
          Your performance score is set by NCPOR command staff based on delivery reliability, document compliance,
          and responsiveness across every expedition season — not just the orders shown here. Contact your NCPOR
          logistics coordinator with questions about this score.
        </p>
      </div>
    </div>
  );
}
