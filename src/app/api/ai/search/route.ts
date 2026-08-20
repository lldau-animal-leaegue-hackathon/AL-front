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

/* ── 화해 직접 파싱 (사용자 승인 2026-08-20 Q4) ──────────────────────
 * 검색 결과 페이지는 SSR 이라 `__NEXT_DATA__` JSON 에 후보가 통째로 박혀 온다
 * (실측: 0.5~2초, 첫 5개 = MAX_CANDIDATES, 판촉 문구 없는 정식 명칭).
 * LLM 경로(18~37초)의 10~40배 빠르므로 **직파싱을 먼저** 시도하고,
 * 구조 실패(비 200·키 경로 부재·파싱 실패)일 때만 기존 AI 경로로 폴백한다.
 *
 * ⚠️ 폴백 진입은 반드시 warn 로그를 남긴다 — 화해가 App Router 로 이관하는 순간
 *    전 요청이 조용히 18~37초로 회귀하는데, 로그가 없으면 영영 모른다.
 * ⚠️ EC2(데이터센터 IP)에서의 WAF 차단 여부는 미확인(가정용 IP 실측만 있음) —
 *    차단돼도 폴백이 받치지만, 배포 후 서버 로그에서 직파싱 성공을 1회 확인할 것.
 */

const HWAHAE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** 중첩 키 경로를 unknown 안전하게 내려간다 — `as` 캐스팅 없이 좁히기 위한 헬퍼. */
function dig(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** 화해 항목 1개 → 우리 Candidate. 이름이 없으면 버린다(AI 경로의 narrowCandidate 와 같은 규율). */
function hwahaeItemToCandidate(value: unknown): Candidate | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;

  const productName =
    typeof item.productName === "string" ? item.productName.trim() : "";
  if (!productName) return null;

  // 브랜드는 "토리든 (Torriden)" 형태다 — 화면·매칭은 한글 표기만 쓴다.
  const rawBrand = typeof item.brand === "string" ? item.brand.trim() : "";
  const brand = rawBrand ? rawBrand.replace(/\s*\([^)]*\)\s*$/, "") : null;

  // "50ml / 1.69 fl. oz." → "50ml". 형식이 흔들려도 첫 세그먼트만 취한다.
  const rawCapacity =
    typeof item.product_capacity === "string" ? item.product_capacity : "";
  const volume = rawCapacity
    ? (rawCapacity.split("/")[0]?.trim() ?? null)
    : null;

  const rawImage =
    typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const imageUrl = rawImage && isAllowedImageUrl(rawImage) ? rawImage : null;

  return {
    product_name: productName,
    brand,
    volume: volume || null,
    image_url: imageUrl,
  };
}

/**
 * 직파싱 결과.
 *  - `ok`         : 파싱 성공. **빈 배열도 정상 결과다**(화해에 그 제품이 없음).
 *  - `unavailable`: 화해가 5xx/네트워크 오류. **일시적**이라 AI 폴백도 같은 주소·같은
 *                   IP 로 나가 똑같이 실패한다 → 폴백하지 않고 사용자에게 알린다.
 *  - `changed`    : 200 인데 우리가 아는 구조가 아님(화해 개편 의심) → AI 폴백이 의미 있다.
 */
type DirectResult =
  | { status: "ok"; candidates: Candidate[] }
  | { status: "unavailable" }
  | { status: "changed" };

/** 성공 결과 캐시 — 같은 검색어로 외부를 반복해서 치지 않는다(레이트 리밋 회피). */
const SEARCH_CACHE_MS = 10 * 60_000;
const globalForSearch = globalThis as typeof globalThis & {
  __alSearchCache?: Map<string, { at: number; candidates: Candidate[] }>;
};

async function fetchHwahae(query: string): Promise<Response> {
  return fetch(
    `https://www.hwahae.co.kr/search?q=${encodeURIComponent(query)}`,
    {
      headers: { "user-agent": HWAHAE_UA },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    },
  );
}

