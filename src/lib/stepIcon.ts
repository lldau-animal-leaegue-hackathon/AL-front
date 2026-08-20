/**
 * 루틴 단계 이름 → Material Symbols 아이콘.
 *
 * 왜 매핑 테이블인가: 프롬프트 출력에는 아이콘 필드가 없고, `routine_name` 은
 * **자유 문자열**이다(열거형이 아니다). LLM 이 "1차 세안"·"이중 세안"·"클렌징(오일)"
 * 처럼 매번 다르게 쓸 수 있으므로 정확 일치로는 못 잡는다 → 부분 일치로 본다.
 *
 * ⚠️ **폴백이 핵심이다.** 못 찾았다고 아이콘 자리를 비우면 레이아웃이 흔들린다.
 */

/** 위에서부터 먼저 맞는 것을 쓴다 — 순서가 곧 우선순위다. */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // 선케어를 클렌징보다 먼저 본다("자외선 차단제"에 '차단'이 있어 다른 규칙과 겹치지 않게)
  [/자외선|선크림|선케어|썬크림|sun|spf/i, "wb_sunny"],
  [/클렌징|클렌저|세안|폼|오일/, "water_drop"],
  [/각질|필링|스크럽|필링/, "bubble_chart"],
  [/토너|스킨|미스트/, "opacity"],
  [/에센스|세럼|앰플|부스터/, "flare"],
  [/마스크|시트|팩/, "self_care"],
  [/아이|눈가/, "visibility"],
  [/립|입술/, "sentiment_satisfied"],
  [/크림|로션|보습|수분|모이스처/, "shield"],
  [/나이트|수면|자기 전/, "bedtime"],
];

/** 어떤 이름이 와도 아이콘 하나는 반드시 돌려준다. */
export function stepIcon(routineName: string): string {
  return RULES.find(([pattern]) => pattern.test(routineName))?.[1] ?? "spa";
}
