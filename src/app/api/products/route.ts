/**
 * 내 선반 — `shelf_items` × `products`.
 *
 * ⭐ `products` 는 **전체 공유 카탈로그**다(사용자 결정). 누가 등록했든 모두가 쓴다.
 *    그래서 같은 제품이 중복으로 쌓이지 않게 (name, brand) 유니크 키로 UPSERT 한다.
 *    사용자가 직접 찍은 사진(`thumbnail`)만 개인 것이라 `shelf_items` 에 둔다.
 */

import {
  enqueueWarningsGeneration,
  NO_INGREDIENTS_WARNING,
} from "@/lib/ai/warningsQueue";
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
import { fetchImageAsDataUrl } from "@/lib/images";

// mysql2 는 Node API 를 쓴다. Edge 런타임에서는 동작하지 않는다.
export const runtime = "nodejs";

const LIST_SQL = `
  SELECT p.id, p.name, p.brand, p.category, p.ingredients, p.warnings, p.image,
         s.thumbnail, s.created_at
    FROM shelf_items s
    JOIN products p ON p.id = s.product_id
   WHERE s.user_id = ?
   ORDER BY s.created_at
`;

export async function GET() {
  try {
    const rows = await selectRows(LIST_SQL, [await currentUserId()]);
    const products = rows.map(toProduct).filter((p) => p !== null);

    /*
     * 주의사항 재큐잉(M4) — 큐는 인메모리라 재시작·배포로 유실되고, 그러면 warnings 가
     * NULL 로 고착돼 홈이 영구 "분석 중"이 된다. 조회 때마다 밀린 행을 다시 태운다.
     * 큐의 Set 이 대기·실행 중 id 를 걸러 멱등이고, 응답을 기다리지 않는다(등록 UX 와 동일).
     */
    for (const p of products) {
      if (p.warnings !== undefined) continue;
      if (p.ingredients.length === 0) {
        // 큐는 빈 성분을 받지 않는다(규칙 6). 이관 등으로 남은 행은 POST 와 같은 고정 문구로 채운다.
        void execute(
          `UPDATE products SET warnings = ? WHERE id = ? AND warnings IS NULL`,
          [JSON.stringify([NO_INGREDIENTS_WARNING]), p.id],
        ).catch((error: unknown) => {
          console.warn(
            `[api/products] "${p.productName}" 고정 문구 저장 실패:`,
            error,
          );
        });
        continue;
      }
      enqueueWarningsGeneration({
        id: p.id,
        name: p.productName,
        category: p.category,
        ingredients: p.ingredients,
      });
    }

    return Response.json(products);
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
  /** 검색 결과에서 온 외부 이미지 주소. 서버가 받아서 data URL 로 바꾼다. */
  thumbnailUrl?: unknown;
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

  const uploaded =
    typeof body.thumbnail === "string" && body.thumbnail
      ? body.thumbnail
      : null;
  if (uploaded && uploaded.length > LIMITS.thumbnail) {
    return Response.json(
      { message: "이미지가 너무 큽니다. 다시 촬영해 주세요." },
      { status: 400 },
    );
  }

  /*
   * ⭐ **두 이미지는 저장 위치가 다르다**(002 마이그레이션).
   *  - 내가 찍은 사진 → `shelf_items.thumbnail` (개인. 나만 본다)
   *  - 검색에서 온 이미지 → `products.image` (공유. 인기 제품 등에 남에게 보인다)
   * 섞으면 남의 개인 사진이 카탈로그에 노출된다.
   *
   * ⛔ 주소는 클라이언트가 준 값이라 믿지 않는다. `fetchImageAsDataUrl` 이 허용 호스트인지
   *    다시 확인한다(SSRF 방어). 실패하면 `null` 이고 **등록은 그대로 진행한다** —
   *    이미지는 부가 정보라 이것 때문에 제품 등록이 막히면 안 된다.
   */
  const thumbnail = uploaded;
  const sharedImage =
    typeof body.thumbnailUrl === "string"
      ? await fetchImageAsDataUrl(body.thumbnailUrl)
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
      /*
       * ⚠️ **`VALUES()` 를 함수 인자로 넘기지 않는다.** MariaDB 에서
       *    `JSON_LENGTH(VALUES(col))` 은 값이 제대로 전달되지 않아
       *    `Unexpected end of JSON text` 로 죽는다(2026-08-18 실측).
       *    그래서 "덮을지 말지"를 SQL 이 아니라 여기서 판단한다 — 읽기도 더 쉽다.
       */
      await conn.execute(
        `INSERT IGNORE INTO products
           (id, name, brand, category, ingredients, ingredient_source, image)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [
          productName,
          brand,
          category,
          JSON.stringify(ingredients),
          source,
          sharedImage,
        ],
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

      // 성분을 실제로 가져왔을 때만 갱신한다. 빈 배열로 덮으면 남이 추출해 둔 성분이 사라진다.
      if (ingredients.length > 0) {
        await conn.execute(
          `UPDATE products
              SET category = ?, ingredients = ?, ingredient_source = ?
            WHERE id = ?`,
          [category, JSON.stringify(ingredients), source, id],
        );
      }

      /*
       * 공유 이미지는 **비어 있을 때만** 채운다. 이미 있는 것을 덮지 않는 이유는
       * 성분과 같다 — 카탈로그는 여러 사용자가 함께 쓰므로, 나중에 담는 사람이
       * 이미지를 못 얻었다고 앞사람 것이 사라지면 안 된다.
       */
      if (sharedImage) {
        await conn.execute(
          `UPDATE products SET image = ? WHERE id = ? AND image IS NULL`,
          [sharedImage, id],
        );
      }

      // 선반에 없으면 담는다. 이미 있으면 사진만 따로 판단한다.
      await conn.execute(
        `INSERT IGNORE INTO shelf_items (id, user_id, product_id, thumbnail)
         VALUES (UUID(), ?, ?, ?)`,
        [userId, id, thumbnail],
      );

      /*
       * 새로 찍은 사진이 있을 때만 덮는다.
       * 사진 없이 다시 담을 때 NULL 로 덮으면 **사용자가 직접 찍은 사진이 지워지고
       * 복구 수단이 없다**(개인 데이터라 공유 카탈로그에 사본이 없다).
       */
      if (thumbnail) {
        await conn.execute(
          `UPDATE shelf_items SET thumbnail = ?
            WHERE user_id = ? AND product_id = ?`,
          [thumbnail, userId, id],
        );
      }

      return id;
    });

    const rows = await selectRows(
      `${LIST_SQL.replace("s.user_id = ?", "s.user_id = ? AND p.id = ?")}`,
      [userId, productId],
    );
    const created = rows.map(toProduct).find((p) => p !== null);

    /*
     * 주의사항 지연 생성(2026-08-20) — 예전에는 홈 화면이 클라이언트에서 생성했는데,
     * 그 호출들이 사용자 가드를 독점해 다른 AI 기능이 전부 429 로 튕겼다.
     * 등록 시점에 서버 백그라운드 큐로 옮긴다. 응답을 기다리지 않는다(등록 UX 불변).
     * 성분이 없으면 결과가 정해져 있으므로(규칙 6) 호출 없이 고정 문구를 바로 저장한다.
     */
    if (created && created.warnings === undefined) {
      if (created.ingredients.length === 0) {
        await execute(
          `UPDATE products SET warnings = ? WHERE id = ? AND warnings IS NULL`,
          [JSON.stringify([NO_INGREDIENTS_WARNING]), productId],
        );
      } else {
        enqueueWarningsGeneration({
          id: productId,
          name: created.productName,
          category: created.category,
          ingredients: created.ingredients,
        });
      }
    }

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

  try {
    /*
     * **내 선반에 있는 제품만** 고칠 수 있다. 공유 카탈로그라 소유자 개념이 없지만,
     * 이것만으로도 임의 id 를 넣어 남의 주의사항을 지우는 경로는 막힌다.
     * ⚠️ 완전한 방어는 아니다 — 같은 제품을 자기 선반에 담으면 다시 고칠 수 있다.
     *    카탈로그를 공유하기로 한 결정의 필연적 결과이고, 되돌리려면 그 결정을 바꿔야 한다.
     *
     * ⛔ 빈 배열은 **첫 기록(NULL)일 때만** 받는다(2026-08-20).
     *    - 예전에는 전면 거부했는데, 그러면 AI 가 "주의 없음"(빈 배열)을 준 제품이
     *      영영 미기록으로 남아 **홈 재방문마다 30초짜리 생성이 재시도**됐다(refuter 검증).
     *    - '[]' 를 저장하면 "확인했고 주의 없음"이 기록돼 재시도가 1회로 끝난다.
     *      화면(rows.ts)은 NULL(아직 안 만듦)과 [](주의 없음)를 이미 구분한다.
     *    - 기존 주의사항을 빈 배열로 **덮는** 것은 계속 거부한다 — 데이터 손실 가드.
     */
    const changed = await execute(
      warnings.length === 0
        ? `UPDATE products p
             JOIN shelf_items s ON s.product_id = p.id AND s.user_id = ?
              SET p.warnings = ?
            WHERE p.id = ? AND p.warnings IS NULL`
        : `UPDATE products p
             JOIN shelf_items s ON s.product_id = p.id AND s.user_id = ?
              SET p.warnings = ?
            WHERE p.id = ?`,
      [await currentUserId(), JSON.stringify(warnings), id],
    );
    if (changed === 0) {
      return Response.json(
        {
          message:
            warnings.length === 0
              ? "빈 warnings 로는 기존 주의사항을 덮을 수 없습니다."
              : "내 선반에서 해당 제품을 찾을 수 없습니다.",
        },
        { status: warnings.length === 0 ? 409 : 404 },
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
