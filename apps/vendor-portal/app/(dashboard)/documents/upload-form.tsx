"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { uploadDocument } from "./actions";

const DOCUMENT_TYPES = ["customs", "msds", "quality_cert", "other"] as const;

export function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadDocument(formData);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-md border border-border bg-card p-5">
      <div className="text-sm font-semibold text-foreground">Upload compliance document</div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-subtle">Type</label>
          <select
            name="documentType"
            required
            className="rounded-sm border border-border-strong bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "msds" ? "MSDS" : t === "quality_cert" ? "Quality Certificate" : t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground-subtle">File</label>
          <input
            type="file"
            name="file"
            required
            className="w-full rounded-sm border border-border-strong bg-background px-2.5 py-1.5 text-sm text-foreground outline-none file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Upload className="size-3.5" />
          {isPending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {error && <div className="mt-3 rounded-sm bg-critical-subtle px-3 py-2 text-xs text-critical-subtle-foreground">{error}</div>}
    </form>
  );
}
