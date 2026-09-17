import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export — no server at all. This is the whole point of
  // an offline-first PWA: the app shell (including the login screen)
  // must load from the service worker cache with zero network, which
  // rules out Server Components fetching data, Route Handlers, and
  // Middleware. Every data access below is client-side, through the
  // browser Supabase client + the Dexie cache in lib/db.ts.
  output: "export",
  transpilePackages: ["@polaris/ui"],
  images: { unoptimized: true },
};

export default nextConfig;
