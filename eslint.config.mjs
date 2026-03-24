import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "ghost/dist/**",
      "ghost/node_modules/**",
      "node_modules/**",
      "data/**"
    ]
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@next/next/no-page-custom-font": "off"
    }
  }
];

export default eslintConfig;
