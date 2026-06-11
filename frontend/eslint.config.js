import js from "@eslint/js";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin"; // Importeer de stijl-plugin

const defaultIndent = 4;

export default defineConfig([
  js.configs.recommended,

  ...pluginVue.configs["flat/essential"],

  {
    files: ["**/*.{js,mjs,cjs,vue}"],
    plugins: {
      stylistic,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // --- Kwaliteitsregels ---
      "no-magic-numbers": ["warn", { "ignore": [0, 1, -1] }], // Waarschuwing bij losse getallen (behalve 0, 1 en -1)
      "eqeqeq": ["error", "always"],                       // Verplicht === en !== in plaats van == en !=
      "no-var": "error",                                   // Verbiedt het gebruik van 'var' (gebruik let of const)
      "prefer-const": "error",                             // Verplicht 'const' als een variabele nooit verandert
      "no-duplicate-imports": "error",                     // Verbiedt dubbele imports uit hetzelfde bestand

      // --- Stylistic (stijl) regels ---
      "stylistic/indent": ["error", defaultIndent],        // Verplicht een inspringing van 4 spaties
      "stylistic/no-multiple-empty-lines": ["error", { "max": 1 }], // Maximaal 1 lege regel achter elkaar
      "stylistic/semi": ["error", "always"],               // Verplicht altijd een puntkomma aan het einde van de regel
    },
  },
]);