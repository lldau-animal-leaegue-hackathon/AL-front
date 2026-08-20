/**
 * 루틴의 성격 — `Routine.condition` 에 들어가는 값.
 *
 * ⭐ **표시용 라벨이 아니라 저장 단위다.** `PUT /api/routines` 가 이 값 단위로 교체하므로
 *    기본 루틴을 다시 만들어도 고민 집중 루틴은 그대로 남는다.
 *
 * 고민 문장을 그대로 넣지 않는 이유가 둘 있다:
 *  1. 고민을 고칠 때마다 새 조건이 생겨 **낡은 루틴이 계속 쌓인다** — 지울 방법도 없다.
 *  2. `LIMITS.condition` 이 60자다. 넘으면 서버가 그 루틴을 거부한다.
 *
 * 고민 내용은 `condition` 이 아니라 프로필(`skin_profiles.wonder`)이 들고 있다.
 */
export const ROUTINE_CONDITION = {
  /** 기본 루틴. 기존 데이터·서버 기본값이 전부 이 값이라 바꾸지 않는다. */
  basic: "평소",
  /** ⚠️ 저장값은 유지 — 화면 표시는 "기타 루틴"이다(사용자 피드백 2026-08-20, `conditionLabel`). */
  focus: "고민 집중",
} as const;

/**
 * 화면 표시용 라벨. "고민 집중 케어" → "기타 루틴" 개명은 표시만 바꾼다 —
 * 저장값을 바꾸면 기존 사용자의 루틴이 어느 그룹에도 안 잡힌다.
 */
export function conditionLabel(condition: string): string {
  return condition === ROUTINE_CONDITION.focus ? "기타 루틴" : condition;
}

export type RoutineCondition =
  (typeof ROUTINE_CONDITION)[keyof typeof ROUTINE_CONDITION];

/**
 * 고민 집중 루틴인가.
 *
 * 기본 쪽을 `=== "평소"` 로 판정하지 않는다 — localStorage 에서 옮겨온 데이터에
 * 다른 조건이 들어 있을 수 있고, 그것들이 어느 그룹에도 안 뜨면 사라진 것처럼 보인다.
 */
export function isFocusRoutine(condition: string): boolean {
  return condition === ROUTINE_CONDITION.focus;
}
