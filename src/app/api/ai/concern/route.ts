/**
 * POST /api/ai/concern — 피부 고민에 도움이 되는 성분을 추천한다.
 *
 * **도구를 주지 않는다**(`allowedTools` 기본값 = 빈 배열 → `--tools ""`).
 * 성분-효능은 모델 지식으로 답하는 쪽이 빠르고 안정적이라는 결정이다(concern-flow Q3).
 * 웹 검색을 켜도 모델이 도구를 호출하지 않는다는 실측이 근거다.
 */

import { acquire, release } from "@/lib/ai/guard";
import { currentUserId } from "@/lib/auth/anonUser";
import { parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import {
  buildConcernIngredientsPrompt,
  MAX_CONCERN_INGREDIENTS,
} from "@/lib/prompts/concernIngredients";

export const runtime = "nodejs";

/** 도구 없는 텍스트 호출이라 짧다(실측 10~30초). 여유를 둬도 이 정도면 충분하다. */
const TIMEOUT_MS = 120_000;

/** 고민 한 문단뿐이라 작다. */
const MAX_BODY_BYTES = 64 * 1024;

/** `skin_profiles.wonder` 상한과 맞춘다 — 더 길면 저장도 안 된다. */
const MAX_WONDER_LENGTH = 2_000;

type ConcernIngredient = {
  name: string;
  effect: string;
  caution: string | null;
};

/**
 * LLM 은 스키마를 보장하지 않는다. 이름 없는 항목은 화면에 그릴 수 없어 **버린다**
 * (전체를 실패로 만들지 않는다).
 */
function narrowIngredient(value: unknown): ConcernIngredient | null {
  if (typeof value !== "object" || value === null) return null;
  const item: Record<string, unknown> = { ...value };

  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return null;

  const caution =
    typeof item.caution === "string" && item.caution.trim() !== "null"
      ? item.caution.trim()
      : "";

  return {
    name,
    effect: typeof item.effect === "string" ? item.effect.trim() : "",
    // 모델이 문자열 "null" 을 넣기도 한다. 값이 없다는 뜻이면 null 로 통일한다.
    caution: caution || null,
  };
}

export async function POST(request: Request) {
  // 사용자당 동시 1건. 호출마다 claude 프로세스가 뜬다.
  const userId = await currentUserId();
  if (!acquire(userId)) {
    return Response.json(
      {
        message: "이미 처리 중인 요청이 있습니다. 완료 후 다시 시도해 주세요.",
      },
      { status: 429 },
    );
  }

  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return Response.json(
        { message: "요청 본문이 너무 큽니다." },
        { status: 413 },
      );
    }

    let body: { wonder?: unknown };
    try {
      body = (await request.json()) as { wonder?: unknown };
    } catch {
      return Response.json(
        { message: "JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const wonder = typeof body.wonder === "string" ? body.wonder.trim() : "";
    if (!wonder) {
      return Response.json(
        { message: "피부 고민을 입력해 주세요." },
        { status: 400 },
      );
    }
    if (wonder.length > MAX_WONDER_LENGTH) {
      return Response.json(
        { message: `고민은 ${MAX_WONDER_LENGTH}자 이하여야 합니다.` },
        { status: 400 },
      );
    }

    try {
      const raw = await runClaude(buildConcernIngredientsPrompt({ wonder }), {
        // 도구를 주지 않는다(Q3). 빈 배열이면 러너가 `--tools ""` 로 전부 끈다.
        timeoutMs: TIMEOUT_MS,
      });

      const parsed = parseJsonObject(raw) as Record<string, unknown>;

      if (!Array.isArray(parsed.ingredients)) {
        // AI 응답 원문은 응답 본문이 아니라 로그로만 남긴다.
        console.error(
          "[api/ai/concern] ingredients 배열 없음:",
          raw.slice(0, 500),
        );
        return Response.json(
          { message: "AI 응답에 ingredients 배열이 없습니다." },
          { status: 502 },
        );
      }

      if (parsed.ingredients.length > MAX_CONCERN_INGREDIENTS) {
        console.warn(
          `[api/ai/concern] 규칙 3 위반 — ${parsed.ingredients.length}개 반환(최대 ${MAX_CONCERN_INGREDIENTS})`,
        );
      }

      const ingredients = parsed.ingredients
        .map(narrowIngredient)
        .filter((item) => item !== null)
        .slice(0, MAX_CONCERN_INGREDIENTS);

      /*
       * ⭐ 빈 배열은 실패가 아니라 정상 응답이다(규칙 7: 고를 수 없으면 []).
       *    화면은 "성분을 고르지 못했어요 — 고민을 조금 더 구체적으로" 로 이어 간다.
       */
      return Response.json({ ingredients });
    } catch (error: unknown) {
      // claude CLI 의 stderr·서버 절대 경로가 섞여 나올 수 있어 상세는 로그로만 남긴다.
      console.error("[api/ai/concern]", error);
      return Response.json(
        { message: "성분을 추천하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      );
    }
  } finally {
    // 예외·타임아웃으로 새면 이 사용자는 영영 AI 를 못 쓰게 되므로 반드시 여기서 푼다.
    release(userId);
  }
}
