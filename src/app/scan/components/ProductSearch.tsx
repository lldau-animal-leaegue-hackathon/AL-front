"use client";

import { useState } from "react";

import { Icon } from "@/components/Icon";

import { POPULAR_PRODUCTS, searchProducts } from "../products";
import { ProductCard } from "./ProductCard";
import styles from "./ProductSearch.module.css";

export function ProductSearch() {
  const [query, setQuery] = useState("");

  // 로컬 카탈로그라 입력할 때마다 즉시 거른다 (네트워크 호출이 없어 디바운스도 불필요).
  const trimmed = query.trim();
  const results = trimmed ? searchProducts(trimmed) : null;

  return (
    <>
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
          {results ? "Search Results" : "Popular Products"}
          {results && <span className={styles.status}>{results.length}개</span>}
        </h2>

        {results?.length === 0 ? (
          <p className={styles.empty}>
            검색 결과가 없습니다. 아래 카메라로 직접 스캔해보세요.
          </p>
        ) : (
          <ul className={styles.grid}>
            {(results ?? POPULAR_PRODUCTS).map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                brand={product.brand}
                price={product.price}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
