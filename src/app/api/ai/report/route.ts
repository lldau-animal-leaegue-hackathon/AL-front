/**
 * POST /api/ai/report — 선반 전체의 성분 상호작용 분석 (시너지·충돌·타입별 주의·추가 추천).
 *
 * **선반은 서버가 직접 읽는다**(클라이언트 body 없음). 캐시 키(지문)를 만드는 곳과
 * AI 입력을 만드는 곳이 같아야 어긋나지 않는다.
 *
 * 캐시: `shelf_reports` (사용자당 1행). 지문이 같으면 AI 를 태우지 않는다 —
 * 호출 1회가 1~2분 + 구독 차감이라 캐시가 곧 기능이다(계획서 Q2-A).
 *
 * **도구를 주지 않는다** — 성분 상호작용은 잘 알려진 지식으로 답하는 것이 규칙이고
 * (프롬프트 규칙 2), concern 실측에서 모델이 웹 도구를 호출하지 않는 것을 확인했다.
 */

import { acquire, release } from "@/lib/ai/guard";
import { currentUserId } from "@/lib/auth/anonUser";
import { parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { execute, selectRows } from "@/lib/db/pool";
import {
  buildInteractionsPrompt,
  MAX_CONFLICTS,
  MAX_SUGGESTIONS,
  MAX_SYNERGIES,
  MAX_TYPE_CAUTIONS,
  SKIN_TYPES,
} from "@/lib/prompts/interactions";
import { shelfFingerprint } from "@/lib/shelfFingerprint";

export const runtime = "nodejs";

/** 도구 없는 텍스트 호출이지만 선반 전체를 보므로 concern 보다 길다(예상 1~2분). */
const TIMEOUT_MS = 300_000;

type SkinType = (typeof SKIN_TYPES)[number];

type TypeCaution = {
  skin_type: SkinType;
  ingredient: string;
  products: string[];
  caution: string;
};
type Pair = { ingredients: string[]; products: string[]; description: string };
type Suggestion = { ingredient: string; reason: string };

/** 응답이자 캐시(`shelf_reports.result`)에 저장되는 모양. 전부 snake_case(프롬프트 출력 그대로). */
type ShelfReport = {
  skin_type_cautions: TypeCaution[];
  conflicts: Pair[];
  synergies: Pair[];
  suggestions: Suggestion[];
};

const EMPTY_REPORT: ShelfReport = {
  skin_type_cautions: [],
  conflicts: [],
  synergies: [],
  suggestions: [],
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : [];
}

function isSkinType(value: string): value is SkinType {
  return (SKIN_TYPES as readonly string[]).includes(value);
}

/**
 * LLM 은 스키마를 보장하지 않는다 — 항목별로 좁혀 불량 항목만 버린다(전체 실패 금지).
 * `owned` 는 보유 성분 집합: 규칙 1(입력에 있는 성분만)·규칙 5(suggestions 는 없는 성분만)
 * 위반을 여기서 걸러낸다. 위반은 경고 로그 — 조용히 넘어가면 프롬프트 품질 저하를 영영 모른다.
 */
function narrowReport(
  parsed: Record<string, unknown>,
  owned: ReadonlySet<string>,
): ShelfReport {
  const cautions = (
    Array.isArray(parsed.skin_type_cautions) ? parsed.skin_type_cautions : []
  )
    .map((value): TypeCaution | null => {
      if (typeof value !== "object" || value === null) return null;
      const item: Record<string, unknown> = { ...value };
      const skinType = str(item.skin_type);
      const ingredient = str(item.ingredient);
      const caution = str(item.caution);
      if (!isSkinType(skinType) || !ingredient || !caution) return null;
      return {
        skin_type: skinType,
        ingredient,
        products: strArray(item.products),
        caution,
      };
    })
    .filter((item) => item !== null)
    .slice(0, MAX_TYPE_CAUTIONS);

  const pair = (value: unknown): Pair | null => {
    if (typeof value !== "object" || value === null) return null;
    const item: Record<string, unknown> = { ...value };
    const ingredients = strArray(item.ingredients);
    const description = str(item.description);
    if (ingredients.length < 2 || !description) return null;
    /*
     * 규칙 1 위반 — 보유하지 않은 성분이 낀 조합은 버린다. "내 선반에 없는 성분"의
     * 충돌 경고는 사용자를 혼란시키고, 지어낸 조합일 가능성이 높다.
     */
    if (!ingredients.every((name) => owned.has(name))) {
      console.warn(
        "[api/ai/report] 규칙 1 위반 — 보유하지 않은 성분 조합 버림:",
        ingredients.join("+"),
      );
      return null;
    }
    return { ingredients, products: strArray(item.products), description };
  };

  const conflicts = (Array.isArray(parsed.conflicts) ? parsed.conflicts : [])
    .map(pair)
    .filter((item) => item !== null)
    .slice(0, MAX_CONFLICTS);

  const synergies = (Array.isArray(parsed.synergies) ? parsed.synergies : [])
    .map(pair)
    .filter((item) => item !== null)
    .slice(0, MAX_SYNERGIES);

  const suggestions = (
    Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  )
    .map((value): Suggestion | null => {
      if (typeof value !== "object" || value === null) return null;
      const item: Record<string, unknown> = { ...value };
      const ingredient = str(item.ingredient);
      const reason = str(item.reason);
      if (!ingredient || !reason) return null;
      // 규칙 5 위반 — 이미 보유한 성분을 "추가하라"고 하면 버린다.
      if (owned.has(ingredient)) {
        console.warn(
          "[api/ai/report] 규칙 5 위반 — 보유 성분을 제안해 버림:",
          ingredient,
        );
        return null;
      }
      return { ingredient, reason };
    })
    .filter((item) => item !== null)
    .slice(0, MAX_SUGGESTIONS);

  return { skin_type_cautions: cautions, conflicts, synergies, suggestions };
}

type ShelfItem = {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
};

async function readShelf(userId: string): Promise<ShelfItem[]> {
  const rows = await selectRows(
    `SELECT p.id, p.name, p.category, p.ingredients
       FROM shelf_items s
       JOIN products p ON p.id = s.product_id
      WHERE s.user_id = ?`,
    [userId],
  );

  return rows
    .map((row): ShelfItem | null => {
      if (typeof row !== "object" || row === null) return null;
      const item: Record<string, unknown> = { ...row };
      const id = str(item.id);
      if (!id) return null;
      // mysql2 는 JSON 컬럼을 파싱해 주기도, 문자열로 주기도 한다.
      const raw =
        typeof item.ingredients === "string"
          ? (JSON.parse(item.ingredients) as unknown)
          : item.ingredients;
      return {
        id,
        name: str(item.name),
        category: str(item.category),
        ingredients: strArray(raw),
      };
    })
    .filter((item) => item !== null);
}

export async function POST() {
  const userId = await currentUserId();

  let shelf: ShelfItem[];
  try {
    shelf = await readShelf(userId);
  } catch (error) {
    console.error("[api/ai/report] 선반 조회 실패:", error);
    return Response.json(
      { message: "선반을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  /*
   * ⭐ 빈 선반은 실패가 아니다 — 분석할 것이 없다는 정상 응답(빈 리포트)이다.
   *    AI 를 태우지 않고, 캐시에도 저장하지 않는다(제품이 담기면 지문이 생긴다).
   */
  if (shelf.length === 0) return Response.json(EMPTY_REPORT);

  const fingerprint = shelfFingerprint(shelf);
  const owned = new Set(shelf.flatMap((item) => item.ingredients));

  // 캐시는 가드보다 먼저 — AI 를 태우지 않는 요청을 429 로 막을 이유가 없다(concern 과 동일).
  try {
    const rows = await selectRows(
      `SELECT result FROM shelf_reports WHERE user_id = ? AND fingerprint = ?`,
      [userId, fingerprint],
    );
    if (rows.length > 0) {
      const row = rows[0];
      const raw =
        typeof row === "object" && row !== null && "result" in row
          ? row.result
          : null;
      const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof parsed === "object" && parsed !== null) {
        return Response.json(
          narrowReport(parsed as Record<string, unknown>, owned),
        );
      }
    }
  } catch (error) {
    console.warn("[api/ai/report] 캐시 조회 실패, AI 로 진행:", error);
  }

  // 사용자당 동시 1건. 호출마다 claude 프로세스가 뜬다.
  if (!acquire(userId)) {
    return Response.json(
      {
        message: "이미 처리 중인 요청이 있습니다. 완료 후 다시 시도해 주세요.",
      },
      { status: 429 },
    );
  }

  try {
    const raw = await runClaude(
      buildInteractionsPrompt({
        products: shelf.map((item) => ({
          productName: item.name,
          category: item.category,
          ingredients: item.ingredients,
        })),
      }),
      // 도구를 주지 않는다(빈 배열이면 러너가 `--tools ""` 로 전부 끈다).
      { timeoutMs: TIMEOUT_MS },
    );

    const parsed = parseJsonObject(raw) as Record<string, unknown>;

    // 네 배열 중 하나라도 있으면 계약을 지킨 응답으로 본다. 전부 없으면 형식 실패다.
    const hasAny = [
      "skin_type_cautions",
      "conflicts",
      "synergies",
      "suggestions",
    ].some((key) => Array.isArray(parsed[key]));
    if (!hasAny) {
      // AI 응답 원문은 응답 본문이 아니라 로그로만 남긴다.
      console.error("[api/ai/report] 출력 배열 없음:", raw.slice(0, 500));
      return Response.json(
        { message: "AI 응답 형식이 올바르지 않습니다." },
        { status: 502 },
      );
    }

    const report = narrowReport(parsed, owned);

    /*
     * 캐시 저장 — 좁힌 결과를 저장하므로 읽기는 한 번 더 좁히기만 하면 된다.
     * 저장 실패는 응답을 막지 않는다(캐시는 최적화다).
     * `VALUES()` 를 함수 인자로 쓰지 않는 단순 할당이라 MariaDB 이슈가 없다.
     */
    try {
      await execute(
        `INSERT INTO shelf_reports (user_id, fingerprint, result)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           fingerprint = VALUES(fingerprint),
           result      = VALUES(result),
           created_at  = CURRENT_TIMESTAMP`,
        [userId, fingerprint, JSON.stringify(report)],
      );
    } catch (error) {
      console.warn("[api/ai/report] 캐시 저장 실패:", error);
    }

    return Response.json(report);
  } catch (error: unknown) {
    // claude CLI 의 stderr·서버 절대 경로가 섞여 나올 수 있어 상세는 로그로만 남긴다.
    console.error("[api/ai/report]", error);
    return Response.json(
      { message: "분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  } finally {
    // 예외·타임아웃으로 새면 이 사용자는 영영 AI 를 못 쓰게 되므로 반드시 여기서 푼다.
    release(userId);
  }
}
