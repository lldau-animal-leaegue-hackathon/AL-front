import { Icon } from "@/components/Icon";

import card from "./card.module.css";
import styles from "./SkinHealthCard.module.css";

// 게이지 원 둘레 (r=40) — stroke-dasharray 계산에 쓴다
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  score: number;
  summary: string;
  weeklyDelta: number;
};

export function SkinHealthCard({ score, summary, weeklyDelta }: Props) {
  const filled = (CIRCUMFERENCE * score) / 100;

  return (
    <section className={`${card.card} ${styles.section}`}>
      <div className={styles.info}>
        <h2 className={styles.heading}>피부 건강</h2>
        <p className={styles.summary}>{summary}</p>
        <p className={`${card.label} ${styles.delta}`}>
          <Icon name="trending_up" size="sm" />
          지난주 대비 {weeklyDelta > 0 ? "+" : ""}
          {weeklyDelta}%
        </p>
      </div>

      <div className={styles.gauge}>
        <svg viewBox="0 0 100 100" className={styles.gaugeSvg}>
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            stroke="var(--surface-container-highest)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            stroke="var(--primary-container)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            className={styles.progress}
          />
        </svg>

        <div className={styles.readout}>
          <span className={styles.score}>{score}</span>
          <span className={`${card.label} ${styles.total}`}>/ 100</span>
        </div>
      </div>
    </section>
  );
}
