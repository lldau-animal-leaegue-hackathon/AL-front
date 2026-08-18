"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

import { Icon } from "@/components/Icon";

import { TIME_ICON, TIME_LABEL, totalMinutes, type Routine } from "../routines";
import styles from "./RoutineCard.module.css";

/**
 * 목록의 루틴 한 개.
 * 펼치기는 <details>에 맡긴다 — 열림 상태까지 state로 들 필요가 없다.
 * 완료 여부는 화면 안에서만 쓰는 값이라 로컬 state로 둔다(새로고침하면 풀린다).
 */
export function RoutineCard({ routine }: { routine: Routine }) {
  const [done, setDone] = useState(false);

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
              <span className={styles.chip}>{routine.condition}</span>
            </span>
            <span className={styles.meta}>
              {TIME_LABEL[routine.time]} · {routine.steps.length}단계 · 약{" "}
              {totalMinutes(routine)}분{done && " · 오늘 완료"}
            </span>
          </span>

          <Icon name="expand_more" className={styles.chevron} />
        </summary>

        <p className={styles.desc}>{routine.summary}</p>

        <ol className={styles.steps}>
          {routine.steps.map((step, index) => (
            <li key={step.id} className={styles.step}>
              <span className={styles.order}>{index + 1}</span>
              <Icon name={step.icon} size="sm" className={styles.stepIcon} />
              <span className={styles.stepName}>{step.productName}</span>
              <span className={styles.stepCategory}>{step.category}</span>
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <Link
            href={`/routine/${routine.id}/1` as Route}
            className={styles.start}
          >
            <Icon name="play_arrow" filled />
            시작하기
          </Link>

          <button
            type="button"
            className={`${styles.complete} ${done ? styles.completeDone : ""}`}
            aria-pressed={done}
            onClick={() => setDone(!done)}
          >
            <Icon name="check" filled={done} />
            {done ? "완료됨" : "완료"}
          </button>
        </div>
      </details>
    </li>
  );
}
