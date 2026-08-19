/**
 * 내 선반 제품. 서버 `/api/products` 를 부른다.
 *
 * 이 계층은 **호출만** 한다 — 캐시·재검증은 `src/lib/data/` 의 훅이, 화면용 변환은 컴포넌트가 한다.
 */

import type { Product } from "@/types/skincare";

import { api } from "./client";

export const fetchProducts = () => api.get<Product[]>("/products");

/**
 * 많이 담긴 순 공유 카탈로그.
 * **개인 사진(`thumbnail`)은 오지 않는다** — 공유 이미지(`image`)만 담겨 있다.
 * 아직 아무도 담지 않았으면 빈 배열이다(정상).
 */
export const fetchPopularProducts = () =>
  api.get<Product[]>("/products/popular");

/** 성분 출처. 화면에 표시해야 하므로 서버가 NOT NULL 로 받는다. */
export type IngredientSource = "photo" | "hwahae" | "fallback" | "manual";

export const createProduct = (input: {
  productName: string;
  productCompany?: string;
  category: string;
  ingredients: string[];
  /** 직접 찍은 사진의 256px data URL */
  thumbnail?: string;
  /**
   * 검색 결과에서 온 이미지 주소.
   * **서버가 받아서 data URL 로 바꿔 저장한다** — 클라이언트가 외부 이미지를 가져오지 않는다
   * (CORS 에 걸리고, 무엇보다 허용 호스트 검증이 서버에 있어야 한다).
   * `thumbnail` 이 함께 오면 직접 찍은 사진이 우선이다.
   */
  thumbnailUrl?: string;
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
