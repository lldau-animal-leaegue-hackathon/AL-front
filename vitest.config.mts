import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 테스트를 두 프로젝트로 나눈다 — 환경을 파일 확장자로 가른다.
 *
 * `.ts` 는 순수 로직(파서·정규화·DB 헬퍼)이라 jsdom 이 필요 없다. jsdom 은 파일마다
 * DOM 을 새로 세우므로 순수 로직에까지 켜면 그냥 느려지기만 한다.
 * `.tsx` 는 React 컴포넌트이므로 jsdom + Testing Library 셋업을 붙인다.
 *
 * Vitest 4 에서 `environmentMatchGlobs` 는 제거됐다. 대체재가 `projects` 다.
 */
export default defineConfig({
  resolve: {
    // tsconfig 의 paths 와 같은 매핑. 별도 플러그인을 두지 않고 한 줄로 맞춘다.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
