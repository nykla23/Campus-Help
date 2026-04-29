const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  // 顶层忽略（对所有配置生效）
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "**/miniprogram_npm/**",
      "frontend/miniprogram/config/**",
      "backend/uploads/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        require: "readonly",
        module: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        global: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-constant-condition": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["backend/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["frontend/miniprogram/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        App: "readonly",
        Page: "readonly",
        Component: "readonly",
        getApp: "readonly",
        getCurrentPages: "readonly",
        wx: "readonly",
      },
    },
  },
);
