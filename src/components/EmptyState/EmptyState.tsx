import type { Route } from "next";
import Link from "next/link";

import { Icon } from "@/components/Icon";
import { SentenceBreak } from "@/components/SentenceBreak";

import styles from "./EmptyState.module.css";

/**
 * 섹션 공통 빈 상태.
 *
 * 이 앱의 첫 사용자는 모든 섹션이 비어 있는 상태로 시작한다(AGENTS.md) — 섹션마다
 * 다른 모양의 안내를 만드는 대신 하나로 묶어 "다음 행동"을 항상 같은 자리에 둔다.
 * `RoutineList.tsx` 의 빈 상태와 같은 얼개다.
 *
 * `concern/`에서 이리로 옮겼다 — scan·routine 두 라우트가 함께 쓰게 되면서
 * 한 라우트 전용이 아니게 됐다(AGENTS.md 디렉토리 분리 원칙, `DataState`와 같은 배치).
 */
export function EmptyState({
  icon,
  title,
  text,
  ctaHref,
  ctaLabel,
}: {
  icon: string;
  title: string;
  text: string;
  ctaHref: Route;
  ctaLabel: string;
}) {
  return (
    <div className={styles.empty} role="status">
      <Icon name={icon} filled className={styles.icon} />
      <h3 className={styles.title}>{title}</h3>
      {/* 안내문은 문장(마침표) 단위로 줄을 바꾼다 — 모든 호출처에 한 번에 적용된다. */}
      <p className={styles.text}>
        <SentenceBreak text={text} />
      </p>
      <Link className={styles.cta} href={ctaHref}>
        {ctaLabel}
      </Link>
    </div>
  );
}
