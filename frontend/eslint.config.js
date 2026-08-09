import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import {
  defineConfig,
  globalIgnores,
} from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "node_modules",
  ]),

  {
    files: ["**/*.{js,jsx}"],

    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      globals: globals.browser,

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      /*
       * React 19 ESLint rule.
       *
       * Existing app code uses effects that intentionally
       * trigger data loading / state synchronization.
       * We keep the app behavior unchanged and disable
       * this overly-strict rule for this project.
       */
      "react-hooks/set-state-in-effect": "off",

      /*
       * Context files often export both:
       * - Provider component
       * - custom hook
       *
       * This is valid for our project structure.
       */
      "react-refresh/only-export-components": "off",

      /*
       * Keep dependency checking enabled.
       * This is useful and should not be disabled.
       */
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);