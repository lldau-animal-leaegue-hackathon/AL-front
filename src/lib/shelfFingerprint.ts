/**
 * 선반 지문 — 선반 분석 캐시(`shelf_reports`)의 무효화 키. **서버 전용**(node:crypto).
 *
 * 정렬된 `(product_id, ingredients)` 쌍의 SHA-256 이다.
 *
 * `products.updated_at` 을 쓰지 않는 이유(refuter 검증 2026-08-20):
 *  - **과잉 무효화** — warnings 저장·공유 이미지 채우기에도 `updated_at` 이 갱신된다
 *    (`ON UPDATE CURRENT_TIMESTAMP`). 분석 입력(성분)은 안 바뀌었는데 캐시가 죽는다.
 *  - **과소 무효화** — 기존 카탈로그 제품을 선반에 담고 빼는 것은 `products` 행을
 *    안 건드려 감지 자체가 안 된다.
 *
 * 분석 입력이 실제로 달라지는 두 사건만 지문을 바꾼다:
 *  선반 구성 변화(제품 추가·삭제 = id 집합)와 성분 내용 변화(재추출 UPDATE).
 */

import { createHash } from "node:crypto";

export function shelfFingerprint(
  items: readonly { id: string; ingredients: readonly string[] }[],
): string {
  const canonical = [...items]
    .sort((a, b) => a.id.localeCompare(b.id))
    // 성분 배열은 저장된 순서 그대로 쓴다 — 순서까지 내용의 일부다(재추출이면 어차피 바뀐다).
    .map((item) => [item.id, item.ingredients]);

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
