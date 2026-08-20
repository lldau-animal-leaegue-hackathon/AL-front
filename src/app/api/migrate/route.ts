/**
 * POST /api/migrate — 브라우저 localStorage 에 있던 데이터를 서버로 **1회** 옮긴다.
 *
 * 저장소를 서버로 바꾸기 전에 쓰던 사용자는 기기 안에 제품·루틴·기록을 갖고 있다.
 * 그대로 두면 앱을 열었을 때 전부 사라진 것처럼 보이므로 첫 진입에 한 번 넘긴다.
 *
 * ⚠️ **멱등해야 한다.** 이관이 중간에 끊겨 다시 실행돼도 제품이 두 배가 되면 안 된다.
 *  - 제품:   (name, brand) 유니크 + (user_id, product_id) 유니크로 UPSERT
 *  - 루틴:   **서버에 하나도 없을 때만** 넣는다. 다른 기기에서 만든 루틴을 덮으면 안 된다
 *  - 프로필: 없을 때만
 *  - 기록:   로컬 id 를 그대로 PK 로 써서 중복이면 무시(INSERT IGNORE)
 *
 * `RunStart`(수행 중 표시)는 옮기지 않는다 — 기기별 임시 상태라 서버에 테이블이 없다.
 */

import { currentUserId } from "@/lib/auth/anonUser";
import { isoDate, LIMITS, text, textArray } from "@/lib/db/input";
import { dbErrorResponse, ensureUser, withTransaction } from "@/lib/db/pool";

export const runtime = "nodejs";

/**
 * 썸네일이 실려 있어 본문이 크다. 제품 100개 × 50KB 를 넉넉히 담는 선에서 자른다.
 * 헤더가 없는 요청도 있으므로 없으면 통과시킨다(그 뒤 각 항목 상한이 다시 막는다).
 */
const MAX_BODY_BYTES = 12_000_000;

type Body = {
  products?: unknown;
  routines?: unknown;
  profile?: unknown;
  runs?: unknown;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? { ...value }
    : null;
}

