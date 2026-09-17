"use client";

import { useTransition } from "react";
import { updateDeliveryStatus } from "./actions";

const STATUS_OPTIONS = ["acknowledged", "on-track", "delivered"] as const;

export function PoStatusForm({ poId, currentDate }: { poId: string; currentDate: string | null }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => updateDeliveryStatus(formData));
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <input type="hidden" name="poId" value={poId} />
      <select
        name="status"
        defaultValue="acknowledged"
        className="rounded-sm border border-border-strong bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus-visible:border-ring"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === "on-track" ? "On track" : s[0].toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <input
        type="date"
        name="committedDeliveryDate"
        defaultValue={currentDate ?? ""}
        className="rounded-sm border border-border-strong bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus-visible:border-ring"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Update"}
      </button>
    </form>
  );
}
