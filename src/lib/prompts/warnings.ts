/**
 * "제품 사용 주의 사항" 프롬프트 — **서버 전용**. 이 파일이 정본이다.
 * 노션 원문과 차이 없음(입력 값만 주입한다).
 */

export type WarningsInput = {
  productName: string;
  category: string;
  ingredients: string[];
};

export function buildWarningsPrompt(input: WarningsInput): string {
  const payload = JSON.stringify(
    {
      product_name: input.productName,
      category: input.category,
      ingredients: input.ingredients,
    },
    null,
    2,
  );

  return `당신은 전문 피부 미용사입니다.
아래에 제공되는 제품 정보를 바탕으로 제품 사용 시 주의 사항을 작성하세요.

입력 정보:
${payload}

규칙:
1. ingredients에 포함된 성분의 알려진 특성(광과민성, 자극성, 건조/유분 유발, 상호작용 등)을 기반으로 주의사항을 작성하세요.
2. 잘 알려지지 않았거나 확신할 수 없는 성분에 대해서는 근거 없이 위험성을 지어내지 마세요. 일반적으로 알려진 성분 특성에 한해서만 작성하세요.
3. 날씨, 계절, 피부 상태에 따른 주의사항은 반드시 해당 성분의 특성과 연관지어 작성하세요. 성분과 무관한 일반론(예: "겨울엔 보습하세요")은 작성하지 마세요.
4. 특정 질환명을 진단하거나 단정하지 마세요(예: "이 성분은 여드름을 유발합니다" 대신 "여드름성 피부의 경우 자극이 될 수 있습니다" 형태로 작성).
5. 이 주의사항은 해당 제품을 단독으로 사용하는 경우를 기준으로 작성하세요.
6. ingredients가 비어있거나 정보가 부족하면, warning에 "성분 정보가 부족하여 구체적인 주의사항을 제공하기 어렵습니다"라는 문구만 포함하세요.
7. 주의사항은 최대 6개 이내로, 중복 없이 간결하게 작성하세요.
8. 반드시 아래 JSON 형식으로만 응답하세요. 설명, 코드블록 표시, 추가 텍스트를 포함하지 마세요.

출력 형식 (string 값은 모두 한국어):
{
  "warning": string[]
}`;
}
