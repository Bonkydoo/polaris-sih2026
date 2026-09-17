"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { db, getMeta, setMeta } from "./db";
import { refreshCache } from "./refresh";
import { syncOutbox } from "./sync";
import type { Tables } from "@polaris/supabase-client";

type Profile = Tables<"profiles">;

type AuthState = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  personnelId: string | null;
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  signOut: () => Promise<void>;
  triggerSync: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const loadedForUserId = useRef<string | null>(null);

  // Live, not polled: reacts to an outbox write from *any* code path
  // (queueConsumptionLog, queueCheckin, syncOutbox draining it) without
  // every one of those call sites needing to remember to also poke a
  // "refresh the count" callback. That was a real bug here — writes were
  // landing in the outbox correctly but the UI's pending badge sat at 0
  // until the next unrelated re-render happened to call refreshPendingCount.
  const pendingCount = useLiveQuery(() => db.outbox.count(), []) ?? 0;

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    await syncOutbox();
    await refreshCache();
    setLastSyncAt((await getMeta("lastSyncAt")) ?? null);
  }, []);

  // Loads profile + personnel id (cache-first, refreshed from the
  // network when available) for whichever user just became the active
  // session. Runs from both the initial-mount check and every
  // onAuthStateChange SIGNED_IN event — a fresh sign-in on /login and an
  // already-open tab picking up a restored session both need this, and
  // neither goes through the other's code path.
  const loadForUser = useCallback(async (userId: string) => {
    if (loadedForUserId.current === userId) return;
    loadedForUserId.current = userId;

    const cachedProfile = await getMeta(`profile:${userId}`);
    if (cachedProfile) setProfile(JSON.parse(cachedProfile) as Profile);
    const cachedPersonnelId = await getMeta("personnelId");
    if (cachedPersonnelId) setPersonnelId(cachedPersonnelId);

    if (navigator.onLine) {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (profileData) {
        setProfile(profileData);
        await setMeta(`profile:${userId}`, JSON.stringify(profileData));
      }
      const { data: personnel } = await supabase
        .from("personnel")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (personnel) {
        setPersonnelId(personnel.id);
        await setMeta("personnelId", personnel.id);
      }
      await refreshCache();
    }

    setLastSyncAt((await getMeta("lastSyncAt")) ?? null);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync]);

  // Periodic background sync — the practical substitute for the
  // Background Sync API, which Safari doesn't implement. A field user's
  // shift is hours long; a 60s poll is frequent enough that "reconnect"
  // feels immediate without being wasteful on a satellite link.
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) triggerSync();
    }, 60_000);
    return () => clearInterval(interval);
  }, [triggerSync]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
      if (currentSession) await loadForUser(currentSession.user.id);
      if (!mounted) return;
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadForUser(newSession.user.id);
      } else {
        loadedForUserId.current = null;
        setProfile(null);
        setPersonnelId(null);
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    if (navigator.onLine) await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, personnelId, isOnline, pendingCount, lastSyncAt, signOut, triggerSync }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
