import { DataTable, StatusBadge } from "@polaris/ui";
import { getPersonnelData } from "@/lib/data/personnel";

function lastCheckin(checkins: { checkin_at: string; is_sos: boolean }[]) {
  if (checkins.length === 0) return null;
  return checkins.reduce((latest, c) => (c.checkin_at > latest.checkin_at ? c : latest));
}

function checkinStatus(checkins: { checkin_at: string; is_sos: boolean }[]) {
  const latest = lastCheckin(checkins);
  if (!latest) return "overdue";
  if (latest.is_sos) return "sos";
  const hoursSince = (Date.now() - new Date(latest.checkin_at).getTime()) / 3600000;
  return hoursSince > 12 ? "overdue" : "ok";
}

export default async function PersonnelPage() {
  const { personnel } = await getPersonnelData();

  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.15em] text-foreground-subtle">
          Personnel & Safety Operations
        </div>
        <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">Roster & Check-In Status</h2>
      </div>

      {personnel.length === 0 ? (
        <p className="text-sm text-foreground-subtle">No personnel visible to this account.</p>
      ) : (
        <DataTable
          keyField={(p) => p.id}
          data={personnel}
          columns={[
            { header: "Name", accessor: (p) => <span className="font-medium">{p.profiles?.full_name ?? "—"}</span> },
            { header: "Role", accessor: (p) => <span className="text-foreground-muted">{p.role_title}</span> },
            { header: "Station", accessor: (p) => p.stations?.name ?? "—" },
            {
              header: "Training",
              accessor: (p) => <StatusBadge status={p.training_status === "complete" ? "ok" : p.training_status} />,
            },
            {
              header: "Last Check-in",
              accessor: (p) => {
                const latest = lastCheckin(p.checkins ?? []);
                return (
                  <span className="font-mono text-foreground-subtle">
                    {latest ? new Date(latest.checkin_at).toLocaleString() : "Never"}
                  </span>
                );
              },
            },
            { header: "Status", accessor: (p) => <StatusBadge status={checkinStatus(p.checkins ?? [])} /> },
          ]}
        />
      )}
    </div>
  );
}
