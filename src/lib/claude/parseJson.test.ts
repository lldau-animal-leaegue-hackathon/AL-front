import { describe, expect, it } from "vitest";

import { isStringArray, parseJsonObject } from "./parseJson";

describe("parseJsonObject", () => {
  it("코드펜스와 설명 문장이 섞여 있어도 JSON 객체만 뽑는다", () => {
    const text = '알겠습니다!\n```json\n{"a": 1}\n```\n도움이 되었길 바랍니다.';
    expect(parseJsonObject(text)).toEqual({ a: 1 });
  });

  it("JSON 객체가 없으면 조용히 넘기지 않고 throw 한다", () => {
    expect(() => parseJsonObject("죄송하지만 답할 수 없습니다")).toThrow();
  });
});

describe("isStringArray", () => {
  it("문자열 배열만 통과시킨다", () => {
    expect(isStringArray(["a", "b"])).toBe(true);
    expect(isStringArray(["a", 1])).toBe(false);
    expect(isStringArray("a")).toBe(false);
  });
});
