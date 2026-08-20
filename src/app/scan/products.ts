/**
 * 제품 카탈로그 (임시 시드 데이터).
 *
 * 왜 외부 API가 아닌가:
 *  - 네이버 쇼핑 검색: 개발자센터에서 "신규로 등록할 수 없는 API" 로 막혀 있다.
 *  - 카카오: 상품 카탈로그가 없다. 이미지/웹 검색 모두 블로그·뉴스·핫딜 글이 나온다.
 * 둘 다 우리가 통제할 수 없는 문제라 데모가 확실히 도는 쪽을 택했다.
 *
 * 실제 상품 API가 생기면 searchProducts 만 갈아끼우면 된다
 * (호출부는 이 함수 시그니처에만 의존한다). 네이버 연동 코드는 신규 발급이 막혀
 * 되살릴 수 없어 제거했다(2026-08-18, 이력은 git — db9eaed 이전).
 */

export type Product = {
  id: string;
  name: string;
  brand: string;
  /** 원 단위 */
  price: number;
  category: string;
};

const PRODUCTS: readonly Product[] = [
  // 클렌징
  {
    id: "1",
    name: "로우 pH 굿모닝 젤 클렌저",
    brand: "COSRX",
    price: 9900,
    category: "클렌징",
  },
  {
    id: "2",
    name: "그린티 클렌징 폼",
    brand: "이니스프리",
    price: 8500,
    category: "클렌징",
  },
  {
    id: "3",
    name: "딥 클린 클렌징 오일",
    brand: "바닐라코",
    price: 24000,
    category: "클렌징",
  },

  // 토너
  {
    id: "4",
    name: "어성초 77 수딩 토너",
    brand: "아누아",
    price: 19800,
    category: "토너",
  },
  {
    id: "5",
    name: "다이브인 저분자 히알루론산 토너",
    brand: "토리든",
    price: 16900,
    category: "토너",
  },
  {
    id: "6",
    name: "약산성 진정 토너",
    brand: "라운드랩",
    price: 22000,
    category: "토너",
  },

  // 세럼·앰플
  {
    id: "7",
    name: "비타 C 플러스 세럼",
    brand: "메디힐",
    price: 26000,
    category: "세럼",
  },
  {
    id: "8",
    name: "어드밴스드 스네일 96 뮤신 파워 에센스",
    brand: "COSRX",
    price: 21000,
    category: "세럼",
  },
  {
    id: "9",
    name: "다이브인 세럼",
    brand: "토리든",
    price: 18900,
    category: "세럼",
  },
  {
    id: "10",
    name: "레티놀 시카 흔적 앰플",
    brand: "닥터지",
    price: 32000,
    category: "세럼",
  },
  {
    id: "11",
    name: "글루타치온 브라이트닝 앰플",
    brand: "메디큐브",
    price: 34000,
    category: "세럼",
  },

  // 크림·모이스처라이저
  {
    id: "12",
    name: "레드 블레미쉬 클리어 수딩 크림",
    brand: "닥터지",
    price: 25000,
    category: "크림",
  },
  {
    id: "13",
    name: "시카페어 크림",
    brand: "닥터자르트",
    price: 42000,
    category: "크림",
  },
  {
    id: "14",
    name: "블랙 티 유스 인핸싱 크림",
    brand: "이니스프리",
    price: 38000,
    category: "크림",
  },
  {
    id: "15",
    name: "얼티메이트 세라마이드 배리어 크림",
    brand: "에스트라",
    price: 29000,
    category: "크림",
  },

  // 선케어
  {
    id: "16",
    name: "에어리 선크림 SPF50+ PA++++",
    brand: "라운드랩",
    price: 18000,
    category: "선케어",
  },
  {
    id: "17",
    name: "릴리프 선 라이스 프로바이오틱스",
    brand: "뷰티오브조선",
    price: 16000,
    category: "선케어",
  },
  {
    id: "18",
    name: "워터리 선 젤 SPF50+",
    brand: "이솔",
    price: 21000,
    category: "선케어",
  },

  // 마스크·스페셜
  {
    id: "19",
    name: "티트리 카밍 시트마스크",
    brand: "메디힐",
    price: 2000,
    category: "마스크",
  },
  {
    id: "20",
    name: "제로 모공 클레이 마스크",
    brand: "이니스프리",
    price: 14000,
    category: "마스크",
  },
  {
    id: "21",
    name: "AHA/BHA 클래리파잉 트리트먼트 토너",
    brand: "COSRX",
    price: 17000,
    category: "각질케어",
  },
  {
    id: "22",
    name: "슈퍼 마이크로 필링 부스터",
    brand: "메디큐브",
    price: 28000,
    category: "각질케어",
  },

  // 아이·립
  {
    id: "23",
    name: "콜라겐 아이 크림",
    brand: "구달",
    price: 19000,
    category: "아이케어",
  },
  {
    id: "24",
    name: "립 슬리핑 마스크",
    brand: "라네즈",
    price: 22000,
    category: "립케어",
  },
];

/**
 * 이름·브랜드·카테고리를 부분 일치로 찾는다.
 * 공백으로 나눈 모든 토큰이 포함돼야 하므로 "닥터지 크림" 같은 조합 검색이 된다.
 */
export function searchProducts(query: string): Product[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return PRODUCTS.filter((product) => {
    const haystack =
      `${product.name} ${product.brand} ${product.category}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/** 검색 전에 보여줄 인기 상품. 인덱스가 아니라 id로 고르므로 목록 순서가 바뀌어도 안전하다. */
const POPULAR_IDS = ["12", "8", "17", "5"];
export const POPULAR_PRODUCTS: readonly Product[] = PRODUCTS.filter((p) =>
  POPULAR_IDS.includes(p.id),
);
