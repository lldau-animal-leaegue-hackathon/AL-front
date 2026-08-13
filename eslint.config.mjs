import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // 안 쓰는 변수는 에러. 단 `_` 로 시작하면 "일부러 안 쓴 것"으로 보고 통과시킴
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // console.log 는 커밋 전에 지우도록 경고. warn/error 는 허용
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Prettier 와 겹치는 포맷팅 규칙을 끕니다. 반드시 마지막에 위치해야 합니다.
  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
