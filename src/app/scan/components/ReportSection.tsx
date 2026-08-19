"use client";

import Link from "next/link";

import { DataState } from "@/components/DataState/DataState";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Icon } from "@/components/Icon";
import { useProducts } from "@/lib/data";
import type { Product } from "@/types/skincare";

import card from "../../(home)/components/card.module.css";
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

/**
 * 주의사항 문장이 **어느 성분 이야기인지** 찾는다.
 *
 * `warning` 은 프롬프트상 그냥 `string[]` 이라 성분과 설명이 나뉘어 있지 않다.
 * 다만 규칙 3 이 "성분과 무관한 일반론 금지"를 요구하므로 문장 안에 성분명이 들어 있다.
 * 그 제품의 `ingredients` 중 문장에 등장하는 것을 골라 제목으로 쓴다.
 *
 * ⚠️ **못 찾으면 빈 배열이다 — 성분을 지어내지 않는다.** 규칙 6 의 "성분 정보가 부족하여…"
 * 같은 문장은 어느 성분에도 속하지 않으므로 설명만 보여 준다.
 */
function mentionedIngredients(
  warning: string,
  ingredients: readonly string[],
): string[] {
  // 한 글자 성분명은 아무 문장에나 걸린다.
  const found = ingredients.filter(
    (name) => name.length >= 2 && warning.includes(name),
  );
  // "판테놀"이 "디판테놀" 안에 들어 있는 식의 겹침은 긴 쪽만 남긴다.
  return [
    ...new Set(
      found.filter((a) => !found.some((b) => b !== a && b.includes(a))),
    ),
  ];
}

type WarningLine = { key: string; ingredients: string[]; text: string };
type ProductWarnings = { id: string; name: string; lines: WarningLine[] };

/**
 * 제품별로 묶는다. 예전에는 "제품명 — 주의사항" 한 줄씩 평평하게 늘어놓아
 * 같은 제품이 반복되고 무엇이 성분이고 무엇이 설명인지 구분되지 않았다.
 *
 * `warnings` 는 지연 생성이라 optional 이다(useIngredientAlerts.ts 와 같은 계약).
 * 아직 안 만들어진 제품은 "주의 성분 없음"으로 지어내지 않고 그냥 집계에서 뺀다.
 */
function warningsByProduct(products: readonly Product[]): ProductWarnings[] {
  return products
    .map((product) => ({
      id: product.id,
      name: product.productName,
      lines: (product.warnings ?? []).map((text, index) => ({
        key: `${product.id}-${index}`,
        ingredients: mentionedIngredients(text, product.ingredients),
        text,
      })),
    }))
    .filter((item) => item.lines.length > 0);
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
  const flagged = warningsByProduct(products);

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
          ctaHref="/scan?tab=add"
          ctaLabel="제품 등록하기"
        />
      ) : (
        <>
          {shared.length > 0 && (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>자주 쓰는 성분</h3>
              <ul className={styles.sharedList}>
                {shared.map((item) => (
                  <li key={item.name} className={styles.sharedItem}>
                    <span className={styles.sharedName}>{item.name}</span>
                    <span className={styles.sharedCount}>
                      {item.count}개 제품
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {flagged.length === 0 ? (
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
            /*
              예전에는 전체를 붉은 상자(.alert)로 감쌌는데, 주의사항이 길어질수록
              화면 대부분이 빨개져 읽기 힘들었다(사용자 지적 2026-08-19).
              색은 제목·표식에만 남기고 본문은 보통 표면 위에 둔다.
            */
            <div className={styles.block}>
              <h3 className={`${styles.blockTitle} ${styles.alertTitle}`}>
                <Icon name="warning" size="sm" filled />
                자극 우려 성분
              </h3>

              {flagged.map((product) => (
                <article key={product.id} className={styles.product}>
                  <h4 className={styles.productName}>{product.name}</h4>

                  <ul className={styles.lines}>
                    {product.lines.map((line) => (
                      <li key={line.key} className={styles.line}>
                        {/* 성분을 특정하지 못한 문장은 제목 없이 설명만 보여 준다 */}
                        {line.ingredients.length > 0 && (
                          <p className={styles.ingredient}>
                            {line.ingredients.join(" · ")}
                          </p>
                        )}
                        <p className={styles.desc}>{line.text}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}

              {/*
                "대체 제품 찾기"인데 등록 폼으로 보내고 있었다 — 옛 `#add` 앵커가
                폼과 검색을 함께 감싸서 성립하던 우연이다. 탭이 생겨 목적지를
                검색으로 재조준했다. 이제 문구와 목적지가 일치한다.
              */}
              <Link
                href="/scan?tab=popular"
                className={`${card.label} ${styles.alertCta}`}
              >
                대체 제품 찾기
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
