import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});
export default [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Vendored Plate adapters use polymorphic library types and HOC factories.
  {
    files: ["src/components/plate-ui/**", "src/components/editor/plugins/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/display-name": "warn",
    },
  },
];
