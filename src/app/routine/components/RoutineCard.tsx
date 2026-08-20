"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/Icon";
import { appendRun } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import type { Routine } from "@/types/skincare";

import { conditionLabel } from "../condition";
import { TIME_ICON, TIME_LABEL, totalMinutes } from "../routineTime";
import styles from "./RoutineCard.module.css";

/**
 * 목록의 루틴 한 개.
 * 펼치기는 <details>에 맡긴다 — 열림 상태까지 state로 들 필요가 없다.
 *
 * `done` 은 **수행 기록에서 파생된 값**이다(Step 7). 예전의 로컬 state 토글 버튼은
 * 새로고침하면 풀리는 가짜 상태라 없앴다. 지금의 "완료" 버튼은 다르다 —
 * **실제 수행 기록(appendRun)을 남기므로** 주간 달성률과 항상 일치한다
 * (사용자 피드백 2026-08-20: 단계 화면을 거치지 않고도 완료 처리하고 싶다).
 */
export function RoutineCard({
  routine,
  done,
}: {
  routine: Routine;
  done: boolean;
}) {
  const minutes = totalMinutes(routine.steps);

  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  /** 러너 완주(RoutineDone)와 같은 규칙 — 전 단계를 완료로 기록한다. */
  async function markDone() {
    setMarking(true);
    setMarkError(false);
    try {
      const now = new Date().toISOString();
      await appendRun({
        routineId: routine.id,
        startedAt: now,
        finishedAt: now,
        completedStepIds: routine.steps.map((step) => step.id),
      });
      // 성공하면 runs 캐시 갱신으로 done prop 이 바뀌어 버튼이 사라진다.
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  }

  return (
    <li>
      <details className={`${styles.card} ${done ? styles.cardDone : ""}`}>
        <summary className={styles.summary}>
          <span className={styles.badge} aria-hidden="true">
            <Icon name={done ? "check" : TIME_ICON[routine.time]} filled />
          </span>

          <span className={styles.info}>
            <span className={styles.titleRow}>
              <h3 className={styles.name}>{routine.name}</h3>
              <span className={styles.chip}>
                {conditionLabel(routine.condition)}
              </span>
            </span>
            <span className={styles.meta}>
              {TIME_LABEL[routine.time]} · {routine.steps.length}단계
              {/* LLM 이 estimated_time 을 안 준 경우 "약 0분"은 거짓말이라 아예 생략한다 */}
              {minutes !== null && ` · 약 ${minutes}분`}
              {done && " · 오늘 완료"}
            </span>
          </span>

          <Icon name="expand_more" className={styles.chevron} />
        </summary>

        <p className={styles.desc}>{routine.summary}</p>

        <ol className={styles.steps}>
          {routine.steps.map((step, index) => (
            <li key={step.id} className={styles.step}>
              <span className={styles.order}>{index + 1}</span>
              {/* 출력에 아이콘 필드가 없어 단계명에서 파생한다(폴백 있음) */}
              <Icon
                name={stepIcon(step.routineName)}
                size="sm"
                className={styles.stepIcon}
              />
              <span className={styles.stepName}>{step.routineName}</span>
              {/*
                using_product 는 id 가 아니라 이름 문자열이다. 저장된 제품과 매칭되지
                않아도 이름은 보여 준다. 비어 있으면 칩 자체를 생략한다.
              */}
              {step.usingProduct.length > 0 && (
                <span className={styles.stepCategory}>
                  {step.usingProduct.join(" + ")}
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <Link
            href={`/routine/${routine.id}/1` as Route}
            className={styles.start}
          >
            <Icon name="play_arrow" filled />
            {done ? "다시 하기" : "시작하기"}
          </Link>

          {/* 이미 오늘 완료면 기록할 게 없다 — 버튼을 숨긴다. */}
          {!done && (
            <button
              type="button"
              className={styles.markDone}
              onClick={markDone}
              disabled={marking}
            >
              <Icon name="check" size="sm" />
              {marking ? "기록 중…" : "완료"}
            </button>
          )}
        </div>

        {markError && (
          <p className={styles.markError} role="alert">
            완료를 기록하지 못했어요.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
        )}
      </details>
    </li>
  );
}
