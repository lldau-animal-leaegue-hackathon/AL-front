/**
 * 루틴 수행 기록.
 *
 * Q10 의 "이번 주 루틴 달성률"이 이 기록에서 계산된다 —
 * 기록이 곧 점수의 유일한 근거이므로, 수행을 끝낼 때 반드시 남겨야 한다.
 * 달성률 계산 자체는 화면 단(훅)의 몫이라 여기 두지 않는다.
 */

import type { RoutineRun } from "@/types/skincare";

import { load, newId, remove, save } from "./local";

/** `useStored` 로 같은 값을 구독하는 화면이 있어 키를 노출한다. */
export const RUNS_KEY = "runs";

const KEY = RUNS_KEY;
export const RUN_START_KEY = "run-start";

/** 진행 중 표시 — 수행 화면 첫 단계에 들어설 때 찍는다. */
export type RunStart = { routineId: string; startedAt: string };

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

/**
 * 수행 시작 시각을 찍는다(첫 단계 진입 시).
 *
 * 왜 저장이 필요한가: 완료 화면은 별도 라우트라 시작 시각을 메모리로 넘길 수 없다.
 * 다시 찍지 않는 이유는 사용자가 단계를 앞뒤로 오갈 수 있기 때문이다 —
 * **이미 같은 루틴이 진행 중이면 시작 시각을 유지**한다.
 */
export function markRunStart(routineId: string): void {
  const current = load<RunStart | null>(RUN_START_KEY, null);
  if (current?.routineId === routineId) return;

  save(RUN_START_KEY, {
    routineId,
    startedAt: new Date().toISOString(),
  } satisfies RunStart);
}

/**
 * 시작 시각을 읽는다. 없으면 `null` —
 * 중간 단계 URL 로 바로 들어온 경우라 시작 시각을 **지어내지 않는다.**
 */
export function readRunStart(routineId: string): string | null {
  const current = load<RunStart | null>(RUN_START_KEY, null);
  return current?.routineId === routineId ? current.startedAt : null;
}

/** 기록을 남긴 뒤 진행 중 표시를 지운다. */
export function clearRunStart(): boolean {
  return remove(RUN_START_KEY);
}
