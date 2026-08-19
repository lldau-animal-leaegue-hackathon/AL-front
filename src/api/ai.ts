/**
 * AI 엔드포인트 클라이언트 래퍼.
 *
 * AGENTS.md 컨벤션대로 **raw 응답(snake_case)을 그대로 반환**한다.
 * camelCase 변환·한글화·derived 필드는 훅/컴포넌트에서 한다.
 * (봉투 벗기기와 스키마 검증은 이미 Route Handler 가 끝냈다.)
 *
 * 프론트는 항상 같은 오리진 `/api/ai/*` 만 부른다 — 헤드리스 Claude 연동 방식이 바뀌어도
 * 이 파일과 화면 코드는 그대로다.
 */

import { api } from "./client";

/** 후보 1건 — 프롬프트 출력 스키마 그대로 */
export type ProductCandidate = {
  /** 판촉 문구를 제거한 제품 이름(프롬프트 규칙 5) */
  product_name: string;
  /** 페이지에서 확인 못 하면 null (규칙 6) */
  brand: string | null;
  /** 페이지에 없으면 null (규칙 7) */
  volume: string | null;
  /**
   * 제품 썸네일 주소 (규칙 9). 확인 못 하면 null.
   * **서버가 허용 호스트인지 이미 걸렀다** — 화면은 그대로 띄워도 된다.
   */
  image_url: string | null;
};

export type ProductSearchResponse = {
  /** **빈 배열이 정상 응답이다** (프롬프트 규칙 3: 화해에 없으면 []) */
  candidates: ProductCandidate[];
};

/** 성분 추출 응답 — 프롬프트 출력 스키마 그대로 */
export type IngredientsResponse = {
  product_name: string;
  category: string;
  /** **빈 배열이 정상 응답이다** (프롬프트 규칙 2: 확신 없으면 []) */
  ingredients: string[];
};

/** 루틴 단계 1개 — 프롬프트 출력 스키마 그대로 */
export type RoutineStepResponse = {
  routine_name: string;
  /** 초 단위 */
  estimated_time: number;
  /** 제품 **이름** 배열 (id 아님) */
  using_product: string[];
  how_to_use: string[];
  tips: string[];
  /** 단수형 키에 배열 — 명세 그대로 */
  warning: string[];
};

export type RoutineResponse = {
  morning: RoutineStepResponse[];
  evening: RoutineStepResponse[];
};

export type WarningsResponse = {
  warning: string[];
};

/**
 * 검색어로 제품 후보를 찾는다.
 *
 * `/api/ai/*` 중 **유일하게 웹 검색을 쓴다**(화해 검색 결과가 근거).
 * 실측 18~37초 — 화면에 진행 표시가 필요하다.
 */
export function searchProductCandidates(input: { query: string }) {
  return api.post<ProductSearchResponse>("/ai/search", input);
}

/**
 * 제품 성분 추출.
 * @param productImg data URL. **원본을 보낸다** — 성분표 글씨 해상도가 곧 정확도다.
 *   (저장용 썸네일은 별도로 축소한다.)
 */
export function extractIngredients(input: {
  productName: string;
  capacity?: string;
  productCompany?: string;
  productImg?: string;
}) {
  return api.post<IngredientsResponse>("/ai/ingredients", input);
}

/** 아침/저녁 루틴 생성. 수십 초가 걸리므로 화면에 진행 표시가 필요하다. */
export function generateRoutine(input: {
  wonder: string;
  usableTime: { morning: string; evening: string };
  products: { productName: string; category: string; ingredients: string[] }[];
}) {
  return api.post<RoutineResponse>("/ai/routine", input);
}

/** 제품 단독 사용 주의사항 (최대 6개) */
export function fetchWarnings(input: {
  productName: string;
  category: string;
  ingredients: string[];
}) {
  return api.post<WarningsResponse>("/ai/warnings", input);
}
