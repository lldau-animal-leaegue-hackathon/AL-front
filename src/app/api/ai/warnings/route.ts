/**
 * POST /api/ai/warnings — 제품 단독 사용 시 주의사항.
 * 도구 없음. 제품 1개당 1회 호출이라 지연 생성으로 쓴다(등록 직후 대기시키지 않는다).
 */

import { isStringArray, parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { buildWarningsPrompt } from "@/lib/prompts/warnings";

export const runtime = "nodejs";

const TIMEOUT_MS = 300_000;

/** 프롬프트 규칙 7 — 최대 6개 */
const MAX_WARNINGS = 6;

type Body = {
  productName?: unknown;
  category?: unknown;
  ingredients?: unknown;
};

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

  try {
    const raw = await runClaude(
      buildWarningsPrompt({
        productName,
        category: typeof body.category === "string" ? body.category : "미분류",
        // 빈 배열도 정상 입력이다 — 프롬프트 규칙 6이 그 경우의 응답을 따로 정해 뒀다.
        ingredients: isStringArray(body.ingredients) ? body.ingredients : [],
      }),
      { timeoutMs: TIMEOUT_MS },
    );

    const parsed = parseJsonObject(raw) as Record<string, unknown>;

    // 키가 단수형(`warning`)인데 값은 배열이다. 오타가 아니라 명세 그대로다.
    if (!isStringArray(parsed.warning)) {
      return Response.json(
        {
          message: "AI 응답에 warning 배열이 없습니다.",
          raw: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    if (parsed.warning.length > MAX_WARNINGS) {
      console.warn(
        `[api/ai/warnings] 규칙 7 위반 — ${parsed.warning.length}개 반환(최대 ${MAX_WARNINGS})`,
      );
    }

    return Response.json({ warning: parsed.warning.slice(0, MAX_WARNINGS) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/ai/warnings]", message);
    return Response.json({ message }, { status: 502 });
  }
}
