import { Icon } from "@/components/Icon";

import type { RoutineStep } from "../routines";
import styles from "./RoutineStepCard.module.css";

type Props = {
  step: RoutineStep;
  /** 1부터 시작하는 순서 */
  order: number;
  /** 마지막 단계면 스텝 연결선을 그리지 않는다 */
  last: boolean;
  done: boolean;
  /** 앞 단계가 안 끝났으면 체크할 수 없다 */
  locked: boolean;
  onToggle: () => void;
};

export function RoutineStepCard({
  step,
  order,
  last,
  done,
  locked,
  onToggle,
}: Props) {
  return (
    <li
      className={`${styles.card} ${done ? styles.cardDone : ""} ${locked ? styles.cardLocked : ""}`}
    >
      <div className={styles.stepper}>
        <span className={`${styles.order} ${done ? styles.orderDone : ""}`}>
          {order}
        </span>
        {!last && <span className={styles.line} />}
      </div>

      <div className={styles.thumb} aria-hidden="true">
        <Icon name={step.icon} filled />
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{step.productName}</h3>
          <Icon name={step.icon} className={styles.accent} />
        </div>

        <p className={styles.ingredient}>{step.ingredient}</p>

        <p className={styles.tip}>
          <Icon name="tips_and_updates" size="sm" className={styles.tipIcon} />
          {step.tip}
        </p>
      </div>

      <input
        type="checkbox"
        className={styles.checkbox}
        checked={done}
        disabled={locked}
        onChange={onToggle}
        aria-label={`${step.productName} 완료`}
      />

      {/* 카드 하단 진행 표시 — DESIGN.md의 "Sage Green thin-line bar" */}
      <span className={styles.progress} />
    </li>
  );
}
