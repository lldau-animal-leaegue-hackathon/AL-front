"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Icon } from "@/components/Icon";
import {
  appendRun,
  clearRunStart,
  RUN_START_KEY,
  type RunStart,
} from "@/lib/storage/history";
import { ROUTINES_KEY } from "@/lib/storage/routines";
import { useStored } from "@/lib/storage/useStored";
import type { Routine } from "@/types/skincare";

import { TIME_LABEL, totalMinutes } from "../routineTime";
import styles from "./RoutineDone.module.css";

const NO_ROUTINES: Routine[] = [];
const NO_START: RunStart | null = null;

/**
 * 루틴 완료 화면 — 수행 기록을 남긴다.
 *
 * **이중 기록 방지**: 기록은 "시작 표시"(`markRunStart`)를 **소비**하면서 남긴다.
 * 새로고침하면 시작 표시가 이미 지워져 있어 두 번 기록되지 않는다.
 * 별도 플래그나 ref 가드보다 단순하고, StrictMode 의 effect 이중 실행에도 안전하다.
 *
 * ⚠️ **알려진 한계 2가지**
 * 1. `completedStepIds` 에 루틴의 **모든 단계**를 넣는다. "건너뛰기"로 지나친 단계를
 *    구분하려면 단계마다 진행 상태를 저장해야 하는데 이번 범위에서는 하지 않았다.
 *    주간 달성률(Q10)은 "루틴을 했는가" 단위로는 정확하고, 루틴 안에서 몇 단계를
 *    건너뛰었는지는 반영하지 못한다.
 * 2. 저장 실패(용량 초과)를 화면에 띄우지 않는다 — `save()` 가 콘솔에 남긴다.
 *    제품 등록과 달리 **사용자가 입력한 내용이 날아가는 게 아니라서** 화면을 막을
 *    이유가 없다고 봤다. 실패하면 시작 표시가 남아 다음 진입 때 자동으로 재시도된다.
 */
export function RoutineDone({ routineId }: { routineId: string }) {
  const { ready, value: routines } = useStored<Routine[]>(
    ROUTINES_KEY,
    NO_ROUTINES,
  );
  /** 소비되지 않은 시작 표시가 있으면 아직 기록 전이다. */
  const { value: start } = useStored<RunStart | null>(RUN_START_KEY, NO_START);

  const routine = routines.find((item) => item.id === routineId);

  /*
   * 기록은 **외부 시스템(localStorage) 갱신**이라 effect 가 맞는 자리다.
   * 결과를 로컬 state 로 미러링하지 않는다 — 저장소가 스스로 변경을 알리므로
   * (local.ts 의 subscribe) 화면은 저장소에서 파생하기만 하면 된다.
   */
  useEffect(() => {
    if (!ready || !routine) return;
    // 이미 소비됐다 = 기록 완료(새로고침) 또는 중간 URL 로 바로 들어옴. 시각을 지어내지 않는다.
    if (start?.routineId !== routineId) return;

    const run = appendRun({
      routineId,
      startedAt: start.startedAt,
      finishedAt: new Date().toISOString(),
      completedStepIds: routine.steps.map((step) => step.id),
    });

    // 성공했을 때만 소비한다 — 실패하면 표시가 남아 다음에 다시 시도된다.
    if (run !== null) clearRunStart();
  }, [ready, routine, routineId, start]);

  if (!ready) return null;

  if (!routine) {
    return (
      <main className={styles.main} role="alert">
        <Icon name="search_off" filled className={styles.icon} />
        <h1 className={styles.title}>이 루틴을 찾을 수 없어요</h1>
        <Link className={styles.cta} href="/routine">
          루틴 목록으로
        </Link>
      </main>
    );
  }

  const minutes = totalMinutes(routine.steps);

  return (
    <main className={styles.main}>
      <Icon name="check_circle" filled className={styles.icon} />

      <h1 className={styles.title}>{TIME_LABEL[routine.time]} 루틴 완료</h1>
      <p className={styles.text}>
        {routine.steps.length}단계를 모두 마쳤어요
        {minutes !== null && ` · 약 ${minutes}분`}
      </p>

      <ol className={styles.steps}>
        {routine.steps.map((step) => (
          <li key={step.id} className={styles.step}>
            <Icon name="check" size="sm" className={styles.stepCheck} />
            {step.routineName}
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <Link className={styles.cta} href="/routine">
          <Icon name="list" filled size="sm" />
          루틴 목록으로
        </Link>
        <Link className={styles.secondary} href="/profile">
          기록 보기
        </Link>
      </div>
    </main>
  );
}
