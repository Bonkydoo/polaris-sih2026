import { createClient } from "@supabase/supabase-js";
import type { Database } from "@polaris/supabase-client";

// Plain supabase-js, not @polaris/supabase-client's SSR-oriented browser
// client — this app has no server half at all (see next.config.ts), so
// there's nothing for a cookie-based session to sync with. Default
// localStorage session persistence is the right call here: it's what
// survives an offline reload of an installed PWA.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
