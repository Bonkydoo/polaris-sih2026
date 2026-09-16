import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";

type Direction = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  swatch: string[];
  typeface: string;
};

const directions: Direction[] = [
  {
    slug: "arctic-command",
    name: "Arctic Command",
    tagline: "Serious, high-trust government-tech",
    description:
      "Deep navy and ice-blue, crisp data tables, restrained motion. A mission-control room built for a ministry, not a startup.",
    swatch: ["#0B1E33", "#123A5C", "#4FA8D8", "#EDF3F7"],
    typeface: "Source Serif 4 / IBM Plex Sans / IBM Plex Mono",
  },
  {
    slug: "glacier-minimal",
    name: "Glacier Minimal",
    tagline: "Light, airy, glass-influenced",
    description:
      "Generous whitespace, soft translucent panels, a calmer read built for long planning sessions rather than a war room.",
    swatch: ["#F4F8FB", "#DCEBF3", "#5FA8C7", "#12303D"],
    typeface: "Plus Jakarta Sans",
  },
  {
    slug: "polar-ops-dark",
    name: "Polar Ops Dark",
    tagline: "Dense, dark-mode mission control",
    description:
      "Multiple live panels, sparkline-heavy, high information density. Built to look powerful on a big screen in front of judges.",
    swatch: ["#05080D", "#0E1622", "#3DDC97", "#F2B33D"],
    typeface: "Space Grotesk / JetBrains Mono",
  },
  {
    slug: "field-first",
    name: "Field-First",
    tagline: "Mobile-first, high-contrast",
    description:
      "Huge touch targets, high contrast, previews what the offline Field App feels like — shown responsively inside the Command Center shell.",
    swatch: ["#0A0A0A", "#FFFFFF", "#FF6A00", "#1A1A1A"],
    typeface: "Inter (Black / Bold)",
  },
];

export default function ProtoPickerPage() {
  return (
    <div className="min-h-screen bg-[#0a0d12] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          <Compass className="size-3.5" strokeWidth={2.5} />
          SIH 2026 · PS 26062 · NCPOR
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          POLARIS Command Center
          <span className="block text-slate-400">prototype directions</span>
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-slate-400">
          Four independent visual directions for the NCPOR ops dashboard, built on the same
          mock dataset — expedition 46-ISEA, three stations, live inventory, cargo in transit,
          and an autonomous AI activity feed — so they compare fairly side by side.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {directions.map((d) => (
            <Link
              key={d.slug}
              href={`/proto/${d.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{d.name}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-400">{d.tagline}</p>
                </div>
                <ArrowUpRight
                  className="size-5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  strokeWidth={2}
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">{d.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {d.swatch.map((c) => (
                    <span
                      key={c}
                      className="size-5 rounded-full border border-white/10"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  {d.typeface}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-xs text-slate-600">
          Mock data only — no live Supabase connection in this build. Read-only prototype for
          visual-direction review.
        </p>
      </div>
    </div>
  );
}
