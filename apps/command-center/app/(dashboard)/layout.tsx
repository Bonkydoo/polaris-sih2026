import { Compass, Ship, Boxes, Users, Sparkles, MessageCircle, LogOut } from "lucide-react";
import { requireProfile } from "@/lib/data/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/derive";
import { signOut } from "../login/actions";
import { NavLink } from "./nav-link";

const NAV = [
  { href: "/", label: "Expedition Overview", icon: Compass },
  { href: "/cargo", label: "Cargo & Freight", icon: Ship },
  { href: "/inventory", label: "Station Inventory", icon: Boxes },
  { href: "/personnel", label: "Personnel & Safety", icon: Users },
  { href: "/ai-activity", label: "AI Activity", icon: Sparkles, commandStaffOnly: true },
  { href: "/copilot", label: "Command Copilot", icon: MessageCircle, commandStaffOnly: true },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  if (profile.role === "vendor") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-foreground-subtle">
            This is the NCPOR Command Center. The Vendor Portal — where {profile.full_name} manages POs and
            deliveries — is a separate app, coming in a later build phase.
          </p>
          <form action={signOut} className="mt-4 inline-block">
            <button type="submit" className="text-sm font-medium text-accent-ink hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: expedition } = await supabase
    .from("expeditions")
    .select("id, window_close")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const isCommandStaff = profile.role === "admin" || profile.role === "ops";
  const isLeadershipOrCommandStaff = isCommandStaff || profile.role === "leadership";
  const daysToClose = expedition ? daysUntil(expedition.window_close) : null;

  const visibleNav = NAV.filter((item) => !item.commandStaffOnly || isLeadershipOrCommandStaff);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <Compass className="size-4.5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide text-white">POLARIS</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
              NCPOR Command Center
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.href} href={item.href} icon={<Icon className="size-4" strokeWidth={2} />}>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {expedition && (
          <div className="border-t border-sidebar-border px-5 py-4">
            <div className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/70">
              Active Expedition
            </div>
            {daysToClose !== null && (
              <div className="mt-2 text-xs text-warning-subtle-foreground">
                {daysToClose > 0 ? `${daysToClose} days to window close` : "Window closed"}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-sidebar-border px-5 py-3.5">
          <div className="text-sm font-medium text-white">{profile.full_name}</div>
          <div className="text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/70">
            {profile.role}
          </div>
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
