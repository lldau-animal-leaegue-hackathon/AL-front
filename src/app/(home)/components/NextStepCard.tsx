"use client";

import type { Route } from "next";
import Link from "next/link";

import { TIME_ICON, TIME_LABEL } from "@/app/routine/routineTime";
import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useRoutines } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import { RUN_START_KEY, type RunStart } from "@/lib/storage/history";
import { useStored } from "@/lib/storage/useStored";
import type { Routine, RoutineTime } from "@/types/skincare";

import card from "./card.module.css";
import styles from "./NextStepCard.module.css";

/** 인라인 `null` 은 매 렌더 새 참조라 useStored 의 memo 를 무력화한다. */
const NO_RUN_START: RunStart | null = null;

type Suggestion =
  | { kind: "empty" }
  | { kind: "in-progress"; routine: Routine }
  | { kind: "suggested"; routine: Routine };

/**
 * 다음에 할 루틴을 고른다.
 *
 * 1순위: `RUN_START_KEY` 가 가리키는 루틴이 아직 존재하면 "진행 중"이다.
 * 2순위: 현재 시각 기준 아침/저녁에 맞는 루틴을 제안한다. 없으면 있는 루틴 아무거나.
 */
function pickSuggestion(
  routines: readonly Routine[],
  runStart: RunStart | null,
  now: Date,
): Suggestion {
  if (routines.length === 0) return { kind: "empty" };

  if (runStart) {
    const active = routines.find((r) => r.id === runStart.routineId);
    // RunStart 가 가리키는 루틴이 재생성으로 사라졌을 수 있다 — 그때는 진행 중이 아니다.
    if (active) return { kind: "in-progress", routine: active };
  }

  // 정오를 기준으로 아침/저녁을 나눈다. 기상~정오의 "아침" 구간은 짧고
  // 저녁 루틴은 그 이후 하루 대부분을 차지하므로, 하루를 반으로 가르는
  // 정오 기준이 가장 단순하면서도 무리가 없다.
  const preferred: RoutineTime = now.getHours() < 12 ? "am" : "pm";
  const routine = routines.find((r) => r.time === preferred) ?? routines[0];
  return { kind: "suggested", routine };
}

/**
 * 홈의 "다음 단계" 카드 — 수행 중인 루틴이 있으면 이어서 하기, 없으면
 * 시간대에 맞는 루틴을 제안한다.
 *
 * ⚠️ `RUN_START_KEY` 는 시작 시각만 기록하고 **현재 몇 번째 단계인지는 저장하지 않는다**
 * (수행 화면은 URL 의 step 번호가 유일한 출처다). 그래서 진행 중이어도 실제 진행률을
 * 알 수 없어 숫자 진행률바를 보여주지 않는다 — 근거 없는 숫자를 지어내지 않는다.
 */
export function NextStepCard() {
  const { ready, value: routines, error, errorMessage, retry } = useRoutines();
  /*
   * 수행 중 표시는 **기기별 임시 상태**라 서버에 테이블이 없다(계획서 Step 3 메모).
   * 다른 기기에서 이어서 하기를 원하는 게 아니므로 localStorage 그대로 둔다.
   */
  const { value: runStart } = useStored<RunStart | null>(
    RUN_START_KEY,
    NO_RUN_START,
  );

  if (!ready) return <DataState loading label="루틴" />;
  if (error)
    return (
      <DataState error onRetry={retry} label="루틴" message={errorMessage} />
    );

  const suggestion = pickSuggestion(routines, runStart, new Date());

  if (suggestion.kind === "empty") {
    return (
      <section className={`${card.card} ${styles.empty}`}>
        <Icon name="auto_awesome" filled className={styles.emptyIcon} />
        <h3 className={card.cardTitle}>다음 단계</h3>
        <p className={styles.emptyText}>
          아직 만든 루틴이 없어요. 루틴을 만들면 다음에 할 일을 알려드려요.
        </p>
        <Link className={styles.emptyCta} href="/routine/new">
          <Icon name="add_circle" filled size="sm" />
          루틴 만들기
        </Link>
      </section>
    );
  }

  const { routine } = suggestion;
  const inProgress = suggestion.kind === "in-progress";
  const first = routine.steps[0];

  return (
    <section className={card.card}>
      <div className={styles.header}>
        <h3 className={card.cardTitle}>다음 단계</h3>
        <span className={`${card.label} ${styles.routine}`}>
          <Icon
            name={inProgress ? "play_circle" : TIME_ICON[routine.time]}
            size="sm"
          />
          {inProgress ? "진행 중" : `${TIME_LABEL[routine.time]} 루틴`}
        </span>
      </div>

      {first && (
        <div className={styles.product}>
          <div className={styles.thumb} aria-hidden="true">
            <Icon name={stepIcon(first.routineName)} filled />
          </div>

          <div className={styles.detail}>
            <h4 className={styles.productName}>{routine.name}</h4>
            <p className={styles.instruction}>
              {/* using_product 는 id 가 아니라 이름 문자열이다(정확 매칭 보장 없음) */}
              {first.usingProduct.length > 0
                ? first.usingProduct.join(" + ")
                : first.routineName}
            </p>
            <ul className={styles.tags}>
              <li className={`${card.label} ${styles.tag}`}>
                {routine.condition}
              </li>
              <li className={`${card.label} ${styles.tag}`}>
                총 {routine.steps.length}단계
              </li>
            </ul>
          </div>
        </div>
      )}

      <Link href={`/routine/${routine.id}/1` as Route} className={styles.cta}>
        <Icon name="play_arrow" filled size="sm" />
        {inProgress ? "이어서 하기" : "시작하기"}
      </Link>
    </section>
  );
}
