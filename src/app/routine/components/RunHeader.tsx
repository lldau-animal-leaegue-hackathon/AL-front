import Link from "next/link";

import { Icon } from "@/components/Icon";

import styles from "./RunHeader.module.css";

type Props = {
  title: string;
  step: number;
  total: number;
};

export function RunHeader({ title, step, total }: Props) {
  const percent = Math.round((step / total) * 100);

  return (
    <header className={styles.header}>
      <div className={styles.row}>
        {/* 수행 화면은 몰입이 목적이라 탭바 대신 닫기로 빠져나간다 */}
        <Link href="/routine" className={styles.icon} aria-label="루틴 닫기">
          <Icon name="close" />
        </Link>

        <div className={styles.titles}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.counter}>
            {total}단계 중 {step}번째
          </p>
        </div>

        {/* 자리를 맞추기 위한 빈 칸 — 옵션 메뉴가 생기면 여기에 넣는다 */}
        <span className={styles.icon} aria-hidden="true" />
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="루틴 진행률"
      >
        <div className={styles.bar} style={{ width: `${percent}%` }} />
      </div>
    </header>
  );
}
