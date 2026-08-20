/**
 * 성분 지식 API — DB 지식(시드 + 리포트 수확)을 읽는다. **AI 호출이 아니다**(수백 ms).
 * 응답은 DB 계열 라우트 관례대로 camelCase 다(LLM raw 반환과 다른 층위).
 */

import { api } from "@/api/client";

export type IngredientKnowledge = {
  name: string;
  /** 이런 고민에 도움 — **빈 배열이 정상이다**(아직 지식이 없을 뿐, 성분이 나쁜 게 아니다) */
  helps: { scenario: string; description: string; caution: string | null }[];
  typeCautions: { skinType: string; description: string }[];
  synergies: { partner: string; description: string }[];
  conflicts: { partner: string; description: string }[];
};

export type ConcernKnowledge = {
  scenarios: {
    scenario: string;
    ingredients: {
      name: string;
      description: string;
      caution: string | null;
    }[];
  }[];
};

export function fetchIngredientKnowledge(input: { name: string }) {
  return api.get<IngredientKnowledge>(
    `/knowledge/ingredient?name=${encodeURIComponent(input.name)}`,
  );
}

export function fetchConcernKnowledge() {
  return api.get<ConcernKnowledge>("/knowledge/concerns");
}
