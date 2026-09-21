import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Orval codegen output — never edited by hand (PLAN-0002):
    "src/lib/api/generated/**",
    // Permission catalog codegen — never edited by hand (PLAN-0014):
    "src/lib/permission-codes.generated.ts",
  ]),
]);

export default eslintConfig;
