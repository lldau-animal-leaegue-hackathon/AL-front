/**
 * "스킨케어 루틴 작성" 프롬프트 — **서버 전용**. 이 파일이 정본이다.
 *
 * ⭐ 이 프롬프트가 이 서비스의 차별점을 **규칙으로 강제**하는 자리다. 문구를 고칠 때
 *    아래 세 가지가 왜 규칙인지 알고 고쳐야 한다 — 완화하면 그냥 또 하나의 추천 앱이 된다:
 *
 *  - **규칙 3(제공된 products만 사용)** — 없는 제품을 추천하지 않는다. 이 앱은 커머스가
 *    아니라 "이미 가진 것을 잘 쓰게 하는" 도구다. 이 줄을 빼면 사용자가 살 수 없는 제품이
 *    루틴에 들어가고, 제품이 없어 루틴을 못 지키는 원래 문제로 되돌아간다.
 *  - **규칙 2(estimated_time 합 ≤ usable_time)** — "아침 3분"인 사람에게 7단계를 주면
 *    지키지 못할 계획이 된다. 시간 예산은 기능이 아니라 이 앱의 전제다.
 *  - **규칙 6(성분 충돌 회피)** — 레티놀 × AHA 처럼 같이 쓰면 안 되는 조합을 피한다.
 *    사용자가 전성분 수십 종을 대조해 판단할 수 없기 때문에 앱이 대신 하는 것이고,
 *    이것이 "정보를 보여주는 서비스"와 갈리는 지점이다.
 *
 * ⚠️ 노션 원문과의 차이 (누적):
 *   - `how_to_use` 를 `string` → **`string[]`** 으로 바꿨다 (Q5, 2026-08-18).
 *     기존 `HowToList` 가 "순서대로 체크하는 체크리스트"라 단일 문자열로는 성립하지 않고,
 *     한국어 문장 분리는 마침표만으로 안 돼 프론트에서 쪼개면 취약하다.
 *   - 최상위에 `concern_summary` 를 추가했다 (사용자 요청 2026-08-20).
 *     루틴 이름을 "블랙헤드 - 저녁 루틴"처럼 짓기 위한 고민 요약 키워드다.
 *   → **노션 기획서도 같이 갱신해야 한다.** 안 하면 두 문서가 갈라진다.
 */

export type RoutineProductInput = {
  productName: string;
  category: string;
  ingredients: string[];
};

export type RoutineInput = {
  /** 피부 고민 */
  wonder: string;
  usableTime: { morning: string; evening: string };
  products: RoutineProductInput[];
};

export function buildRoutinePrompt(input: RoutineInput): string {
  const payload = JSON.stringify(
    {
      wonder: input.wonder,
      usable_time: {
        morning: input.usableTime.morning,
        evening: input.usableTime.evening,
      },
      products: input.products.map((product) => ({
        product_name: product.productName,
        category: product.category,
        ingredients: product.ingredients,
      })),
    },
    null,
    2,
  );

  return `당신은 전문 피부 미용사입니다.
아래 제공되는 제품 정보를 바탕으로 아침/저녁 스킨케어 루틴을 작성하세요.

입력 정보:
${payload}

규칙:
1. wonder를 기반으로 어떤 케어에 우선순위를 둘지 결정하세요. 단, 의학적 진단(예: 여드름의 원인, 피부질환명 등)을 내리지 마세요. 증상이 심각해 보이면 tips 또는 warning에 "증상이 지속되면 피부과 상담을 권장합니다"를 포함하세요.
2. 아침/저녁 각각 usable_time에 제시된 시간 범위를 초과하지 않도록 루틴의 개수와 단계를 조절하세요. estimated_time의 합이 usable_time을 넘지 않아야 합니다.
3. 제공된 products만 사용하세요. 새로운 제품을 만들어내지 마세요.
4. 같은 카테고리의 제품이 여러 개 있다면 아침/저녁에 다르게 배분해 재사용을 최소화하세요. 단, 필수 단계(클렌징, 보습 등)에 사용 가능한 제품이 하나뿐이라면 재사용해도 됩니다.
5. 일반적인 스킨케어 순서를 따르세요: (아침) 클렌징 → 토너/스킨 → 에센스/세럼 → 로션/크림 → 자외선차단제, (저녁) 클렌징(이중 세안 필요 시 포함) → 토너 → 에센스/세럼 → 크림/영양크림.
5-1. morning/evening 배열의 각 원소(routine_name)는 하나의 단계(클렌징, 토너, 에센스/세럼, 로션/크림, 자외선차단제 중 하나)에만 대응해야 합니다. 여러 단계를 하나의 routine_name으로 합치지 마세요. 예를 들어 클렌징과 토너는 반드시 서로 다른 두 개의 객체로 분리하세요.
5-2. 하나의 routine_name(단계)에는 원칙적으로 제품 1개만 사용하세요. 같은 단계에 여러 제품을 동시에 쓰는 경우(예: 이중 세안처럼 명확히 필요한 경우)에만 using_product에 2개 이상을 넣고, 그 외에는 항상 제품 1개당 1개의 routine_name을 생성하세요.
6. ingredients를 확인하여 상충 가능성이 있는 성분(예: 레티놀류와 고농도 AHA/BHA, 비타민C와 특정 자극 성분 등)이 같은 루틴에 함께 사용되지 않도록 배치하세요. 상충 가능성이 있다면 warning에 명시하세요.
7. 보유 제품 중 필수 단계에 해당하는 제품이 없다면, 해당 단계는 루틴에서 생략하고 tips에 "OO 단계에 사용할 제품이 없어 생략되었습니다"라고 안내하세요.
8. how_to_use는 사용자가 순서대로 따라 할 수 있는 동작 단위로 나눠 배열로 작성하세요.
9. concern_summary에는 wonder의 핵심 고민을 2~8자의 짧은 한국어 명사구로 요약해 적으세요(예: "블랙헤드", "모공·유분", "수분 부족"). 의학적 진단명을 쓰지 마세요.
10. 반드시 아래 JSON 형식으로만 응답하세요. 설명, 코드블록 표시, 추가 텍스트를 포함하지 마세요.

출력 형식 (string 값은 모두 한국어):
{
  "concern_summary": string, // wonder 의 핵심 고민 요약 (2~8자)
  "morning": [
    {
      "routine_name": string, // 루틴 이름
      "estimated_time": int, // 초 단위
      "using_product": string[], // 사용할 제품
      "how_to_use": string[], // 화장품 사용 방법 — 순서대로 수행할 단계별 문장
      "tips": string[], // 화장품 사용 팁
      "warning": string[] // 화장품 사용 시, 주의사항
    }
  ],
  "evening": [ /* 위와 동일 구조 */ ]
}`;
}
