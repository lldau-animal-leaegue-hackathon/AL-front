/**
 * 수행 중 표시 — **localStorage 에 남는 유일한 도메인 데이터**다.
 *
 * 수행 기록 자체는 서버로 옮겼다(`src/lib/data.ts` 의 `useRuns`·`appendRun`).
 * 하지만 "지금 어느 루틴을 하는 중인가"는 **기기별 임시 상태**라 서버에 테이블이 없고,
 * 다른 기기에서 이어서 하기를 지원하지도 않으므로 옮길 이유가 없다.
 */

import { load, remove, save } from "./local";

/** `useStored` 로 같은 값을 구독하는 화면이 있어 키를 노출한다. */
export const RUN_START_KEY = "run-start";

/** 진행 중 표시 — 수행 화면 첫 단계에 들어설 때 찍는다. */
export type RunStart = { routineId: string; startedAt: string };

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
 * 기록을 남긴 뒤 진행 중 표시를 지운다.
 *
 * ⚠️ 완료 화면은 이 표시를 **소비하면서** 기록한다 — 서버 저장이 성공했을 때만 지운다.
 * 실패하면 표시가 남아 다음 진입 때 자동으로 재시도된다.
 */
export function clearRunStart(): boolean {
  return remove(RUN_START_KEY);
}
