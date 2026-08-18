"use client";

import { PRODUCTS_KEY } from "@/lib/storage/products";
import { useStored } from "@/lib/storage/useStored";
import type { Product } from "@/types/skincare";

/** 인라인 `[]` 는 매 렌더 새 배열이라 useStored 의 useMemo 를 무의미하게 만든다. */
const NO_PRODUCTS: Product[] = [];

/** 등록된 제품 목록을 반응형으로 읽는다("내 선반" · "AI 분석 리포트" 공용). */
export function useShelfProducts(): { ready: boolean; value: Product[] } {
  return useStored<Product[]>(PRODUCTS_KEY, NO_PRODUCTS);
}
