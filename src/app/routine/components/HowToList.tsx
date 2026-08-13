"use client";

import { useState } from "react";

import { Icon } from "@/components/Icon";

import styles from "./HowToList.module.css";

/**
 * 사용법 체크리스트.
 * 단계가 바뀌면 key로 다시 마운트되므로 체크 상태는 자동으로 초기화된다.
 */
export function HowToList({ items }: { items: readonly string[] }) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.heading}>이렇게 사용하세요</h3>

      <ul className={styles.list}>
        {items.map((item, index) => {
          const done = checked.has(index);
          return (
            <li key={item}>
              <button
                type="button"
                className={`${styles.item} ${done ? styles.itemDone : ""}`}
                onClick={() => toggle(index)}
                aria-pressed={done}
              >
                <Icon
                  name={done ? "check_circle" : "radio_button_unchecked"}
                  filled
                  className={styles.mark}
                />
                <span className={styles.text}>{item}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
