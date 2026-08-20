import { describe, expect, it } from "vitest";

import { stepIcon } from "./stepIcon";

/**
 * `routine_name` 은 LLM 이 만드는 **자유 문자열**이다. 아이콘 자리가 비면
 * 수행 화면 레이아웃이 흔들리므로 "무엇이 와도 하나는 준다"가 계약이다.
 */

describe("stepIcon", () => {
  it("모르는 이름에도 폴백 아이콘을 준다", () => {
    expect(stepIcon("두피 마사지")).toBe("spa");
    expect(stepIcon("")).toBe("spa");
  });

  it("선케어를 클렌징보다 먼저 본다", () => {
    // "자외선 차단제(오일 타입)" 은 선케어·클렌징 두 규칙에 다 걸린다 —
    // 규칙 순서가 결과를 가르므로 순서를 바꾸면 여기서 깨진다.
    expect(stepIcon("자외선 차단제(오일 타입)")).toBe("wb_sunny");
  });

  it("LLM 이 이름을 바꿔 써도 부분 일치로 잡는다", () => {
    expect(stepIcon("1차 클렌징(오일)")).toBe("water_drop");
    expect(stepIcon("이중 세안")).toBe("water_drop");
    expect(stepIcon("수분 앰플 흡수시키기")).toBe("flare");
  });
});
