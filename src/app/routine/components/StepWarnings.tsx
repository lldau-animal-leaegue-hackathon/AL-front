import { Icon } from "@/components/Icon";

import styles from "./StepWarnings.module.css";

/**
 * 단계별 주의사항. 프롬프트의 `warning` (단수형 키인데 값은 배열이다 — 명세 그대로).
 *
 * 빈 배열이 정상이다 — 주의할 게 없는 단계가 대부분이다. 그때는 **아무것도 그리지 않는다**
 * ("주의사항 없음" 같은 빈 카드를 띄우면 화면만 길어진다).
 */
export function StepWarnings({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;

  return (
    <aside className={styles.box}>
      <p className={styles.label}>
        <Icon name="warning" filled size="sm" />
        주의사항
      </p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item} className={styles.item}>
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
