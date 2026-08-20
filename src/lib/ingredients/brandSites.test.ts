import { describe, expect, it } from "vitest";

import { splitIngredients } from "./brandSites";

/**
 * 전성분 문자열을 쪼개는 단 하나의 지점이다. 여기서 성분 하나가 잘못 갈라지면
 * 그 이름으로는 지식 테이블을 못 찾아 **충돌 경고가 조용히 사라진다** —
 * 화면에는 "안전합니다"만 남는다. 아래는 전부 실측에서 나왔던 입력이다.
 */

describe("splitIngredients", () => {
  it("괄호 안의 쉼표로는 자르지 않는다", () => {
    expect(
      splitIngredients("정제수, 나이아신아마이드(2%, 미백기능성), 글리세린"),
    ).toEqual(["정제수", "나이아신아마이드(2%, 미백기능성)", "글리세린"]);
  });

  it("숫자 사이 쉼표는 성분명의 일부다 (실측: 리더스에서 1 과 2-헥산다이올 로 쪼개짐)", () => {
    expect(
      splitIngredients("정제수, 1,2-헥산다이올, 1,3-부틸렌글라이콜"),
    ).toEqual(["정제수", "1,2-헥산다이올", "1,3-부틸렌글라이콜"]);
  });

  it("대괄호 안의 쉼표도 보호한다", () => {
    expect(
      splitIngredients("정제수, 향료[리모넨, 리날룰], 부틸렌글라이콜"),
    ).toEqual(["정제수", "부틸렌글라이콜"]);
    // ⚠️ 위 결과에 `향료[...]` 가 없는 것은 의도다 — 대괄호가 든 항목은 공정 머리표·
    //    안내 문구일 때가 많아 통째로 버린다. 쉼표로 쪼개져 파편이 남는 것보다 낫다.
  });

  it("괄호가 닫히지 않아도 뒤엣것을 통째로 삼키지 않는다", () => {
    // depth 가 음수로 내려가지 않게 잡아 둔 덕분에 복구된다.
    const result = splitIngredients("정제수, 글리세린), 판테놀");
    expect(result).toContain("판테놀");
  });

  it("안내 문구가 섞여 들어오면 성분으로 세지 않는다", () => {
    const result = splitIngredients(
      "정제수, 글리세린, 사용법: 적당량을 덜어 바릅니다, 판테놀",
    );
    expect(result).toEqual(["정제수", "글리세린", "판테놀"]);
  });

  it("빈 항목과 연속 쉼표를 흘리지 않는다", () => {
    expect(splitIngredients("정제수, , 글리세린,")).toEqual([
      "정제수",
      "글리세린",
    ]);
  });

  it("줄바꿈과 중복 공백을 한 칸으로 정리한다", () => {
    expect(splitIngredients("정제수,\n  소듐\t하이알루로네이트")).toEqual([
      "정제수",
      "소듐 하이알루로네이트",
    ]);
  });
});
