import { describe, expect, it } from "vitest";

import { weeklyAchievement } from "./achievement";
import type { Routine, RoutineRun } from "@/types/skincare";

/**
 * 이 파일이 지키는 것은 "계산이 맞는가"보다 **과거에 실제로 났던 사고가 다시 나지 않는가**다.
 * 각 테스트 이름 뒤의 괄호가 그 사고 번호다.
 */

/** 단계 n개짜리 루틴 하나. 분모(예정 단계 수) 계산의 입력이다. */
function routine(id: string, stepCount: number): Routine {
  return {
    id,
    name: `${id} 루틴`,
    condition: "",
    time: "am",
    summary: "",
    steps: Array.from({ length: stepCount }, (_, i) => ({
      id: `${id}-s${i}`,
      routineName: `단계 ${i}`,
      estimatedTime: 60,
      usingProduct: [],
      howToUse: [],
      tips: [],
      warning: [],
    })),
  };
}

function run(routineId: string, finishedAt: Date, steps: number): RoutineRun {
  return {
    id: `run-${finishedAt.getTime()}-${routineId}`,
    routineId,
    startedAt: finishedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    completedStepIds: Array.from(
      { length: steps },
      (_, i) => `${routineId}-s${i}`,
    ),
  };
}

// 2026-08-19 는 수요일 — 주(월요일 시작)의 3일째다.
const WEDNESDAY = new Date(2026, 7, 19, 21, 0, 0);
const MONDAY = new Date(2026, 7, 17, 8, 0, 0);

describe("weeklyAchievement", () => {
  it("분모는 주 전체가 아니라 경과 일수로 센다 (m7: 주 초 허위 하락)", () => {
    // 수요일이므로 월·화·수 3일치만 예정으로 잡혀야 한다. 7일치로 잡으면
    // 아직 오지 않은 목~일을 미완료로 세어 주 초마다 달성률이 거짓으로 낮아진다.
    const result = weeklyAchievement(
      [run("r1", MONDAY, 4)],
      [routine("r1", 4)],
      WEDNESDAY,
    );
    expect(result.planned).toBe(12); // 4단계 × 3일
    expect(result.percent).toBe(33); // 4/12
  });

  it("지난주 기록이 없으면 delta 를 0 이 아니라 null 로 둔다", () => {
    // 0 으로 채우면 "변화 없음"이라는 거짓말이 된다 — 화면이 '기록 없음'과 구분해야 한다.
    const result = weeklyAchievement(
      [run("r1", MONDAY, 4)],
      [routine("r1", 4)],
      WEDNESDAY,
    );
    expect(result.delta).toBeNull();
  });

  it("지난주 기록이 있으면 %p 차이를 낸다", () => {
    const lastWeek = new Date(2026, 7, 12, 9, 0, 0); // 지난주 수요일
    const result = weeklyAchievement(
      [run("r1", MONDAY, 3), run("r1", lastWeek, 7)],
      [routine("r1", 4)],
      WEDNESDAY,
    );
    // 이번주 3/12 = 25%, 지난주는 분모가 7일 전체라 7/28 = 25%
    expect(result.percent).toBe(25);
    expect(result.delta).toBe(0);
  });

  it("삭제된 루틴의 고아 기록은 분자에서 뺀다 (N3: 안 한 루틴이 100% 로 보이던 문제)", () => {
    // '기타' 루틴만 수행하고 그 루틴을 지우면, 남은 '기본' 루틴 기준으로
    // 100% 가 되던 사고. 분모가 현재 루틴 기준이므로 분자도 현재 루틴만 센다.
    const result = weeklyAchievement(
      [run("삭제된-루틴", MONDAY, 4)],
      [routine("남은-루틴", 4)],
      WEDNESDAY,
    );
    expect(result.done).toBe(0);
    expect(result.hasRuns).toBe(false);
  });

  it("하루에 여러 번 해도 100% 를 넘지 않는다", () => {
    const result = weeklyAchievement(
      [run("r1", MONDAY, 4), run("r1", WEDNESDAY, 40)],
      [routine("r1", 4)],
      WEDNESDAY,
    );
    expect(result.percent).toBe(100);
  });

  it("루틴이 하나도 없으면 percent 는 0 이 아니라 null 이다", () => {
    // 분모 0 은 "0% 달성"이 아니라 "계산 불가"다. 근거 없는 숫자를 띄우지 않는다.
    const result = weeklyAchievement([], [], WEDNESDAY);
    expect(result.percent).toBeNull();
    expect(result.delta).toBeNull();
  });

  it("finishedAt 이 깨진 기록은 세지 않는다", () => {
    const broken: RoutineRun = {
      ...run("r1", MONDAY, 4),
      finishedAt: "언젠가",
    };
    const result = weeklyAchievement([broken], [routine("r1", 4)], WEDNESDAY);
    expect(result.done).toBe(0);
  });
});
