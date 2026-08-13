import { api } from "./client";

/**
 * 네이버 쇼핑 검색 API 응답.
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 *
 * 값이 전부 문자열인 건 네이버 스펙 그대로다(lprice 도 "12900" 처럼 온다).
 * 숫자 변환·<b> 태그 제거 같은 화면용 가공은 훅/컴포넌트에서 한다.
 */
export type ShopItem = {
  /** 검색어와 일치하는 부분이 <b> 태그로 감싸여 온다 */
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
};

export type ShopSearchResponse = {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: ShopItem[];
};

/** 정렬: sim=정확도, date=날짜, asc/dsc=가격 */
type Sort = "sim" | "date" | "asc" | "dsc";

export function searchShop({
  query,
  display,
  sort,
}: {
  query: string;
  display?: number;
  sort?: Sort;
}) {
  return api.get<ShopSearchResponse>("/search/shop", {
    query: { query, display, sort },
  });
}
