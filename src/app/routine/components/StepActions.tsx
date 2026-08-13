import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/Icon";

import styles from "./StepActions.module.css";

type Props = {
  /** 다음 단계 경로. 마지막 단계면 완료 화면 대신 목록으로 돌아간다 */
  nextHref: Route;
  /** 다음 단계 제품명. 없으면 마지막 단계 */
  nextLabel?: string;
  prevHref?: Route;
};

export function StepActions({ nextHref, nextLabel, prevHref }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <Link href={nextHref} className={styles.primary}>
          <span>{nextLabel ? `다음: ${nextLabel}` : "루틴 완료하기"}</span>
          <Icon name={nextLabel ? "arrow_forward" : "check"} />
        </Link>

        <div className={styles.secondary}>
          {prevHref ? (
            <Link href={prevHref} className={styles.subtle}>
              <Icon name="arrow_back" size="sm" />
              이전
            </Link>
          ) : (
            <span className={`${styles.subtle} ${styles.disabled}`}>
              <Icon name="arrow_back" size="sm" />
              이전
            </span>
          )}

          <Link href={nextHref} className={`${styles.subtle} ${styles.skip}`}>
            건너뛰기
          </Link>
        </div>
      </div>
    </div>
  );
}
