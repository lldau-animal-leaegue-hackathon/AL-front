import { describe, expect, it } from "vitest";

import { ingredientAliases, sameIngredient } from "./ingredientNames";

/**
 * 지식 테이블("비타민씨(아스코빅애씨드)")과 제품 성분("아스코빅애씨드")을 잇는 다리다.
 * 여기서 못 이으면 상성 경고가 조용히 안 뜬다 — 화면에는 아무 오류도 안 보인다.
 */

describe("ingredientAliases", () => {
  it("괄호 안 표기를 별칭으로 펼친다", () => {
    expect(ingredientAliases("비타민씨(아스코빅애씨드)")).toEqual([
      "비타민씨(아스코빅애씨드)",
      "비타민씨",
      "아스코빅애씨드",
    ]);
  });

  it("괄호 안이 여러 개면 각각 별칭이다", () => {
    expect(ingredientAliases("클레이(카올린·벤토나이트)")).toContain(
      "벤토나이트",
    );
  });

  it("빈 문자열은 별칭이 없다", () => {
    expect(ingredientAliases("   ")).toEqual([]);
  });
});

describe("sameIngredient", () => {
  it("표기가 흔들려도 같은 성분으로 본다", () => {
    expect(sameIngredient("센텔라아시아티카(병풀추출물)", "병풀추출물")).toBe(
      true,
    );
    expect(sameIngredient("판테놀", "디판테놀")).toBe(true);
  });

  it("다른 성분을 같다고 하지 않는다", () => {
    expect(sameIngredient("레티놀", "나이아신아마이드")).toBe(false);
  });

  it("한 글자 겹침만으로는 같다고 하지 않는다", () => {
    // 포함 매칭 하한이 2자다. 1자까지 열면 거의 모든 한글 성분이 서로 매칭된다.
    expect(sameIngredient("수", "정제수")).toBe(false);
  });
});
