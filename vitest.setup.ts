import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `globals: false` 라 Testing Library 의 자동 cleanup 이 걸리지 않는다.
// 안 지우면 앞 테스트의 DOM 이 남아 `getByRole` 이 중복으로 걸린다.
afterEach(cleanup);

// jsdom 에는 matchMedia 가 없다. TopAppBar 가 테마 판별에 쓰므로 스텁이 없으면
// 그 컴포넌트를 포함한 모든 렌더가 TypeError 로 죽는다. (ResizeObserver 는
// 이 레포에서 쓰는 곳이 없어 넣지 않았다 — 쓰게 되면 여기에 같은 식으로 추가한다.)
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
