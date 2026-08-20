/**
 * GET /api/products/popular — 많이 담긴 순으로 공유 카탈로그를 준다.
 *
 * `products` 는 전체 공유 카탈로그이고 `shelf_items` 가 "누가 담았는지"다.
 * 담긴 횟수를 세면 인기 제품이 나온다 — 순위를 따로 관리할 필요가 없다.
 * 쓸수록 좋아지는 카탈로그를 만들자던 서버 저장소 결정의 실제 쓸모다.
 *
 * ⛔ **`shelf_items.thumbnail` 을 절대 가져오지 않는다.** 그건 사용자가 직접 찍은 사진이라
 *    남에게 보이면 안 된다. 공유해도 되는 이미지는 `products.image` 하나뿐이다
 *    (`db/migrations/002_product_image.sql` 에 근거가 있다).
 */

import { dbErrorResponse, selectRows } from "@/lib/db/pool";
import { toProduct } from "@/lib/db/rows";

export const runtime = "nodejs";

/** 화면이 그리드로 보여 주는 양. 더 필요하면 검색을 쓰는 게 맞다. */
const LIMIT = 12;

/*
 * ⚠️ 여기서 고르는 컬럼에 개인 데이터가 섞이면 안 된다. `s.thumbnail` 이 없는 것이 의도다.
 * `LIMIT` 은 상수로 박는다 — 바인딩 파라미터로 넘기면 드라이버에 따라 문자열로 인용된다.
 */
const POPULAR_SQL = `
  SELECT p.id, p.name, p.brand, p.category, p.ingredients, p.warnings, p.image,
         COUNT(s.id) AS shelf_count
    FROM products p
    JOIN shelf_items s ON s.product_id = p.id
   GROUP BY p.id, p.name, p.brand, p.category, p.ingredients, p.warnings,
            p.image, p.updated_at
   ORDER BY shelf_count DESC, p.updated_at DESC
   LIMIT ${LIMIT}
`;

export async function GET() {
  try {
    const rows = await selectRows(POPULAR_SQL);

    /*
     * ⭐ 빈 배열이 정상이다. 아무도 아직 담지 않았으면 인기 제품이 없다 —
     *    화면은 시드 카탈로그를 대신 보여 준다(계획서 Q2 결정).
     */
    return Response.json(rows.map(toProduct).filter((p) => p !== null));
  } catch (error) {
    return dbErrorResponse("api/products/popular GET", error);
  }
}
