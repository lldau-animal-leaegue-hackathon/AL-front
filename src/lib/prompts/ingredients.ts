/**
 * "제품 성분 추출" 프롬프트 — **서버 전용**. 이 파일이 정본이다(노션은 사람이 읽는 사본).
 *
 * ⚠️ 노션 원문과의 차이 — `ai-contract-check` 스킬이 요구하는 보고 사항:
 *   원문 입력 스키마는 `product_img: base64 encoded img` 였으나,
 *   헤드리스 Claude 는 base64 를 stdin 으로 받지 않는다. 대신 이미지를 **서버 임시 파일로
 *   저장하고 그 경로를 프롬프트에 넣어 `--allowedTools Read` 로 읽게** 한다.
 *   2026-08-18 실측에서 성분 9개가 순서까지 정확히 추출되는 것을 확인했다.
 */

export type IngredientsInput = {
  productName: string;
  capacity?: string;
  productCompany?: string;
  /** 서버 임시 파일 경로. 없으면 이미지 없이 이름·회사로만 추론한다. */
  imagePath?: string;
};

export function buildIngredientsPrompt(input: IngredientsInput): string {
  const { productName, capacity, productCompany, imagePath } = input;

  // 이미지가 있을 때만 Read 지시를 넣는다. 없는데 넣으면 모델이 없는 파일을 읽으려 한다.
  const readInstruction = imagePath
    ? `먼저 Read 도구로 다음 이미지 파일을 읽으세요: ${imagePath}\n이 이미지가 아래 입력 정보의 product_img 입니다.\n\n`
    : "";

  const payload = JSON.stringify(
    {
      product_name: productName,
      capacity: capacity ?? null,
      product_company: productCompany ?? null,
      product_img: imagePath ? "(위 Read 도구로 읽은 이미지)" : null,
    },
    null,
    2,
  );

  return `당신은 화장품 성분 전문 피부 미용사입니다.
아래 제공되는 제품 정보를 바탕으로 제품명과 전체 성분 목록을 추출해서 알려주세요.

${readInstruction}입력 정보:
${payload}

규칙:
1. product_img가 제공된 경우, 반드시 이미지에 적힌 성분표를 그대로 읽어서 ingredients에 담으세요. 이미지에 없는 성분을 추가하거나 추측하지 마세요.
2. product_img가 없는 경우, product_name과 product_company로 해당 제품이 명확히 특정되고 신뢰할 수 있는 공개 정보가 있을 때만 성분을 채우세요. 확신이 없으면 ingredients를 빈 배열([])로 반환하세요. 절대 성분을 지어내지 마세요.
2-1. 만약 제품의 주요 성분이 명시된 정보가 있을 때는, 성분을 채우세요.
3. 성분명은 원문(이미지)에 표기된 순서와 표기법을 그대로 유지하세요.
4. 원문(이미지)에 표기된 성분명이 한글과 다른 언어가 함께 표기된 경우 한글을 우선으로 표기하세요.
5. 반드시 아래 JSON 형식으로만 응답하세요. 설명, 코드블록 표시, 추가 텍스트를 포함하지 마세요.

출력 형식 (category 값은 한국어):
{
  "product_name": string, // 제품 이름
  "category": string, // 제품 카테고리
  "ingredients": string[] // 성분
}`;
}
