import { describe, expect, it } from "vitest";

import { shelfFingerprint } from "./shelfFingerprint";

/**
 * 이 지문이 선반 분석 캐시의 무효화 키다. 두 방향으로 다 틀릴 수 있다 —
 * 안 바뀌었는데 바뀌면 AI 를 매번 다시 부르고(비용), 바뀌었는데 그대로면
 * **옛 분석 결과를 새 선반의 것인 양 보여 준다**(신뢰).
 */

describe("shelfFingerprint", () => {
  it("입력 순서가 달라도 같은 지문이다", () => {
    const a = shelfFingerprint([
      { id: "p1", ingredients: ["정제수"] },
      { id: "p2", ingredients: ["글리세린"] },
    ]);
    const b = shelfFingerprint([
      { id: "p2", ingredients: ["글리세린"] },
      { id: "p1", ingredients: ["정제수"] },
    ]);
    expect(a).toBe(b);
  });

  it("제품이 추가되면 지문이 바뀐다", () => {
    const before = shelfFingerprint([{ id: "p1", ingredients: ["정제수"] }]);
    const after = shelfFingerprint([
      { id: "p1", ingredients: ["정제수"] },
      { id: "p2", ingredients: ["글리세린"] },
    ]);
    expect(after).not.toBe(before);
  });

  it("성분이 재추출되면 지문이 바뀐다", () => {
    const before = shelfFingerprint([{ id: "p1", ingredients: ["정제수"] }]);
    const after = shelfFingerprint([
      { id: "p1", ingredients: ["정제수", "레티놀"] },
    ]);
    expect(after).not.toBe(before);
  });

  it("성분 순서도 내용의 일부다", () => {
    // 배합 순서가 곧 함량 순서라 뒤바뀌면 다른 제품이다.
    const a = shelfFingerprint([
      { id: "p1", ingredients: ["정제수", "레티놀"] },
    ]);
    const b = shelfFingerprint([
      { id: "p1", ingredients: ["레티놀", "정제수"] },
    ]);
    expect(a).not.toBe(b);
  });

  it("빈 선반도 지문을 낸다", () => {
    expect(shelfFingerprint([])).toMatch(/^[0-9a-f]{64}$/);
  });
});
