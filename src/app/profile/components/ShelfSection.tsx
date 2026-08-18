"use client";

import Image from "next/image";
import Link from "next/link";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useProducts } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import type { Product } from "@/types/skincare";

import card from "../../(home)/components/card.module.css";
import { EmptyState } from "./EmptyState";
import styles from "./ShelfSection.module.css";

/**
 * 선반 카드 한 줄 설명.
 * 주의 성분이 있으면 그 사실을 우선 알리고, 없으면 성분 앞 2개 또는 제조사로
 * 채운다 — `ingredients` 빈 배열은 정상 응답이라(Q7 계약) 없다고 지어내지 않는다.
 */
function shelfNote(product: Product, flagged: boolean): string | null {
  if (flagged) return "주의 성분 포함";
  if (product.ingredients.length > 0) {
    return product.ingredients.slice(0, 2).join(" · ");
  }
  return product.productCompany ?? null;
}

export function ShelfSection() {
  const { ready, value: products, error, retry } = useProducts();

  if (!ready) return <DataState loading label="제품" />;
  if (error) return <DataState error onRetry={retry} label="제품" />;

  if (products.length === 0) {
    return (
      <EmptyState
        icon="inventory_2"
        title="아직 등록한 제품이 없어요"
        text="성분표를 촬영하면 AI가 성분을 읽어서 선반에 담아드려요."
        ctaHref="/scan"
        ctaLabel="제품 등록하기"
      />
    );
  }

  return (
    <ul className={styles.grid}>
      {products.map((product) => {
        const flagged = (product.warnings?.length ?? 0) > 0;
        const note = shelfNote(product, flagged);

        return (
          <li
            key={product.id}
            className={`${card.card} ${styles.item} ${flagged ? styles.flagged : ""}`}
          >
            {flagged && (
              <Icon name="warning" size="sm" filled className={styles.flag} />
            )}

            <span className={styles.thumb}>
              {product.thumbnail ? (
                // 이미 256px 로 축소된 로컬 data URL 이라 next/image 최적화가 필요 없다.
                <Image
                  src={product.thumbnail}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className={styles.thumbImg}
                />
              ) : (
                <Icon name={stepIcon(product.category)} />
              )}
            </span>

            <span className={`${card.label} ${styles.chip}`}>
              {product.category}
            </span>
            <h3 className={styles.name}>{product.productName}</h3>
            {note && (
              <p
                className={`${styles.note} ${flagged ? styles.noteAlert : ""}`}
              >
                {note}
              </p>
            )}
          </li>
        );
      })}

      <li>
        <Link href="/scan" className={styles.addCard}>
          <span className={styles.addIcon}>
            <Icon name="add" />
          </span>
          <span className={styles.name}>제품 추가</span>
        </Link>
      </li>
    </ul>
  );
}