/**
 * 직파싱 본체.
 *
 * ⚠️ 화해는 **요청이 몰리면 5xx 를 돌려준다**(2026-08-20 실측: 같은 검색어가 한 번은
 * 200, 연달아 치면 500). 일시적이므로 짧게 **1회만 재시도**하고, 그래도 안 되면
 * `unavailable` 로 끝낸다 — 여기서 AI 폴백을 태우면 같은 주소를 한 번 더 치는 셈이라
 * 레이트 리밋을 악화시키고 결과도 같다(프롬프트 규칙 3 → 빈 배열).
 */
async function searchHwahaeDirect(query: string): Promise<DirectResult> {
  let response = await fetchHwahae(query);

  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    response = await fetchHwahae(query);
  }

  if (!response.ok) {
    console.warn(
      `[api/ai/search] 화해 응답 HTTP ${response.status} — 일시 실패로 처리(폴백 안 함)`,
    );
    return { status: "unavailable" };
  }

  const html = await response.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>(.*?)<\/script>/s,
  );
  if (!match) {
    console.warn(
      "[api/ai/search] __NEXT_DATA__ 없음 — AI 폴백(화해 구조 변경?)",
    );
    return { status: "changed" };
  }

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    console.warn("[api/ai/search] __NEXT_DATA__ 파싱 실패 — AI 폴백");
    return { status: "changed" };
  }

  // 키 경로 실측(2026-08-20): props.pageProps.products.products[]
  const list = dig(data, "props", "pageProps", "products", "products");
  if (!Array.isArray(list)) {
    console.warn("[api/ai/search] products 키 경로 부재 — AI 폴백");
    return { status: "changed" };
  }

  return {
    status: "ok",
    candidates: list
      .map(hwahaeItemToCandidate)
      .filter((item): item is Candidate => item !== null)
      .slice(0, MAX_CANDIDATES),
  };
}

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

    // 0차: 캐시. 같은 검색어를 외부로 반복해 치지 않는다(화해 레이트 리밋 회피).
    globalForSearch.__alSearchCache ??= new Map();
    const cache = globalForSearch.__alSearchCache;
    const hit = cache.get(query);
    if (hit && Date.now() - hit.at < SEARCH_CACHE_MS) {
      return Response.json({ candidates: hit.candidates });
    }

    // 1차: 직파싱(0.5~2초). 빈 배열도 정상 결과라 그대로 반환한다.
    let unavailable = false;
    try {
      const direct = await searchHwahaeDirect(query);
      if (direct.status === "ok") {
        cache.set(query, { at: Date.now(), candidates: direct.candidates });
        return Response.json({ candidates: direct.candidates });
      }
      unavailable = direct.status === "unavailable";
    } catch (error: unknown) {
      // 타임아웃·네트워크 오류도 일시 실패다 — AI 로 같은 주소를 또 치지 않는다.
      console.warn("[api/ai/search] 직파싱 예외 — 일시 실패로 처리:", error);
      unavailable = true;
    }

    /*
     * 화해가 일시적으로 응답하지 않는 상태. AI 폴백은 **같은 주소를 같은 IP 로** 치므로
     * 결과가 같고(빈 배열) 레이트 리밋만 악화시킨다 — 90초를 쓰는 대신 바로 알린다.
     * ⚠️ "검색 결과가 없어요"로 뭉개면 사용자는 **제품이 없는 줄 알고 포기한다.**
     *    지금 실패한 것과 카탈로그에 없는 것은 다른 상황이라 다르게 말해야 한다.
     */
    if (unavailable) {
      return Response.json(
        {
          message:
            "제품 검색이 일시적으로 원활하지 않아요. 잠시 후 다시 시도하거나, 성분표 사진을 올려 바로 등록할 수 있어요.",
        },
        { status: 503 },
      );
    }

    // 2차(폴백): 기존 헤드리스 Claude 경로. 프롬프트·검증 규율은 그대로다.
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
      const narrowed = candidates.slice(0, MAX_CANDIDATES);
      // 폴백 결과도 캐시한다 — 90초짜리 호출을 같은 검색어로 반복하지 않는다.
      globalForSearch.__alSearchCache?.set(query, {
        at: Date.now(),
        candidates: narrowed,
      });
      return Response.json({ candidates: narrowed });
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
