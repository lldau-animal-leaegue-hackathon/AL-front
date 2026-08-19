/**
 * DB 행 → 도메인 타입 좁히기.
 *
 * 규율: **`as` 로 단정하지 않는다.** 행은 `unknown` 으로 받아 필드마다 확인한다.
 * AI 응답을 다루는 방식(`src/lib/claude/parseJson.ts`)과 같은 규율이다 —
 * 스키마를 고쳤는데 코드를 안 고치면 `as` 는 조용히 통과시키고 화면에서 터진다.
 */

import type {
  Product,
  Routine,
  RoutineRun,
  RoutineStep,
  RoutineTime,
  SkinProfile,
} from "@/types/skincare";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** 빈 문자열은 "없음"으로 본다 — 브랜드 미상을 빈 문자열로 넣기 때문(유니크 키 때문). */
function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function int(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** DATETIME 은 Date 로 온다(풀의 `timezone: "Z"` 기준). 도메인 타입은 ISO 문자열이다. */
function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

/**
 * JSON 컬럼 → 문자열 배열.
 *
 * ⚠️ **MariaDB 의 `JSON` 은 `LONGTEXT` 의 별칭**이라 드라이버가 MySQL 처럼 자동 파싱해 준다는
 * 보장이 없다. 파싱된 배열로 올 수도, 문자열로 올 수도 있어 **둘 다 받는다.**
 * 깨진 값이면 빈 배열로 떨어뜨린다 — 성분이 없는 것과 화면이 죽는 것 중에는 전자가 낫다.
 */
function strArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      return strArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 내 선반의 제품 1건. `shelf_items` 와 `products` 를 조인한 행을 받는다.
 *
 * `id` 는 **`products.id`** 다 — 주의사항 갱신은 공유 카탈로그(products)를 고치고,
 * 선반에서 빼는 것은 (user_id, product_id) 로 지운다.
 *
 * ⚠️ `Product.capacity` 는 채우지 않는다. 스키마에 컬럼이 없고, 실제로 **읽는 코드가 없다**
 *    (등록 시 AI 프롬프트에 넘기고 끝난다 — 2026-08-18 확인). 화면에 필요해지면 그때 002 로 추가한다.
 */
export function toProduct(row: unknown): Product | null {
  if (!isRecord(row)) return null;

  const id = str(row.id);
  if (!id) return null;

  return {
    id,
    productName: str(row.name),
    productCompany: optStr(row.brand),
    // 내가 찍은 사진(개인) / 검색에서 온 이미지(공유) — 칸이 다르다(002 마이그레이션).
    thumbnail: optStr(row.thumbnail),
    image: optStr(row.image),
    category: str(row.category),
    ingredients: strArray(row.ingredients),
    // 지연 생성이라 아직 없을 수 있다. 빈 배열과 "아직 안 만듦"을 구분해야 재시도가 돈다.
    warnings: row.warnings === null ? undefined : strArray(row.warnings),
    createdAt: iso(row.created_at),
  };
}

function toRoutineStep(row: unknown): RoutineStep | null {
  if (!isRecord(row)) return null;

  const id = str(row.id);
  if (!id) return null;

  return {
    id,
    routineName: str(row.routine_name),
    estimatedTime: int(row.estimated_time),
    usingProduct: strArray(row.using_product),
    howToUse: strArray(row.how_to_use),
    tips: strArray(row.tips),
    warning: strArray(row.warning),
  };
}

/** `routine_steps` 행들을 `routine_id` 로 묶는다. 루틴마다 쿼리를 날리면 N+1 이 된다. */
export function groupSteps(rows: unknown[]): Map<string, RoutineStep[]> {
  const grouped = new Map<string, RoutineStep[]>();

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const routineId = str(row.routine_id);
    const step = toRoutineStep(row);
    if (!routineId || !step) continue;

    const list = grouped.get(routineId);
    if (list) list.push(step);
    else grouped.set(routineId, [step]);
  }

  return grouped;
}

export function toRoutine(row: unknown, steps: RoutineStep[]): Routine | null {
  if (!isRecord(row)) return null;

  const id = str(row.id);
  if (!id) return null;

  // ENUM('am','pm') 이지만 DB 가 준 값을 믿지 않는다. 벗어나면 am 으로 떨어뜨린다.
  const time: RoutineTime = row.time_slot === "pm" ? "pm" : "am";

  return {
    id,
    name: str(row.name),
    condition: str(row.condition),
    time,
    summary: str(row.summary),
    steps,
    createdAt: iso(row.created_at),
  };
}

export function toRoutineRun(row: unknown): RoutineRun | null {
  if (!isRecord(row)) return null;

  const id = str(row.id);
  if (!id) return null;

  return {
    id,
    routineId: str(row.routine_id),
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    completedStepIds: strArray(row.completed_step_ids),
  };
}

export function toSkinProfile(row: unknown): SkinProfile | null {
  if (!isRecord(row)) return null;

  const wonder = str(row.wonder);
  if (!wonder) return null;

  return {
    wonder,
    usableTime: {
      morning: str(row.usable_morning),
      evening: str(row.usable_evening),
    },
    updatedAt: iso(row.updated_at),
  };
}
