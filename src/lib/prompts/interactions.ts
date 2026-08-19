/**
 * "선반 성분 상호작용 분석" 프롬프트 — **서버 전용**. 이 파일이 정본이다.
 *
 * 입력은 사용자의 선반 전체(제품명·카테고리·성분)이고, 출력은 네 갈래다:
 *  - skin_type_cautions : 피부 타입(4종)별로 주의할 보유 성분
 *  - conflicts          : 서로 다른 제품에 나뉜 성분끼리의 충돌(같이 쓰면 나쁨)
 *  - synergies          : 함께 쓰면 좋은 조합
 *  - suggestions        : 보유 구성에 **없는** 성분 중 추가하면 좋을 것
 *
 * 기존 주의사항 프롬프트(warnings.ts)가 "단독 사용 기준"(규칙 5)이라 제품 **간**
 * 관계를 다루지 못했다 — 그 빈자리를 이 프롬프트가 채운다(계획서 2026-08-20).
 */

export type InteractionsInput = {
  products: {
    productName: string;
    category: string;
    ingredients: string[];
  }[];
};

/** 화면·라우트가 같은 상한을 본다. 넘으면 라우트가 경고 로그 후 자른다. */
export const MAX_CONFLICTS = 8;
export const MAX_SYNERGIES = 8;
/** 타입당 3개 안팎 × 4타입 */
export const MAX_TYPE_CAUTIONS = 12;
export const MAX_SUGGESTIONS = 4;

/** 출력 `skin_type` 이 가질 수 있는 값. 이 밖의 값은 라우트가 버린다. */
export const SKIN_TYPES = ["건성", "지성", "복합성", "민감성"] as const;

export function buildInteractionsPrompt(input: InteractionsInput): string {
  const payload = JSON.stringify(
    {
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
아래는 한 사용자가 보유한 스킨케어 제품 전체입니다. 제품들 사이의 성분 상호작용을 분석하세요.

입력 정보:
${payload}

규칙:
1. 분석 근거는 입력된 제품의 ingredients 로 한정하세요. conflicts·synergies 의 ingredients 와 products 에는 입력에 실제로 존재하는 성분명·제품명만 그대로 쓰세요.
2. 잘 알려진 성분 특성·상호작용만 근거로 하세요. 확신할 수 없으면 지어내지 말고 해당 배열을 빈 배열([])로 두세요.
3. conflicts 는 **서로 다른 제품에 나뉘어 있는** 성분 조합 중 함께 사용하면 자극·효과 저하가 잘 알려진 것만 넣으세요(예: 레티놀과 고농도 비타민C). 같은 제품 안에 이미 배합된 조합은 넣지 마세요. synergies 도 같은 기준으로, 함께 사용하면 효과가 좋아진다고 잘 알려진 조합만 넣으세요(예: 나이아신아마이드와 레티놀).
4. skin_type_cautions 는 "건성", "지성", "복합성", "민감성" 네 타입 각각에 대해 보유 성분 중 그 타입이 주의할 것만 넣으세요. 해당 성분이 없는 타입은 항목을 만들지 마세요. skin_type 값은 반드시 위 네 단어 중 하나만 쓰세요.
5. suggestions 는 입력에 **없는** 성분 중 보유 구성을 보완할 잘 알려진 성분만 넣고, reason 에 보유 성분·제품과의 관계를 밝히세요(예: "레티놀을 쓰고 있어 진정 성분인 판테놀이 도움이 됩니다").
6. 특정 질환을 진단하거나 단정하지 마세요("~피부의 경우 자극이 될 수 있습니다" 형태로 쓰세요). 의학적 치료 표현을 쓰지 마세요.
7. 개수 상한: conflicts 최대 ${MAX_CONFLICTS}개, synergies 최대 ${MAX_SYNERGIES}개, skin_type_cautions 최대 ${MAX_TYPE_CAUTIONS}개, suggestions 최대 ${MAX_SUGGESTIONS}개. description 과 caution 은 1~2문장으로 간결하게 쓰세요.
8. 반드시 아래 JSON 형식으로만 응답하세요. 설명, 코드블록 표시, 추가 텍스트를 포함하지 마세요.

출력 형식 (string 값은 모두 한국어):
{
  "skin_type_cautions": [
    { "skin_type": string, "ingredient": string, "products": string[], "caution": string }
  ],
  "conflicts": [
    { "ingredients": string[], "products": string[], "description": string }
  ],
  "synergies": [
    { "ingredients": string[], "products": string[], "description": string }
  ],
  "suggestions": [
    { "ingredient": string, "reason": string }
  ]
}`;
}
