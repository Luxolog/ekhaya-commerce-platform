import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
    // Existing Supabase relation projections still need generated database
    // types. Keep explicit-any visible as warnings while CI checks runtime and
    // TypeScript correctness; tighten these as the schema types are generated.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];

export default eslintConfig;
