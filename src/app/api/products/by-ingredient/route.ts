/**
 * GET /api/products/by-ingredient?name=판테놀 — 그 성분이 든 제품을 카탈로그에서 찾는다.
 *
 * **웹 검색을 쓰지 않는다**(concern-flow Q4, 2026-08-19 실측 근거).
 * 성분명으로 웹 검색을 시키면 모델이 도구를 호출하지 않고 기억으로 답하고,
 * 화해 검색 자체도 성분 필터가 아니라 제품명 텍스트 매치였다.
 * 여기 있는 `ingredients` 는 실제로 추출·저장된 값이라 **"관련 있어 보임"이 아니라 확정**이다.
 *
 * ⛔ `shelf_items.thumbnail`(개인 사진)을 가져오지 않는다 — 남의 사진이 노출된다.
 *    공유해도 되는 이미지는 `products.image` 뿐이다(002 마이그레이션).
 */

import { dbErrorResponse, selectRows } from "@/lib/db/pool";
import { toProduct } from "@/lib/db/rows";

export const runtime = "nodejs";

const LIMIT = 12;

/** 성분명 길이 상한. 컬럼 값이 아니라 검색어라 넉넉할 이유가 없다. */
const MAX_NAME_LENGTH = 60;

/*
 * `JSON_SEARCH` 로 **배열 원소 안에서** 찾는다. 단순 LIKE 로 컬럼 전체를 훑으면
 * 다른 필드(제품명 등)에 우연히 들어간 글자까지 걸린다.
 * 부분 일치를 쓰는 이유는 표기가 흔들리기 때문이다 — "판테놀" / "디판테놀" / "판테놀(비타민B5)".
 *
 * 인덱스를 타지 못하지만 카탈로그 규모가 작아 문제되지 않는다.
 * ponytail: 느려지면 성분 전용 테이블로 정규화한다.
 */
const BY_INGREDIENT_SQL = `
  SELECT p.id, p.name, p.brand, p.category, p.ingredients, p.warnings, p.image,
         COUNT(s.id) AS shelf_count
    FROM products p
    LEFT JOIN shelf_items s ON s.product_id = p.id
   WHERE JSON_SEARCH(p.ingredients, 'one', CONCAT('%', ?, '%')) IS NOT NULL
   GROUP BY p.id, p.name, p.brand, p.category, p.ingredients, p.warnings,
            p.image, p.updated_at
   ORDER BY shelf_count DESC, p.updated_at DESC
   LIMIT ${LIMIT}
`;

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";

  if (!name) {
    return Response.json({ message: "성분명이 필요합니다." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return Response.json(
      { message: `성분명은 ${MAX_NAME_LENGTH}자 이하여야 합니다.` },
      { status: 400 },
    );
  }

  try {
    const rows = await selectRows(BY_INGREDIENT_SQL, [name]);

    /*
     * ⭐ 빈 배열이 정상이다. **카탈로그에 그 성분이 든 제품이 아직 없다는 뜻**이지
     *    그런 제품이 세상에 없다는 뜻이 아니다. 화면은 그 차이를 말해 줘야 한다
     *    ("아직 담긴 제품이 없어요 — 스캔에서 찾아 담아 보세요").
     */
    return Response.json(rows.map(toProduct).filter((p) => p !== null));
  } catch (error) {
    return dbErrorResponse("api/products/by-ingredient GET", error);
  }
}
