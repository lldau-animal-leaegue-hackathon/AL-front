"use client";

import { Icon } from "@/components/Icon";
import { weeklyAchievement } from "@/lib/achievement";
import { RUNS_KEY } from "@/lib/storage/history";
import { ROUTINES_KEY } from "@/lib/storage/routines";
import { useStored } from "@/lib/storage/useStored";
import type { Routine, RoutineRun } from "@/types/skincare";

import card from "../../(home)/components/card.module.css";
import { EmptyState } from "./EmptyState";
import styles from "./RecordsSection.module.css";

const NO_ROUTINES: Routine[] = [];
const NO_RUNS: RoutineRun[] = [];

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * 수행 기록 — `RoutineRun[]` + `weeklyAchievement()`(Q10).
 *
 * 루틴·기록 두 저장소를 함께 읽는다: 달성률 계산에 `routines`(예정 단계 수)가
 * 필요하고, 각 기록에 루틴 이름을 붙이려면 `routineId` 로 찾아야 한다.
 */
export function RecordsSection() {
  const { ready: routinesReady, value: routines } = useStored<Routine[]>(
    ROUTINES_KEY,
    NO_ROUTINES,
  );
  const { ready: runsReady, value: runs } = useStored<RoutineRun[]>(
    RUNS_KEY,
    NO_RUNS,
  );

  if (!routinesReady || !runsReady) return null;

  if (routines.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="아직 기록이 없어요"
        text="루틴을 만들고 수행하면 여기에서 기록과 달성률을 볼 수 있어요."
        ctaHref="/routine/new"
        ctaLabel="루틴 만들기"
      />
    );
  }

  // 기록 0개를 0%로 보여주면 실패처럼 보인다 — "아직 안 함"과 "0%"는 다르다.
  if (runs.length === 0) {
    return (
      <EmptyState
        icon="play_circle"
        title="첫 루틴을 시작해 보세요"
        text="루틴을 수행하고 나면 여기에서 기록과 달성률을 볼 수 있어요."
        ctaHref="/routine"
        ctaLabel="루틴 보러 가기"
      />
    );
  }

  const achievement = weeklyAchievement(runs, routines);
  // listRuns() 는 오래된 것부터 저장돼 있다 — 최근 수행이 먼저 보이게 뒤집는다.
  const recent = [...runs].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
  );

  return (
    <div className={styles.wrap}>
      <div className={`${card.card} ${styles.achievement}`}>
        <div>
          <p className={`${card.label} ${styles.achievementLabel}`}>
            이번 주 달성률
          </p>
          <p className={styles.achievementValue}>
            {achievement.percent === null
              ? "계산할 수 없음"
              : `${achievement.percent}%`}
          </p>
        </div>

        <p className={`${card.label} ${styles.delta}`}>
          {/* delta === null 은 "지난주 기록 없음"이지 "변화 없음(0)"이 아니다 */}
          {achievement.delta === null ? (
            "지난주 기록 없음"
          ) : (
            <>
              <Icon
                name={achievement.delta >= 0 ? "trending_up" : "trending_down"}
                size="sm"
              />
              지난주 대비 {achievement.delta > 0 ? "+" : ""}
              {achievement.delta}%p
            </>
          )}
        </p>
      </div>

      <ul className={styles.list}>
        {recent.map((run) => {
          const routine = routines.find((item) => item.id === run.routineId);
          const finished = new Date(run.finishedAt);
          const validDate = !Number.isNaN(finished.getTime());

          return (
            <li key={run.id} className={`${card.card} ${styles.entry}`}>
              <span className={styles.entryIcon}>
                <Icon name="task_alt" filled />
              </span>
              <div className={styles.entryBody}>
                {/*
                  루틴을 다시 만들면 id 가 바뀌어 못 찾을 수 있다. 기록을 숨기면
                  달성률과 어긋나 보이므로 "삭제된 루틴"으로 남긴다.
                */}
                <p className={styles.entryName}>
                  {routine?.name ?? "삭제된 루틴"}
                </p>
                <p className={`${card.label} ${styles.entryMeta}`}>
                  {validDate ? dateFormatter.format(finished) : "날짜 미상"} ·{" "}
                  {run.completedStepIds.length}단계 완료
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
