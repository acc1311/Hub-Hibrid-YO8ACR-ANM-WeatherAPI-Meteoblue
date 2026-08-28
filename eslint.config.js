import js from "@eslint/js";
export default [
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { window: "readonly", document: "readonly", console: "readonly", localStorage: "readonly", sessionStorage: "readonly", fetch: "readonly", caches: "readonly", self: "readonly", L: "readonly", AbortController: "readonly", AbortSignal: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly", URL: "readonly", URLSearchParams: "readonly", Response: "readonly", Request: "readonly", crypto: "readonly", TextEncoder: "readonly", btoa: "readonly", atob: "readonly", module: "readonly", process: "readonly" } },
    rules: { "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], "no-undef": "warn", "no-empty": ["error", { "allowEmptyCatch": true }], "no-control-regex": "warn" },
  },
  { ignores: ["icons/**"] }
];