export async function POST(request: Request) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return Response.json(
      { message: "이관할 데이터가 너무 큽니다." },
      { status: 413 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  try {
    const userId = await currentUserId();

    const migrated = await withTransaction(async (conn) => {
      await ensureUser(userId, conn);

      // ── 제품 ────────────────────────────────────────────────
      let products = 0;
      for (const raw of asArray(body.products).slice(0, 200)) {
        const item = asRecord(raw);
        if (!item) continue;

        const name = text(item.productName, LIMITS.productName);
        if (!name) continue;

        // 브랜드 미상은 빈 문자열이어야 유니크 키가 작동한다(NULL 끼리는 중복으로 안 본다).
        const brand =
          typeof item.productCompany === "string"
            ? item.productCompany.trim().slice(0, LIMITS.brand)
            : "";
        const category = text(item.category, LIMITS.category) ?? "미분류";
        const ingredients =
          textArray(item.ingredients ?? [], {
            maxItems: 300,
            maxLength: 200,
          }) ?? [];
        const thumbnail =
          typeof item.thumbnail === "string" &&
          item.thumbnail.length > 0 &&
          item.thumbnail.length <= LIMITS.thumbnail
            ? item.thumbnail
            : null;
        // 로컬 모델에는 출처 필드가 없었다. 사진이 있으면 촬영으로 등록한 것으로 본다.
        const source = thumbnail ? "photo" : "manual";

        /*
         * ⚠️ `VALUES()` 를 `JSON_LENGTH()` 같은 함수 인자로 넘기면 MariaDB 에서 값이
         *    제대로 전달되지 않는다(실측). "덮을지 말지"는 아래에서 앱이 판단한다.
         */
        await conn.execute(
          `INSERT IGNORE INTO products
             (id, name, brand, category, ingredients, ingredient_source)
           VALUES (UUID(), ?, ?, ?, ?, ?)`,
          [name, brand, category, JSON.stringify(ingredients), source],
        );

        const [found] = await conn.execute(
          `SELECT id FROM products WHERE name = ? AND brand = ?`,
          [name, brand],
        );
        const row = Array.isArray(found) ? found[0] : undefined;
        const productId =
          typeof row === "object" && row !== null && "id" in row
            ? String(row.id)
            : "";
        if (!productId) continue;

        // 주의사항은 이미 만들어 둔 것이 있으면 덮지 않는다(빈 값으로 지우는 사고 방지).
        const warnings = textArray(item.warnings ?? [], {
          maxItems: 20,
          maxLength: 500,
        });
        if (warnings && warnings.length > 0) {
          await conn.execute(
            `UPDATE products SET warnings = ? WHERE id = ? AND warnings IS NULL`,
            [JSON.stringify(warnings), productId],
          );
        }

        // 로컬 성분이 있으면 카탈로그를 채운다. 빈 배열로는 덮지 않는다.
        if (ingredients.length > 0) {
          await conn.execute(
            `UPDATE products SET ingredients = ? WHERE id = ?`,
            [JSON.stringify(ingredients), productId],
          );
        }

        await conn.execute(
          `INSERT IGNORE INTO shelf_items (id, user_id, product_id, thumbnail)
           VALUES (UUID(), ?, ?, ?)`,
          [userId, productId, thumbnail],
        );
        // 로컬에 사진이 있을 때만 덮는다 — 없는데 덮으면 기존 사진이 지워진다.
        if (thumbnail) {
          await conn.execute(
            `UPDATE shelf_items SET thumbnail = ?
              WHERE user_id = ? AND product_id = ?`,
            [thumbnail, userId, productId],
          );
        }
        products += 1;
      }

      // ── 루틴 ────────────────────────────────────────────────
      // 서버에 이미 있으면 건드리지 않는다. 다른 기기에서 만든 루틴을 로컬 것으로 덮으면
      // 최신 루틴이 사라진다.
      let routines = 0;
      const [existing] = await conn.execute(
        `SELECT COUNT(*) AS n FROM routines WHERE user_id = ?`,
        [userId],
      );
      const countRow = Array.isArray(existing) ? existing[0] : undefined;
      const already =
        typeof countRow === "object" && countRow !== null && "n" in countRow
          ? Number(countRow.n)
          : 0;

      if (already === 0) {
        for (const raw of asArray(body.routines).slice(0, LIMITS.routines)) {
          const item = asRecord(raw);
          if (!item) continue;

          const name = text(item.name, LIMITS.routineName);
          if (!name) continue;

          const routineId = crypto.randomUUID();
          await conn.execute(
            `INSERT INTO routines (id, user_id, name, \`condition\`, time_slot, summary)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              routineId,
              userId,
              name,
              text(item.condition, LIMITS.condition) ?? "평소",
              item.time === "pm" ? "pm" : "am",
              text(item.summary, LIMITS.summary) ?? "",
            ],
          );

          const steps = asArray(item.steps).slice(0, LIMITS.steps);
          for (const [index, rawStep] of steps.entries()) {
            const step = asRecord(rawStep);
            if (!step) continue;

            const stepName = text(step.routineName, LIMITS.routineName);
            if (!stepName) continue;

            const texts = (value: unknown) =>
              JSON.stringify(
                textArray(value ?? [], {
                  maxItems: LIMITS.stepTextItems,
                  maxLength: LIMITS.stepTextLength,
                }) ?? [],
              );

            await conn.execute(
              `INSERT INTO routine_steps
                 (id, routine_id, seq, routine_name, estimated_time,
                  using_product, how_to_use, tips, warning)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                crypto.randomUUID(),
                routineId,
                index,
                stepName,
                typeof step.estimatedTime === "number" &&
                Number.isFinite(step.estimatedTime)
                  ? Math.min(
                      Math.max(0, Math.trunc(step.estimatedTime)),
                      LIMITS.estimatedTime,
                    )
                  : 0,
                texts(step.usingProduct),
                texts(step.howToUse),
                texts(step.tips),
                texts(step.warning),
              ],
            );
          }
          routines += 1;
        }
      } else {
        /*
         * 서버에 이미 루틴이 있어 루프를 건너뛰었다. 예전에는 이때 routines 가 0 이라
         * 클라이언트가 이관 미완료로 보고 로컬을 영영 유지했다(m2).
         * 서버가 갖고 있다는 것 자체가 수용이므로 보낸 만큼을 센다.
         */
        routines = asArray(body.routines).slice(0, LIMITS.routines).length;
      }

      // ── 피부 프로필 ─────────────────────────────────────────
      let profile = 0;
      const profileInput = asRecord(body.profile);
      if (profileInput) {
        const wonder = text(profileInput.wonder, LIMITS.wonder);
        const usable = asRecord(profileInput.usableTime) ?? {};
        if (wonder) {
          // 이미 있으면 덮지 않는다 — 서버 쪽이 더 최신일 수 있다.
          await conn.execute(
            `INSERT IGNORE INTO skin_profiles
               (user_id, wonder, usable_morning, usable_evening)
             VALUES (?, ?, ?, ?)`,
            [
              userId,
              wonder,
              text(usable.morning, LIMITS.usableTime) ?? "",
              text(usable.evening, LIMITS.usableTime) ?? "",
            ],
          );
          // 이미 있으면 IGNORE 되어 0 이지만, 그것도 "서버가 갖고 있다" = 수용이다(m2).
          profile = 1;
        }
      }

      // ── 수행 기록 ───────────────────────────────────────────
      // 로컬 id 를 PK 로 그대로 쓴다 → 다시 이관해도 같은 행이라 중복이 생기지 않는다.
      let runs = 0;
      for (const raw of asArray(body.runs).slice(0, 1000)) {
        const item = asRecord(raw);
        if (!item) continue;

        const id = text(item.id, 36);
        const routineId = text(item.routineId, 36);
        const startedAt = isoDate(item.startedAt);
        const finishedAt = isoDate(item.finishedAt);
        if (!id || !routineId || !startedAt || !finishedAt) continue;

        /*
         * ⚠️ routineId 는 **로컬 루틴의 id** 다. 위에서 루틴을 새 id 로 다시 만들었으므로
         *    이 값은 어떤 루틴도 가리키지 않는다. 그래도 남긴다 —
         *    routine_runs 에는 FK 가 없고(의도적), 화면은 못 찾은 루틴을 "삭제된 루틴"으로
         *    표시한다. 기록 자체가 사라지는 것보다 낫다(달성률의 유일한 근거다).
         */
        await conn.execute(
          `INSERT IGNORE INTO routine_runs
             (id, user_id, routine_id, started_at, finished_at, completed_step_ids)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            routineId,
            startedAt,
            finishedAt,
            JSON.stringify(
              textArray(item.completedStepIds ?? [], {
                maxItems: LIMITS.completedStepIds,
                maxLength: 64,
              }) ?? [],
            ),
          ],
        );
        /*
         * ⚠️ **affectedRows 를 세지 않는다**(m2). 재이관에서는 전부 IGNORE 되어 0 이 나오는데,
         *    클라이언트는 `migrated < 로컬 건수` 면 로컬을 안 지우고 다음 진입 때 또 보낸다 —
         *    한 번이라도 "커밋됐는데 응답만 유실"되면 **영원히 재이관 루프**에 갇힌다.
         *    카운트의 뜻은 "새로 쓴 행 수"가 아니라 **"서버가 받아들인 항목 수"** 다.
         */
        runs += 1;
      }

      return { products, routines, profile, runs };
    });

    return Response.json({ ok: true, migrated });
  } catch (error) {
    return dbErrorResponse("api/migrate", error);
  }
}
