"use client";

import Link from "next/link";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useProducts } from "@/lib/data";
import type { Product } from "@/types/skincare";

import card from "../../(home)/components/card.module.css";
import { EmptyState } from "./EmptyState";
import styles from "./ReportSection.module.css";

/** 2개 이상 제품에 공통으로 들어간 성분 — 상위 3개만 인사이트로 보여준다. */
function sharedIngredients(
  products: readonly Product[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    // 한 제품 안에서 중복 표기됐을 수 있어 Set 으로 한 번만 센다.
    for (const ingredient of new Set(product.ingredients)) {
      counts.set(ingredient, (counts.get(ingredient) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
}

type WarningItem = { key: string; productName: string; warning: string };

/**
 * `warnings` 는 지연 생성이라 optional 이다(useIngredientAlerts.ts 와 같은 계약).
 * 아직 안 만들어진 제품은 "주의 성분 없음"으로 지어내지 않고 그냥 집계에서 뺀다.
 */
function warningItems(products: readonly Product[]): WarningItem[] {
  return products.flatMap((product) =>
    (product.warnings ?? []).map((warning, index) => ({
      key: `${product.id}-${index}`,
      productName: product.productName,
      warning,
    })),
  );
}

/**
 * AI 분석 리포트 — 등록 제품 전체의 `ingredients`·`warnings` 를 모아 요약한다.
 *
 * 여기서 새로 AI 를 호출하지 않는다. `warnings` 생성은 홈 화면의
 * `useIngredientAlerts` 가 맡고 있어, 이 화면은 이미 저장된 값만 읽는다
 * (같은 화면이 두 번 호출을 태우면 `claude -p` 프로세스가 중복으로 뜬다).
 */
export function ReportSection() {
  const { ready, value: products, error, retry } = useProducts();

  if (!ready) return <DataState loading label="제품" />;
  if (error) return <DataState error onRetry={retry} label="제품" />;

  const uniqueIngredientCount = new Set(
    products.flatMap((product) => product.ingredients),
  ).size;
  const shared = sharedIngredients(products);
  const warnings = warningItems(products);

  return (
    <section className={`${card.card} ${styles.section}`}>
      <div className={styles.header}>
        <span className={styles.badge}>
          <Icon name="science" />
        </span>
        <div>
          <h2 className={card.cardTitle}>AI 분석 리포트</h2>
          <p className={`${card.label} ${styles.subtitle}`}>
            {products.length === 0
              ? "등록한 제품이 없어요"
              : `등록 제품 ${products.length}개 · 성분 ${uniqueIngredientCount}종`}
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon="science"
          title="분석할 제품이 없어요"
          text="제품을 등록하면 성분과 주의사항을 모아서 보여드려요."
          ctaHref="/scan"
          ctaLabel="제품 등록하기"
        />
      ) : (
        <>
          {shared.length > 0 && (
            <div className={styles.insight}>
              <h3 className={styles.insightTitle}>자주 쓰는 성분</h3>
              <p className={styles.insightBody}>
                {shared
                  .map((item) => `${item.name} (${item.count}개 제품)`)
                  .join(" · ")}
              </p>
            </div>
          )}

          {warnings.length === 0 ? (
            <p className={styles.safe}>
              <Icon
                name="check_circle"
                size="sm"
                filled
                className={styles.safeIcon}
              />
              등록한 제품에서 확인된 주의 성분이 없어요.
            </p>
          ) : (
            <div className={styles.alert}>
              <Icon name="warning" className={styles.alertIcon} />
              <div>
                <h3 className={styles.alertTitle}>자극 우려 성분</h3>
                <ul className={styles.warningList}>
                  {warnings.map((item) => (
                    <li key={item.key} className={styles.insightBody}>
                      <strong>{item.productName}</strong> — {item.warning}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/scan"
                  className={`${card.label} ${styles.alertCta}`}
                >
                  대체 제품 찾기
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
