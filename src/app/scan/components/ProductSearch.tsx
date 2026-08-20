"use client";

import { useState } from "react";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { usePopularProducts } from "@/lib/data";
import type { Product } from "@/types/skincare";

import { POPULAR_PRODUCTS, searchProducts } from "../products";
import { PopularProductModal } from "./PopularProductModal";
import { ProductCard } from "./ProductCard";
import styles from "./ProductSearch.module.css";

/**
 * 제품 검색 + 인기 제품.
 *
 * **인기 제품은 서버 공유 카탈로그에서 온다** — 담긴 횟수 순이라 쓸수록 좋아진다
 * (계획서 Q2 결정). 성분·이미지가 이미 저장돼 있어 카드를 누르면 **AI 호출 없이 즉시** 열린다.
 *
 * ⚠️ 아직 아무도 담지 않았으면 카탈로그가 비어 있다. 그때는 **시드 24종**으로 폴백하는데,
 * 시드에는 성분도 이미지도 없다. 그래서 시드 카드는 상세를 열 수 없고 **등록 폼을 채운다**
 * (거기서 검색·성분 추출을 거쳐 담기면 그 제품이 카탈로그에 들어간다).
 */
export function ProductSearch({
  active,
  onSelect,
}: {
  /** 이 패널이 현재 탭인지. hidden 뒤에서 모달이 살아 있으면 스크롤 락이 안 풀린다(M6). */
  active: boolean;
  /** 시드 카드를 고르면 등록 폼을 채운다. 시드에는 성분이 없어 폼을 반드시 거친다. */
  onSelect: (product: { name: string; brand: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const popular = usePopularProducts();

  // 로컬 시드 검색이라 입력할 때마다 즉시 거른다 (네트워크 호출이 없어 디바운스도 불필요).
  const trimmed = query.trim();
  const results = trimmed ? searchProducts(trimmed) : null;

  /**
   * 카탈로그가 비었으면 시드로 폴백한다. 둘은 카드 클릭 동작이 다르다.
   *
   * ⚠️ **`ready`·`error` 를 먼저 봐야 한다.** 실패해도 `value` 는 빈 배열이라,
   * 안 보면 서버 장애가 "아직 아무도 안 담음"으로 위장돼 조용히 시드가 뜬다.
   */
  const catalog = popular.value;
  const useCatalog = catalog.length > 0;

  return (
    <>
      {/* active 일 때만 렌더(M6) — hidden 뒤에 남으면 useBodyScrollLock 이 페이지 전체를 잠근다.
          detail 상태는 유지하므로 탭에 돌아오면 모달이 다시 뜬다. */}
      {active && detail && (
        <PopularProductModal product={detail} onClose={() => setDetail(null)} />
      )}

      <div className={styles.searchBar}>
        <Icon name="search" className={styles.searchIcon} />
        <input
          className={styles.input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제품명이나 브랜드를 검색하세요"
          aria-label="제품 검색"
        />
      </div>

      <section className={styles.results}>
        <h2 className={styles.heading}>
          {results ? "검색 결과" : "인기 제품"}
          {results && <span className={styles.status}>{results.length}개</span>}
        </h2>

        {/*
          검색 결과는 로컬 시드라 네트워크와 무관하다 — 검색 중일 때는 카탈로그 상태를
          따지지 않는다. 인기 제품을 그릴 때만 로딩·실패를 확인한다.
        */}
        {!results && !popular.ready ? (
          <DataState loading label="인기 제품" />
        ) : !results && popular.error ? (
          <DataState
            error
            onRetry={popular.retry}
            label="인기 제품"
            message={popular.errorMessage}
          />
        ) : results ? (
          results.length === 0 ? (
            <p className={styles.empty}>
              검색 결과가 없습니다. &lsquo;등록&rsquo; 탭에서 이름으로
              찾아보세요.
            </p>
          ) : (
            <ul className={styles.grid}>
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  note={product.brand}
                  category={product.category}
                  onSelect={() =>
                    onSelect({ name: product.name, brand: product.brand })
                  }
                />
              ))}
            </ul>
          )
        ) : useCatalog ? (
          <ul className={styles.grid}>
            {catalog.map((product) => (
              <ProductCard
                key={product.id}
                name={product.productName}
                note={product.productCompany}
                // 공유 이미지만 온다 — 개인 사진은 조회 자체에서 빠져 있다.
                image={product.image}
                category={product.category}
                onSelect={() => setDetail(product)}
              />
            ))}
          </ul>
        ) : (
          <ul className={styles.grid}>
            {POPULAR_PRODUCTS.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                note={product.brand}
                category={product.category}
                onSelect={() =>
                  onSelect({ name: product.name, brand: product.brand })
                }
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
