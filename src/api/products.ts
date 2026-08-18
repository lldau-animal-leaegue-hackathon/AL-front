/**
 * 내 선반 제품. 서버 `/api/products` 를 부른다.
 *
 * 이 계층은 **호출만** 한다 — 캐시·재검증은 `src/lib/data/` 의 훅이, 화면용 변환은 컴포넌트가 한다.
 */

import type { Product } from "@/types/skincare";

import { api } from "./client";

export const fetchProducts = () => api.get<Product[]>("/products");

/** 성분 출처. 화면에 표시해야 하므로 서버가 NOT NULL 로 받는다. */
export type IngredientSource = "photo" | "hwahae" | "fallback" | "manual";

export const createProduct = (input: {
  productName: string;
  productCompany?: string;
  category: string;
  ingredients: string[];
  thumbnail?: string;
  ingredientSource?: IngredientSource;
}) => api.post<Product>("/products", input);

/** 주의사항 지연 생성. 공유 카탈로그를 고치는 것이라 다른 사용자에게도 반영된다. */
export const updateProductWarnings = (input: {
  id: string;
  warnings: string[];
}) => api.patch<{ ok: boolean }>("/products", input);

/** 내 선반에서만 뺀다. 공유 카탈로그의 제품 자체는 남는다. */
export const removeProduct = (input: { id: string }) =>
  api.delete<{ ok: boolean }>("/products", { query: { id: input.id } });
