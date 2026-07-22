import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow `any` type — used pervasively in this project for JSON API responses
      "@typescript-eslint/no-explicit-any": "off",
      // Allow calling fetch/setState in useEffect — standard Next.js pattern
      "react-hooks/set-state-in-effect": "off",
      // Allow impure functions (Date.now, Math.random) during render
      "react-hooks/purity": "off",
      // Allow accessing refs during render for side-effect patterns
      "react-hooks/refs": "off",
      // Allow unescaped quotes in JSX
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
