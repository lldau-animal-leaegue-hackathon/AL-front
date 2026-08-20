/**
 * 주간 루틴 달성률 (Q10).
 *
 * `SkinHealthCard` 는 원래 "피부 건강 점수"였지만 **산출 근거가 없었다.**
 * 그래서 이름과 내용을 맞춰 **수행 기록에서 계산되는 달성률**로 바꿨다.
 *
 *   달성률 = 이번 주 완료 단계 수 ÷ 이번 주 예정 단계 수 × 100
 *   주간 변화 = 이번 주 − 지난주 (%p)
 *
 * 순수 함수로 둔 이유: 홈과 프로필이 같은 숫자를 써야 하는데, 각자 계산하면
 * 두 화면이 다른 값을 보여 주는 사고가 난다. React 에 의존하지 않아 검증도 쉽다.
 */

import type { Routine, RoutineRun } from "@/types/skincare";

export type Achievement = {
  /** 이번 주 완료 단계 수 */
  done: number;
  /** 이번 주 예정 단계 수 (저장된 루틴을 매일 1회씩 한다고 볼 때) */
  planned: number;
  /** 0~100. 예정이 0이면 계산 불가라 null */
  percent: number | null;
  /** 지난주 대비 %p. 지난주 기록이 없으면 null (0으로 쓰면 "변화 없음"이라는 거짓말이 된다) */
  delta: number | null;
  /** 이번 주에 기록이 하나라도 있는가 — 첫 주 빈 상태 판단용 */
  hasRuns: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** 이번 주 월요일 00:00. 한국에서 주는 월요일에 시작한다. */
function startOfWeek(now: Date): number {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay(): 0=일요일 → 월요일 기준으로 옮기면 일요일은 6일 전이다.
  const offset = (date.getDay() + 6) % 7;
  return date.getTime() - offset * DAY_MS;
}

function countSteps(runs: readonly RoutineRun[], from: number, to: number) {
  return runs.reduce((sum, run) => {
    const at = new Date(run.finishedAt).getTime();
    if (Number.isNaN(at) || at < from || at >= to) return sum;
    return sum + run.completedStepIds.length;
  }, 0);
}

/** 저장된 루틴을 **매일 1회씩** 수행한다고 볼 때 한 주 예정 단계 수. */
function plannedPerWeek(routines: readonly Routine[]): number {
  const perDay = routines.reduce(
    (sum, routine) => sum + routine.steps.length,
    0,
  );
  return perDay * 7;
}

export function weeklyAchievement(
  runs: readonly RoutineRun[],
  routines: readonly Routine[],
  now: Date = new Date(),
): Achievement {
  const thisWeek = startOfWeek(now);
  const lastWeek = thisWeek - WEEK_MS;
  const planned = plannedPerWeek(routines);

  /*
   * 분모(예정)가 현재 루틴 기준이므로 분자(완료)도 현재 루틴의 수행만 센다 —
   * 세트 삭제로 고아가 된 기록이 달성률을 부풀리지 않게 한다(재검토 N3:
   * 기타만 수행 후 기타 삭제 → 안 한 기본 루틴 기준 100%가 되던 문제).
   * 부작용: 루틴을 다시 만들면 id 가 바뀌어 그 주 달성률이 리셋된다 —
   * 바뀐 예정표에 옛 수행을 섞어 세는 것보다 정직하다.
   */
  const ids = new Set(routines.map((routine) => routine.id));
  const owned = runs.filter((run) => ids.has(run.routineId));

  const done = countSteps(owned, thisWeek, thisWeek + WEEK_MS);
  const lastDone = countSteps(owned, lastWeek, thisWeek);

  // 하루에 여러 번 해도 100%를 넘지 않게 자른다 — 101% 는 지표로 의미가 없다.
  const percent =
    planned === 0 ? null : Math.min(100, Math.round((done / planned) * 100));

  // 델타도 같은 분자 기준(owned)으로 판단해야 주간 비교가 성립한다.
  const hadLastWeek = owned.some((run) => {
    const at = new Date(run.finishedAt).getTime();
    return !Number.isNaN(at) && at >= lastWeek && at < thisWeek;
  });
  const lastPercent =
    planned === 0
      ? null
      : Math.min(100, Math.round((lastDone / planned) * 100));

  return {
    done,
    planned,
    percent,
    delta:
      percent === null || lastPercent === null || !hadLastWeek
        ? null
        : percent - lastPercent,
    hasRuns: done > 0,
  };
}
