import { cn } from "../../lib/utils";
import { MapPin } from "lucide-react";
import { StatusBadge, type StatusTone } from "./status-badge";

export type MapMarker = {
  id: string;
  label: string;
  /** 0-100, position within the panel. Placeholder projection only —
   *  swap for real lat/lon → screen projection when MapLibre lands. */
  x: number;
  y: number;
  tone?: StatusTone;
};

/**
 * Wrapper for the future MapLibre GL / Mapbox GL integration (voyage
 * route, station digital twin, hazard-zone overlays — see TRD §2). Keeps
 * the panel chrome, title and marker-list API stable now so swapping the
 * placeholder grid for a real map later only touches this file.
 */
export function MapPanel({
  title,
  markers = [],
  className,
}: {
  title: string;
  markers?: MapMarker[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
          {title}
        </span>
        <span className="text-[10px] text-foreground-subtle">Map integration point — MapLibre GL</span>
      </div>
      <div
        className="relative h-64 w-full"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundColor: "var(--muted)",
        }}
      >
        {markers.map((m) => (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <MapPin
              className={cn(
                "size-5 drop-shadow",
                m.tone === "critical" && "text-critical",
                m.tone === "warning" && "text-warning",
                (!m.tone || m.tone === "success") && "text-accent-ink"
              )}
              fill="currentColor"
              strokeWidth={1.5}
            />
            <span className="mt-0.5 block whitespace-nowrap rounded-sm bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
              {m.label}
            </span>
          </div>
        ))}
        {markers.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
            No markers
          </div>
        )}
      </div>
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2.5">
          {markers.map((m) => (
            <StatusBadge key={m.id} status={m.tone ?? "neutral"} label={m.label} />
          ))}
        </div>
      )}
    </div>
  );
}
