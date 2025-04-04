// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
  ignores: [],
  languageOptions: {
    parserOptions: {
      project: ["./tsconfig.json"],
    },
  },
  extends: [eslint.configs.recommended, ...tseslint.configs.stylisticTypeChecked],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-inferrable-types": "off",
  },
});
