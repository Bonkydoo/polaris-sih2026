import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@polaris/supabase-client";

const PUBLIC_PATHS = ["/login", "/proto"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth session on every request (required by the
 * SSR cookie-based auth flow — without this, sessions silently expire
 * mid-visit) and redirects unauthenticated requests away from protected
 * routes. This is UX convenience only — the real access boundary is RLS
 * at the database, not this check.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const setAll: SetAllCookies = (cookiesToSet) => {
    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
    response = NextResponse.next({ request });
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
