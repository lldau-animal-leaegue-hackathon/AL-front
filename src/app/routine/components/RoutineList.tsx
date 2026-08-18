"use client";

import Link from "next/link";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useRoutines, useRuns } from "@/lib/data";

import { RoutineCard } from "./RoutineCard";
import styles from "./RoutineList.module.css";

/** 같은 날짜인가 — 기록은 ISO 문자열이라 로컬 시간대로 비교한다. */
function isToday(iso: string, today: Date): boolean {
  const at = new Date(iso);
  return (
    !Number.isNaN(at.getTime()) &&
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate()
  );
}

/**
 * 저장된 루틴 목록.
 *
 * 루틴이 localStorage 로 옮겨가면서 이 조각만 클라이언트가 된다 —
 * 페이지(`page.tsx`)와 `TopAppBar`·`WeekStrip` 은 서버 컴포넌트로 남는다.
 */
export function RoutineList() {
  const routinesRes = useRoutines();
  const runsRes = useRuns();

  // "오늘 완료" 표시가 기록에서 나오므로 둘 다 있어야 한 번에 정확히 그린다.
  if (!routinesRes.ready || !runsRes.ready)
    return <DataState loading label="루틴" />;

  if (routinesRes.error || runsRes.error)
    return (
      <DataState
        error
        label="루틴"
        onRetry={() => {
          routinesRes.retry();
          runsRes.retry();
        }}
      />
    );

  const routines = routinesRes.value;
  const runs = runsRes.value;

  /*
   * "오늘 완료"는 **수행 기록에서 파생**한다(Step 7).
   * 예전에는 카드마다 로컬 state 로 토글했는데, 새로고침하면 풀리는 가짜 상태였고
   * 주간 달성률과도 어긋났다. 기록을 단일 출처로 삼으면 둘이 항상 일치한다.
   */
  const today = new Date();
  const doneToday = new Set(
    runs
      .filter((run) => isToday(run.finishedAt, today))
      .map((run) => run.routineId),
  );

  if (routines.length === 0) {
    return (
      <section className={styles.empty} role="status">
        <Icon name="auto_awesome" filled className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>아직 루틴이 없어요</h2>
        <p className={styles.emptyText}>
          피부 고민과 쓸 수 있는 시간을 알려 주면, 등록한 제품으로 아침·저녁
          루틴을 만들어 드려요.
        </p>
        <Link className={styles.emptyCta} href="/routine/new">
          <Icon name="add_circle" filled size="sm" />
          루틴 만들기
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h2 className={styles.heading}>내 루틴 {routines.length}개</h2>
      <p className={styles.lead}>
        카드를 펼치면 단계를 볼 수 있어요. 다시 만들면 기존 루틴은 교체됩니다.
      </p>

      <ul className={styles.list}>
        {routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            done={doneToday.has(routine.id)}
          />
        ))}
      </ul>

      <Link className={styles.regenerate} href="/routine/new">
        <Icon name="refresh" size="sm" />
        루틴 다시 만들기
      </Link>
    </section>
  );
}
