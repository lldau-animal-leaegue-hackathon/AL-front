/**
 * 루틴의 시간대 표기와 소요 시간 파생.
 *
 * 옛 `routines.ts`(시드 데이터 + 레거시 타입)를 대체한다. 이름이
 * `src/lib/storage/routines.ts` 와 헷갈려 실제로 혼동을 만들었기 때문에
 * 시드를 지우면서 파일명도 바꿨다.
 */

import type { RoutineStep, RoutineTime } from "@/types/skincare";

export const TIME_LABEL: Record<RoutineTime, string> = {
  am: "아침",
  pm: "저녁",
};

export const TIME_ICON: Record<RoutineTime, string> = {
  am: "light_mode",
  pm: "dark_mode",
};

/**
 * 단계들의 총 소요 시간(분).
 *
 * 프롬프트의 `estimated_time` 은 **초 단위 정수**다(분이 아니다).
 * 합이 0이면 `null` — LLM 이 시간을 안 준 경우라 "약 0분"으로 표시하면 거짓말이 된다.
 */
export function totalMinutes(steps: readonly RoutineStep[]): number | null {
  const seconds = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
  if (seconds <= 0) return null;
  return Math.max(1, Math.round(seconds / 60));
}
