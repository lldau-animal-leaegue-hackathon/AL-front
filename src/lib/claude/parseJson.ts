/**
 * 모델 응답 문자열에서 JSON 객체만 뽑아낸다 — **서버 전용**.
 *
 * 프롬프트가 "코드블록 표시(```) 를 포함하지 마세요"라고 못박아도 모델은 종종 펜스나
 * 설명 문장을 붙인다. 첫 `{` 부터 마지막 `}` 까지 잘라 파싱하면 둘 다 무시된다
 * (WatchList `claude_runner.py` 의 `parse_json_obj` 와 같은 전략).
 *
 * 실패를 빈 객체로 뭉개지 않고 throw 한다 — 조용히 넘기면 프롬프트가 망가진 걸 영영 모른다.
 */
export function parseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `응답에서 JSON 객체를 찾지 못했습니다: ${text.slice(0, 300)}`,
    );
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON 파싱 실패(${reason}): ${text.slice(0, 300)}`);
  }
}

/** 값이 문자열 배열인지. LLM 출력은 계약을 보장하지 않으므로 매번 확인한다. */
export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
