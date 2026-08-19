"use client";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";

import { useIngredientAlerts } from "../hooks/useIngredientAlerts";

import card from "./card.module.css";
import styles from "./IngredientAlerts.module.css";

/**
 * 등록 제품의 주의사항(`Product.warnings`)을 취합해 보여준다.
 * 실데이터 취합·지연 생성은 `useIngredientAlerts` 훅이 담당한다.
 */
export function IngredientAlerts() {
  const state = useIngredientAlerts();

  return (
    <section className={card.card}>
      <div className={styles.header}>
        <h3 className={card.cardTitle}>성분 알림</h3>
        <span className={styles.info}>
          <Icon name="info" />
        </span>
      </div>

      {state.kind === "checking" && (
        <p className={styles.status} role="status">
          <Icon name="progress_activity" className={styles.spinner} />
          성분 주의사항을 확인하고 있어요. 제품마다 최대 1분 정도 걸릴 수
          있어요.
        </p>
      )}

      {/* 제품 목록을 못 불러온 것과 "제품이 없다"는 다르다 — 구분하지 않으면
          네트워크 실패가 "제품을 등록하세요"로 잘못 안내된다. */}
      {state.kind === "error" && (
        <DataState
          error
          onRetry={state.retry}
          label="성분 알림"
          message={state.errorMessage}
        />
      )}

      {state.kind === "no-products" && (
        <p className={styles.status}>
          등록된 제품이 없어요. 제품을 등록하면 주의사항을 알려드려요.
        </p>
      )}

      {state.kind === "no-warnings" && (
        <p className={styles.status}>
          <Icon name="check_circle" filled />
          등록한 제품에 특별한 주의사항이 없어요.
        </p>
      )}

      {state.kind === "ready" && (
        <ul className={styles.list}>
          {state.alerts.map((alert) => (
            <li key={alert.id} className={styles.item}>
              <Icon name="warning" className={styles.itemIcon} />
              <div>
                <h4 className={`${card.label} ${styles.itemTitle}`}>
                  {alert.productName}
                </h4>
                <p className={styles.itemDetail}>{alert.warning}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
