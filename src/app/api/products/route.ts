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
import { LIMITS, text, textArray } from "@/lib/db/input";
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

  const productName = text(body.productName, LIMITS.productName);
  if (!productName) {
    return Response.json(
      {
        message: `productName 은 필수이고 ${LIMITS.productName}자 이하여야 합니다.`,
      },
      { status: 400 },
    );
  }

  /*
   * ⚠️ 브랜드 미상을 NULL 로 넣으면 안 된다 — MySQL/MariaDB 는 NULL 끼리를 중복으로 보지 않아
   *    uk_products_name_brand 가 작동하지 않고 같은 제품이 계속 쌓인다. 빈 문자열로 정규화한다.
   *    (그래서 `text()` 대신 직접 다룬다 — 빈 문자열이 유효한 값이다.)
   */
  const brand =
    typeof body.productCompany === "string" ? body.productCompany.trim() : "";
  if (brand.length > LIMITS.brand) {
    return Response.json(
      { message: `브랜드는 ${LIMITS.brand}자 이하여야 합니다.` },
      { status: 400 },
    );
  }

  const category = text(body.category, LIMITS.category) ?? "미분류";

  // 빈 배열은 정상이다(프롬프트 규칙: 확신 없으면 []). 실패로 바꾸지 않는다.
  const ingredients = textArray(body.ingredients ?? [], {
    maxItems: 300,
    maxLength: 200,
  });
  if (!ingredients) {
    return Response.json(
      { message: "ingredients 형식이 올바르지 않거나 너무 많습니다." },
      { status: 400 },
    );
  }

  const thumbnail =
    typeof body.thumbnail === "string" && body.thumbnail
      ? body.thumbnail
      : null;
  if (thumbnail && thumbnail.length > LIMITS.thumbnail) {
    return Response.json(
      { message: "이미지가 너무 큽니다. 다시 촬영해 주세요." },
      { status: 400 },
    );
  }

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
       * 카탈로그에 없으면 넣고, 있으면 갱신한다.
       * id 를 돌려받아야 하는데 PK 가 UUID 라 LAST_INSERT_ID 트릭을 쓸 수 없다 —
       * UPSERT 후 (name, brand) 로 다시 조회한다. 동시에 같은 제품이 들어와도
       * 유니크 키가 막아 주므로 이 순서가 안전하다.
       *
       * ⛔ **빈 값으로 덮지 않는다.** 검색이나 수동 입력으로 같은 제품을 다시 담으면
       *    ingredients 가 `[]`, category 가 "미분류" 로 오는데, 그대로 UPDATE 하면
       *    **사진에서 추출해 둔 성분이 그 제품을 담은 모든 사용자 기준으로 사라진다.**
       *    공유 카탈로그라 피해가 나에게 그치지 않고, 성분은 알레르기와 직결된다.
       */
      await conn.execute(
        `INSERT INTO products (id, name, brand, category, ingredients, ingredient_source)
         VALUES (UUID(), ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           category = IF(VALUES(category) = '미분류', category, VALUES(category)),
           ingredients = IF(JSON_LENGTH(VALUES(ingredients)) > 0,
                            VALUES(ingredients), ingredients),
           ingredient_source = IF(JSON_LENGTH(VALUES(ingredients)) > 0,
                                  VALUES(ingredient_source), ingredient_source)`,
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

      /*
       * 이미 선반에 있으면 사진만 갱신한다(같은 제품을 다시 찍어 등록한 경우).
       * ⛔ `COALESCE` 가 필요하다 — 사진 없이 다시 담으면 thumbnail 이 NULL 로 오는데,
       *    그대로 덮으면 **사용자가 직접 찍은 사진이 지워지고 복구 수단이 없다**
       *    (개인 데이터라 공유 카탈로그에는 사본이 없다).
       */
      await conn.execute(
        `INSERT INTO shelf_items (id, user_id, product_id, thumbnail)
         VALUES (UUID(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE thumbnail = COALESCE(VALUES(thumbnail), thumbnail)`,
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
  const warnings = textArray(body.warnings, { maxItems: 20, maxLength: 500 });
  if (!id || !warnings) {
    return Response.json(
      { message: "id 와 warnings 배열이 필요합니다." },
      { status: 400 },
    );
  }

  /*
   * ⛔ 빈 배열로 덮지 않는다. 주의사항이 없는 제품은 프롬프트 규칙 6 의 고정 문구가 오므로
   *    빈 배열은 정상 응답이 아니고, 그대로 저장하면 **이미 만들어 둔 주의사항이 사라진다.**
   */
  if (warnings.length === 0) {
    return Response.json(
      { message: "warnings 가 비어 있습니다." },
      { status: 400 },
    );
  }

  try {
    /*
     * **내 선반에 있는 제품만** 고칠 수 있다. 공유 카탈로그라 소유자 개념이 없지만,
     * 이것만으로도 임의 id 를 넣어 남의 주의사항을 지우는 경로는 막힌다.
     * ⚠️ 완전한 방어는 아니다 — 같은 제품을 자기 선반에 담으면 다시 고칠 수 있다.
     *    카탈로그를 공유하기로 한 결정의 필연적 결과이고, 되돌리려면 그 결정을 바꿔야 한다.
     */
    const changed = await execute(
      `UPDATE products p
         JOIN shelf_items s ON s.product_id = p.id AND s.user_id = ?
          SET p.warnings = ?
        WHERE p.id = ?`,
      [await currentUserId(), JSON.stringify(warnings), id],
    );
    if (changed === 0) {
      return Response.json(
        { message: "내 선반에서 해당 제품을 찾을 수 없습니다." },
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
