import { Icon } from "@/components/Icon";

import card from "./card.module.css";
import styles from "./NextStepCard.module.css";

type Props = {
  productName: string;
  instruction: string;
  tags: readonly string[];
  step: number;
  totalSteps: number;
};

export function NextStepCard({
  productName,
  instruction,
  tags,
  step,
  totalSteps,
}: Props) {
  const percent = Math.round((step / totalSteps) * 100);

  return (
    <section className={card.card}>
      <div className={styles.header}>
        <h3 className={card.cardTitle}>Next Step</h3>
        <span className={`${card.label} ${styles.routine}`}>
          <Icon name="wb_sunny" size="sm" />
          Morning Routine
        </span>
      </div>

      <div className={styles.product}>
        {/* 목업의 제품 사진 자리. 제품 데이터가 붙으면 이미지로 교체한다. */}
        <div className={styles.thumb} aria-hidden="true">
          <Icon name="water_drop" filled />
        </div>

        <div className={styles.detail}>
          <h4 className={styles.productName}>{productName}</h4>
          <p className={styles.instruction}>{instruction}</p>
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag} className={`${card.label} ${styles.tag}`}>
                {tag}
              </li>
            ))}
            <li className={`${card.label} ${styles.tag}`}>
              Step {step} of {totalSteps}
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.progress}>
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
        <span className={`${card.label} ${styles.percent}`}>
          {percent}% Complete
        </span>
      </div>
    </section>
  );
}
