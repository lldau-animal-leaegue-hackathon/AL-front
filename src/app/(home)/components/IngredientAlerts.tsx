import { Icon } from "@/components/Icon";

import card from "./card.module.css";
import styles from "./IngredientAlerts.module.css";

export type IngredientAlert = {
  /** warning = 자극 우려 성분, conflict = 함께 쓰면 안 되는 조합 */
  kind: "warning" | "conflict";
  title: string;
  detail: string;
};

const ICON: Record<IngredientAlert["kind"], string> = {
  warning: "warning",
  conflict: "science",
};

export function IngredientAlerts({
  alerts,
}: {
  alerts: readonly IngredientAlert[];
}) {
  return (
    <section className={card.card}>
      <div className={styles.header}>
        <h3 className={card.cardTitle}>Ingredient Alerts</h3>
        <span className={styles.info}>
          <Icon name="info" />
        </span>
      </div>

      <ul className={styles.list}>
        {alerts.map((alert) => (
          <li
            key={alert.title}
            className={`${styles.item} ${styles[alert.kind]}`}
          >
            <Icon name={ICON[alert.kind]} className={styles.itemIcon} />
            <div>
              <h4 className={`${card.label} ${styles.itemTitle}`}>
                {alert.title}
              </h4>
              <p className={styles.itemDetail}>{alert.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
