import type { Route } from "next";
import Link from "next/link";

import { Icon } from "@/components/Icon";

import styles from "./EmptyState.module.css";

/**
 * 프로필 화면 공통 빈 상태.
 *
 * 이 앱의 첫 사용자는 모든 섹션이 비어 있는 상태로 시작한다(AGENTS.md) — 섹션마다
 * 다른 모양의 안내를 만드는 대신 하나로 묶어 "다음 행동"을 항상 같은 자리에 둔다.
 * `RoutineList.tsx` 의 빈 상태와 같은 얼개다.
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
      <p className={styles.text}>{text}</p>
      <Link className={styles.cta} href={ctaHref}>
        {ctaLabel}
      </Link>
    </div>
  );
}
