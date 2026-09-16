import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// Internal package, not a Next.js app — just the TS/React rule set, no
// core-web-vitals (those are Next-routing-specific and don't apply here).
export default defineConfig([...nextTs]);
