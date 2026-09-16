"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Compass, AlertCircle } from "lucide-react";
import { signIn } from "./actions";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@polaris-demo.ncpor.gov.in" },
  { role: "Ops", email: "ops@polaris-demo.ncpor.gov.in" },
  { role: "Field (Bharati)", email: "field@polaris-demo.ncpor.gov.in" },
  { role: "Leadership", email: "leadership@polaris-demo.ncpor.gov.in" },
];
const DEMO_PASSWORD = "polaris-demo-2026";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-emphasis disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState<{ error: string | null }, FormData>(signIn, { error: null });

  function fillDemo(email: string) {
    const form = document.getElementById("login-form") as HTMLFormElement | null;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = DEMO_PASSWORD;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-sm bg-primary text-accent">
            <Compass className="size-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading text-lg font-semibold text-foreground">POLARIS</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-foreground-subtle">
              NCPOR Command Center
            </div>
          </div>
        </div>

        <form id="login-form" action={formAction} className="rounded-md border border-border bg-card p-6">
          <label className="block text-xs font-medium text-foreground-subtle">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-sm border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring"
          />

          <label className="mt-4 block text-xs font-medium text-foreground-subtle">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-sm border border-border-strong bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring"
          />

          {state.error && (
            <div className="mt-4 flex items-start gap-2 rounded-sm bg-critical-subtle px-3 py-2 text-xs text-critical-subtle-foreground">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="mt-5">
            <SubmitButton />
          </div>
        </form>

        <div className="mt-4 rounded-md border border-border bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
            Demo accounts
          </div>
          <p className="mt-1 text-xs text-foreground-subtle">
            Shared password: <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
          <div className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span className="font-medium text-foreground">{a.role}</span>
                <span className="text-foreground-subtle">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
