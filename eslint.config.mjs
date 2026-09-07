import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "react",
            "react/*",
            "next",
            "next/*",
            "@/server/*",
            "@supabase/*",
            "stripe",
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", ".e2e/**", "coverage/**", "next-env.d.ts"]),
]);
