/**
 * POST /api/ai/search — 검색어로 제품 후보를 찾는다.
 *
 * `/api/ai/*` 중 **유일하게 웹 도구를 쓴다**(`WebSearch`·`WebFetch`).
 * 성분 추출과 달리 모델의 기억이 아니라 화해 검색 결과를 근거로 삼기 위해서다.
 *
 * ⚠️ 웹 도구를 여는 엔드포인트라 러너의 도구 제한이 실제로 걸리는지가 중요하다.
 * `--allowedTools` 만으로는 제한되지 않는다는 것을 실측으로 확인하고 `--tools` 로 고쳤다
 * (커밋 `674d254`). 되돌리지 말 것.
 */

import { acquire, release } from "@/lib/ai/guard";
import { currentUserId } from "@/lib/auth/anonUser";
import { parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { isAllowedImageUrl } from "@/lib/images";
import {
  buildProductSearchPrompt,
  MAX_CANDIDATES,
} from "@/lib/prompts/productSearch";

export const runtime = "nodejs";

/** 실측 18~37초. 검색 결과 페이지가 무거울 때를 감안해 여유를 둔다. */
const TIMEOUT_MS = 180_000;

/** 검색어 한 줄뿐이라 아주 작다. */
const MAX_BODY_BYTES = 64 * 1024;

/** 사람이 입력할 수 있는 검색어 길이. 넘으면 프롬프트만 커지고 결과는 나빠진다. */
const MAX_QUERY_LENGTH = 100;

type Candidate = {
  product_name: string;
  brand: string | null;
  volume: string | null;
  /** 화이트리스트 호스트로 확인된 것만 남는다. 아니면 null. */
  image_url: string | null;
};

/**
 * LLM 은 스키마를 보장하지 않는다. 프론트로 내보내기 전에 서버에서 좁힌다.
 * 이름이 없는 항목은 화면에 그릴 수 없으므로 **버린다**(전체를 실패로 만들지 않는다).
 */
function narrowCandidate(value: unknown): Candidate | null {
  if (typeof value !== "object" || value === null) return null;
  const item: Record<string, unknown> = { ...value };

  const productName =
    typeof item.product_name === "string" ? item.product_name.trim() : "";
  if (!productName) return null;

  const text = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    // 모델이 "null"·"미상" 같은 문자열을 넣기도 한다. 값이 없다는 뜻이면 null 로 통일한다.
    if (!trimmed || trimmed === "null" || trimmed === "미상") return null;
    return trimmed;
  };

  /*
   * ⛔ **이미지 주소는 LLM 이 만든 값이다.** 그대로 내보내면 브라우저가 임의 주소를 요청하고,
   *    나중에 서버가 그걸 받아 저장하는 경로에서는 SSRF 가 된다.
   *    허용 호스트인지 여기서 한 번 거르고, 저장 시 `fetchImageAsDataUrl` 이 다시 확인한다.
   */
  const rawImage = text(item.image_url);
  const imageUrl = rawImage && isAllowedImageUrl(rawImage) ? rawImage : null;

  return {
    product_name: productName,
    brand: text(item.brand),
    volume: text(item.volume),
    image_url: imageUrl,
  };
}

export async function POST(request: Request) {
  // 사용자당 동시 1건. 웹 검색은 claude 프로세스가 뜨고 수십 초가 걸린다.
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

    let body: { query?: unknown };
    try {
      body = (await request.json()) as { query?: unknown };
    } catch {
      return Response.json(
        { message: "JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return Response.json(
        { message: "검색어를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return Response.json(
        { message: `검색어는 ${MAX_QUERY_LENGTH}자 이하여야 합니다.` },
        { status: 400 },
      );
    }

    try {
      const raw = await runClaude(buildProductSearchPrompt({ query }), {
        // 이 엔드포인트만 웹 도구를 연다. 다른 도구는 주지 않는다.
        allowedTools: ["WebSearch", "WebFetch"],
        timeoutMs: TIMEOUT_MS,
        /*
         * 검색어가 트랜스크립트에 남는다. 제품 사진만큼 민감하지는 않지만
         * 남길 이유도 없어 다른 엔드포인트와 같은 정책으로 지운다.
         */
        cleanupSession: true,
      });

      const parsed = parseJsonObject(raw) as Record<string, unknown>;

      if (!Array.isArray(parsed.candidates)) {
        // AI 응답 원문은 응답 본문이 아니라 로그로만 남긴다.
        console.error(
          "[api/ai/search] candidates 배열 없음:",
          raw.slice(0, 500),
        );
        return Response.json(
          { message: "AI 응답에 candidates 배열이 없습니다." },
          { status: 502 },
        );
      }

      const candidates = parsed.candidates
        .map(narrowCandidate)
        .filter((item) => item !== null);

      if (parsed.candidates.length > MAX_CANDIDATES) {
        console.warn(
          `[api/ai/search] 규칙 4 위반 — ${parsed.candidates.length}개 반환(최대 ${MAX_CANDIDATES})`,
        );
      }

      /*
       * ⭐ 빈 배열은 실패가 아니라 정상 응답이다(프롬프트 규칙 3: 화해에 없으면 빈 배열).
       *    화면은 "찾지 못했어요 — 직접 입력하기"로 이어 간다.
       */
      return Response.json({ candidates: candidates.slice(0, MAX_CANDIDATES) });
    } catch (error: unknown) {
      // claude CLI 의 stderr·서버 절대 경로가 섞여 나올 수 있어 상세는 로그로만 남긴다.
      console.error("[api/ai/search]", error);
      return Response.json(
        { message: "제품을 찾지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      );
    }
  } finally {
    // 예외·타임아웃으로 새면 이 사용자는 영영 AI 를 못 쓰게 되므로 반드시 여기서 푼다.
    release(userId);
  }
}
