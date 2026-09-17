"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && session) router.replace("/");
  }, [authLoading, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!navigator.onLine) {
      setError("Signing in for the first time needs a connection — once you're logged in, this app works offline.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Compass className="size-6" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-xl font-black text-foreground">POLARIS</div>
          <div className="text-xs font-bold uppercase tracking-widest text-foreground-subtle">Field</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-foreground">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-4 border-border-strong bg-card px-4 py-4 text-base text-foreground outline-none focus-visible:border-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-foreground">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-4 border-border-strong bg-card px-4 py-4 text-base text-foreground outline-none focus-visible:border-ring"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-critical-subtle px-4 py-3 text-sm font-medium text-critical-subtle-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-primary py-4 text-base font-black uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 max-w-sm text-center text-xs text-foreground-subtle">
        Field crew accounts only. First sign-in needs a connection; after that, this app keeps working with zero
        signal.
      </p>
    </div>
  );
}
