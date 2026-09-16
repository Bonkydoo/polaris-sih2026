"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  /** Rendered element, not a component reference — component references
   *  (functions) can't cross the Server -> Client Component boundary. */
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
      }`}
    >
      {icon}
      {children}
      {active && <ChevronRight className="ml-auto size-3.5 text-sidebar-primary" />}
    </Link>
  );
}
