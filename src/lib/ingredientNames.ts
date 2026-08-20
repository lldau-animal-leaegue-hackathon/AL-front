/**
 * 성분명 정규화 — 지식 테이블과 제품 성분을 잇는 다리.
 *
 * 시드·수확된 지식에는 "비타민씨(아스코빅애씨드)", "클레이(카올린·벤토나이트)" 같은
 * **복합 표기**가 들어 있고, 제품의 `ingredients` 에는 "아스코빅애씨드" 같은
 * 단일 표기가 들어 있다. 문자열이 달라도 같은 성분이면 이어 줘야 지식이 쓰인다.
 */

/**
 * 별칭 확장: "비타민씨(아스코빅애씨드)" → ["비타민씨(아스코빅애씨드)", "비타민씨", "아스코빅애씨드"]
 * 괄호 안이 `·`, `,`, `/` 로 나뉘어 있으면 각각을 별칭으로 본다
 * ("클레이(카올린·벤토나이트)" → 클레이, 카올린, 벤토나이트).
 */
export function ingredientAliases(name: string): string[] {
  const out = new Set<string>();
  const trimmed = name.trim();
  if (!trimmed) return [];
  out.add(trimmed);

  const match = trimmed.match(/^([^(（]+)[(（]([^)）]+)[)）]$/);
  if (match) {
    out.add(match[1].trim());
    for (const part of match[2].split(/[·,/]/)) {
      const alias = part.trim();
      if (alias) out.add(alias);
    }
  }
  return [...out];
}

/**
 * 두 표기가 같은 성분을 가리키는가.
 *
 * 별칭끼리 정확 일치가 우선이고, 포함 관계(2자 이상)도 같은 것으로 본다 —
 * 표기가 흔들리기 때문이다("판테놀"/"디판테놀", "병풀추출물"/"센텔라아시아티카(병풀추출물)").
 * ponytail: 포함 매칭은 드물게 과하게 잡을 수 있다. 지식이 수천 행이 되면
 * 정규화 컬럼(canonical name)을 두는 쪽으로 올린다.
 */
export function sameIngredient(a: string, b: string): boolean {
  const aliasesA = ingredientAliases(a);
  const aliasesB = ingredientAliases(b);
  for (const x of aliasesA) {
    for (const y of aliasesB) {
      if (x === y) return true;
      if (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))) {
        return true;
      }
    }
  }
  return false;
}
