/**
 * 루틴 수행 기록.
 *
 * Q10 의 "이번 주 루틴 달성률"이 이 기록에서 계산된다 —
 * 기록이 곧 점수의 유일한 근거이므로, 수행을 끝낼 때 반드시 남겨야 한다.
 * 달성률 계산 자체는 화면 단(훅)의 몫이라 여기 두지 않는다.
 */

import type { RoutineRun } from "@/types/skincare";

import { load, newId, save } from "./local";

const KEY = "runs";

/** 저장된 순서(오래된 것부터) 그대로 반환한다. 정렬은 호출부에서. */
export function listRuns(): RoutineRun[] {
  return load<RoutineRun[]>(KEY, []);
}

/**
 * 수행 1회를 기록한다. 실패하면 `null` —
 * 기록이 없으면 달성률이 조용히 낮아지므로 화면에서 실패를 알려야 한다.
 */
export function appendRun(input: Omit<RoutineRun, "id">): RoutineRun | null {
  const run: RoutineRun = { ...input, id: newId() };

  return save(KEY, [...listRuns(), run]) ? run : null;
}
