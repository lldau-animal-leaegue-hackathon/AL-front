"use client";

import { Icon } from "@/components/Icon";
import { useRuns } from "@/lib/data";
import type { RoutineRun } from "@/types/skincare";

import styles from "./WeekStrip.module.css";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * `upcoming` 은 "아직 안 온 날"과 "지났지만 안 한 날"을 함께 쓴다 — 둘 다 **완료 표시가
 * 없다**는 점에서 같고, 사용자는 날짜로 구분한다. 별도 상태를 만들 이유가 없다.
 */
type Day = {
  date: number;
  state: "done" | "today" | "upcoming";
  /** 요일 라벨 강조용. **완료 여부와 무관하다** — 오늘 루틴을 마쳐도 오늘은 오늘이다. */
  isToday: boolean;
};

/** 같은 날인가 — 기록은 ISO 문자열이라 로컬 시간대로 비교한다. */
function isSameDay(iso: string, day: Date): boolean {
  const at = new Date(iso);
  return (
    !Number.isNaN(at.getTime()) &&
    at.getFullYear() === day.getFullYear() &&
    at.getMonth() === day.getMonth() &&
    at.getDate() === day.getDate()
  );
}

/**
 * 이번 주 월요일부터 7일.
 *
 * ⚠️ **완료는 실제 수행 기록에서만 나온다.**
 * 예전에는 "오늘 이전은 완료로 본다"는 임시 규칙이었는데(백엔드가 없던 시절),
 * 그 결과 **아무것도 안 한 사용자에게도 지난 요일이 전부 체크로 보였다**(2026-08-18 실측).
 * 근거 없는 진행률을 지어내지 않는다는 원칙(Q10)을 정면으로 위배하는 자리였다.
 *
 * 주 프레임은 **기기 로컬 시간대** 기준이다 — 완료 판정(isSameDay)과
 * RoutineList 의 "오늘 완료"가 로컬로 비교하므로, 여기만 Asia/Seoul 로
 * 고정하면 해외 기기에서 체크가 다른 요일에 찍혔다(리뷰 m14).
 * 클라이언트 컴포넌트라 이 계산은 사용자 기기에서 돈다.
 */
function buildWeek(runs: readonly RoutineRun[]): Day[] {
  const today = new Date();
  // getDay()는 일요일이 0이라 월요일 시작으로 보정한다
  const offsetToMonday = (today.getDay() + 6) % 7;

  return DAY_LABELS.map((_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offsetToMonday + index,
    );

    const done = runs.some((run) => isSameDay(run.finishedAt, date));
    const isToday = index === offsetToMonday;

    return {
      date: date.getDate(),
      state: done ? "done" : isToday ? "today" : "upcoming",
      isToday,
    };
  });
}

export function WeekStrip() {
  /*
   * 기록을 못 불러와도 스트립은 그린다 — 날짜는 기록과 무관하게 맞고, 부가 정보 하나 때문에
   * 화면에 에러 카드를 하나 더 띄울 이유가 없다. 완료 표시만 비어 있게 된다.
   * (연결 실패는 같은 화면의 루틴 목록이 이미 알린다.)
   */
  const { value: runs } = useRuns();
  const week = buildWeek(runs);

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>이번 주 진행 상황</h2>

      <ol className={styles.days}>
        {week.map((day, index) => (
          <li key={index} className={styles.day}>
            <span
              className={`${styles.label} ${day.isToday ? styles.labelToday : ""}`}
            >
              {DAY_LABELS[index]}
            </span>
            <span className={`${styles.marker} ${styles[day.state]}`}>
              {day.state === "done" ? (
                <Icon name="check" size="sm" />
              ) : (
                day.date
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
