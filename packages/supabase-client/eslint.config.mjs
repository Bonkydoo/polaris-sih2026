import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Plain TS package, no React/Next here.
export default defineConfig([js.configs.recommended, ...tseslint.configs.recommended]);
