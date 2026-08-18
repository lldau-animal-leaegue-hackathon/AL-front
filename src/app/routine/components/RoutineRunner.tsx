"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect } from "react";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useRoutines } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import { markRunStart } from "@/lib/storage/history";

import { HowToList } from "./HowToList";
import styles from "./RoutineRunner.module.css";
import { RunHeader } from "./RunHeader";
import { StepActions } from "./StepActions";
import { StepTimer } from "./StepTimer";
import { StepWarnings } from "./StepWarnings";

/**
 * 수행 화면의 클라이언트 경계.
 *
 * 루틴이 localStorage 로 옮겨가면서 **서버는 루틴을 모른다.** 그래서
 *  - `generateStaticParams` 가 성립하지 않는다(단계 수가 루틴마다 다르다) → 제거했다.
 *  - 404 판정도 서버의 `notFound()` 로 못 한다 → 여기서 판정한다.
 *
 * 페이지(`page.tsx`)는 서버 컴포넌트로 남기고 `params` 만 넘긴다 —
 * `"use client"` 를 페이지가 아니라 한 단계 아래인 여기에 둔다.
 */
export function RoutineRunner({
  routineId,
  step,
}: {
  routineId: string;
  step: string;
}) {
  const { ready, value: routines, error, retry } = useRoutines();

  const routine = routines.find((item) => item.id === routineId);
  const index = Number(step) - 1;

  /*
   * 첫 단계에 들어설 때 수행 시작 시각을 찍는다. 완료 화면은 별도 라우트라
   * 메모리로 넘길 수 없다. 훅은 early return 앞에서 무조건 호출해야 하므로
   * 조건은 본문 안에 둔다.
   */
  useEffect(() => {
    if (ready && routine && index === 0) markRunStart(routineId);
  }, [ready, routine, index, routineId]);

  // 아직 서버 응답 전이다. 여기서 "없음"으로 단정하면
  // 정상 루틴인데도 "찾을 수 없어요"가 한 번 깜빡였다가 사라진다.
  if (!ready) return <DataState loading label="루틴" />;

  // 네트워크 실패를 "루틴 없음"으로 오판하면 안 되므로 404 판정보다 먼저 처리한다.
  if (error) return <DataState error onRetry={retry} label="루틴" />;

  const valid =
    routine !== undefined &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < routine.steps.length;

  if (!routine || !valid) {
    return (
      <main className={styles.missing} role="alert">
        <Icon name="search_off" filled className={styles.missingIcon} />
        <h2 className={styles.missingTitle}>이 단계를 찾을 수 없어요</h2>
        <p className={styles.missingText}>
          루틴을 다시 만들었거나 주소가 잘못됐을 수 있어요.
        </p>
        <Link className={styles.missingCta} href="/routine">
          루틴 목록으로
        </Link>
      </main>
    );
  }

  const steps = routine.steps;
  const current = steps[index];
  const next = steps[index + 1];

  return (
    <>
      <RunHeader title={routine.name} step={index + 1} total={steps.length} />

      <main className={styles.main}>
        <div className={styles.visual}>
          <div className={styles.photo}>
            {/* 제품 썸네일 연결 전까지는 단계명에서 파생한 아이콘을 쓴다(Q6 폴백). */}
            <Icon
              name={stepIcon(current.routineName)}
              filled
              className={styles.photoIcon}
            />
            {/* estimated_time 은 초 단위 정수다 — 분이 아니다. */}
            <StepTimer seconds={current.estimatedTime} />
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.intro}>
            <p className={styles.meta}>
              <span className={styles.category}>{current.routineName}</span>
              <span className={styles.duration}>
                약 {Math.max(1, Math.round(current.estimatedTime / 60))}분
              </span>
            </p>
            {/*
              using_product 는 제품 id 가 아니라 **이름 문자열**이다. 저장된 제품과
              정확히 안 맞을 수 있으므로 매칭에 실패해도 이름은 그대로 보여준다.
              한 단계에 2개 이상은 이중 세안 같은 경우다(프롬프트 규칙 5-2).
            */}
            <h2 className={styles.product}>
              {current.usingProduct.length > 0
                ? current.usingProduct.join(" + ")
                : current.routineName}
            </h2>
          </div>

          {current.tips.length > 0 && (
            <aside className={styles.expert}>
              <span className={styles.expertBadge} aria-hidden="true">
                <Icon name="spa" filled size="sm" />
              </span>
              <div>
                <p className={styles.expertLabel}>전문가 팁</p>
                <ul className={styles.tipList}>
                  {current.tips.map((tip) => (
                    <li key={tip} className={styles.expertText}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          <StepWarnings items={current.warning} />

          {/* 단계가 바뀌면 체크 상태를 초기화한다 */}
          <HowToList key={current.id} items={current.howToUse} />
        </div>
      </main>

      <StepActions
        nextHref={
          next
            ? (`/routine/${routineId}/${index + 2}` as Route)
            : (`/routine/${routineId}/done` as Route)
        }
        nextLabel={next ? next.routineName : "루틴 마치기"}
        prevHref={
          index > 0 ? (`/routine/${routineId}/${index}` as Route) : undefined
        }
      />
    </>
  );
}
