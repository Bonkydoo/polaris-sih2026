import { Ship, FileText, BarChart3, LogOut } from "lucide-react";
import { requireVendorProfile } from "@/lib/data/profile";
import { getVendor } from "@/lib/data/purchase-orders";
import { signOut } from "../login/actions";
import { NavLink } from "./nav-link";

const NAV = [
  { href: "/", label: "Purchase Orders", icon: Ship },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/performance", label: "Performance", icon: BarChart3 },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireVendorProfile();

  if (profile.role !== "vendor") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-foreground-subtle">
            This is the POLARIS Vendor Portal — for external suppliers only. {profile.full_name}, your account
            ({profile.role}) belongs in the Command Center instead.
          </p>
        </div>
      </div>
    );
  }

  const vendor = await getVendor();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <Ship className="size-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide text-white">POLARIS</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
              Vendor Portal
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.href} href={item.href} icon={<Icon className="size-4" strokeWidth={2} />}>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-3.5">
          <div className="text-sm font-medium text-white">{vendor?.name ?? profile.full_name}</div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/70">{vendor?.category}</div>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 transition hover:text-white"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="ml-64 flex-1">
        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
