/**
 * 내 선반 — `shelf_items` × `products`.
 *
 * ⭐ `products` 는 **전체 공유 카탈로그**다(사용자 결정). 누가 등록했든 모두가 쓴다.
 *    그래서 같은 제품이 중복으로 쌓이지 않게 (name, brand) 유니크 키로 UPSERT 한다.
 *    사용자가 직접 찍은 사진(`thumbnail`)만 개인 것이라 `shelf_items` 에 둔다.
 */

import { currentUserId } from "@/lib/auth/anonUser";
import {
  dbErrorResponse,
  ensureUser,
  execute,
  selectRows,
  withTransaction,
} from "@/lib/db/pool";
import { toProduct } from "@/lib/db/rows";

// mysql2 는 Node API 를 쓴다. Edge 런타임에서는 동작하지 않는다.
export const runtime = "nodejs";

const LIST_SQL = `
  SELECT p.id, p.name, p.brand, p.category, p.ingredients, p.warnings,
         s.thumbnail, s.created_at
    FROM shelf_items s
    JOIN products p ON p.id = s.product_id
   WHERE s.user_id = ?
   ORDER BY s.created_at
`;

export async function GET() {
  try {
    const rows = await selectRows(LIST_SQL, [await currentUserId()]);
    return Response.json(rows.map(toProduct).filter((p) => p !== null));
  } catch (error) {
    return dbErrorResponse("api/products GET", error);
  }
}

type Body = {
  productName?: unknown;
  productCompany?: unknown;
  category?: unknown;
  ingredients?: unknown;
  thumbnail?: unknown;
  ingredientSource?: unknown;
};

/** `ingredient_source` 는 NOT NULL 이다. 화면이 출처를 표시해야 해서 비워 둘 수 없다. */
const SOURCES = ["photo", "hwahae", "fallback", "manual"];

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  const productName =
    typeof body.productName === "string" ? body.productName.trim() : "";
  if (!productName) {
    return Response.json(
      { message: "productName 은 필수입니다." },
      { status: 400 },
    );
  }

  /*
   * ⚠️ 브랜드 미상을 NULL 로 넣으면 안 된다 — MySQL/MariaDB 는 NULL 끼리를 중복으로 보지 않아
   *    uk_products_name_brand 가 작동하지 않고 같은 제품이 계속 쌓인다. 빈 문자열로 정규화한다.
   */
  const brand =
    typeof body.productCompany === "string" ? body.productCompany.trim() : "";
  const category =
    typeof body.category === "string" && body.category
      ? body.category
      : "미분류";
  // 빈 배열은 정상이다(프롬프트 규칙: 확신 없으면 []). 실패로 바꾸지 않는다.
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients.filter((v): v is string => typeof v === "string")
    : [];
  const thumbnail =
    typeof body.thumbnail === "string" && body.thumbnail
      ? body.thumbnail
      : null;
  const source =
    typeof body.ingredientSource === "string" &&
    SOURCES.includes(body.ingredientSource)
      ? body.ingredientSource
      : "manual";

  try {
    const userId = await currentUserId();

    const productId = await withTransaction(async (conn) => {
      await ensureUser(userId, conn);

      /*
       * 카탈로그에 없으면 넣고, 있으면 성분을 갱신한다.
       * id 를 돌려받아야 하는데 PK 가 UUID 라 LAST_INSERT_ID 트릭을 쓸 수 없다 —
       * UPSERT 후 (name, brand) 로 다시 조회한다. 동시에 같은 제품이 들어와도
       * 유니크 키가 막아 주므로 이 순서가 안전하다.
       */
      await conn.execute(
        `INSERT INTO products (id, name, brand, category, ingredients, ingredient_source)
         VALUES (UUID(), ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           category    = VALUES(category),
           ingredients = VALUES(ingredients)`,
        [productName, brand, category, JSON.stringify(ingredients), source],
      );

      const [found] = await conn.execute(
        `SELECT id FROM products WHERE name = ? AND brand = ?`,
        [productName, brand],
      );
      const row = Array.isArray(found) ? found[0] : undefined;
      const id =
        typeof row === "object" && row !== null && "id" in row
          ? String(row.id)
          : "";
      if (!id) throw new Error("UPSERT 직후 products 행을 찾지 못했습니다.");

      // 이미 선반에 있으면 사진만 갱신한다(같은 제품을 다시 찍어 등록한 경우).
      await conn.execute(
        `INSERT INTO shelf_items (id, user_id, product_id, thumbnail)
         VALUES (UUID(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE thumbnail = VALUES(thumbnail)`,
        [userId, id, thumbnail],
      );

      return id;
    });

    const rows = await selectRows(
      `${LIST_SQL.replace("s.user_id = ?", "s.user_id = ? AND p.id = ?")}`,
      [userId, productId],
    );
    const created = rows.map(toProduct).find((p) => p !== null);

    return Response.json(created ?? { id: productId }, { status: 201 });
  } catch (error) {
    return dbErrorResponse("api/products POST", error);
  }
}

/**
 * 주의사항(`warnings`)을 나중에 채운다. 등록 시점에 만들면 약 34초가 걸려 UX 를 망친다.
 * ⚠️ 공유 카탈로그를 고치는 것이라 **다른 사용자에게도 반영된다** — 주의사항은 제품 고유
 *    속성이라 의도된 동작이다.
 */
export async function PATCH(request: Request) {
  let body: { id?: unknown; warnings?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; warnings?: unknown };
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id || !Array.isArray(body.warnings)) {
    return Response.json(
      { message: "id 와 warnings 배열이 필요합니다." },
      { status: 400 },
    );
  }
  const warnings = body.warnings.filter(
    (v): v is string => typeof v === "string",
  );

  try {
    const changed = await execute(
      `UPDATE products SET warnings = ? WHERE id = ?`,
      [JSON.stringify(warnings), id],
    );
    if (changed === 0) {
      return Response.json(
        { message: "해당 제품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse("api/products PATCH", error);
  }
}

/** 내 선반에서만 뺀다. 공유 카탈로그의 제품 자체는 지우지 않는다. */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ message: "id 가 필요합니다." }, { status: 400 });
  }

  try {
    const changed = await execute(
      `DELETE FROM shelf_items WHERE user_id = ? AND product_id = ?`,
      [await currentUserId(), id],
    );
    return Response.json({ ok: changed > 0 });
  } catch (error) {
    return dbErrorResponse("api/products DELETE", error);
  }
}
