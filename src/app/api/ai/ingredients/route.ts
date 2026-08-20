/**
 * POST /api/ai/ingredients — 제품 성분 추출.
 *
 * 이미지는 base64 로 모델에 넘기지 않는다. **임시 파일로 저장하고 경로를 프롬프트에 넣어
 * `--allowedTools Read` 로 읽게** 한다(설계 Q3·Q8). 그래서 두 가지 정리가 필수다:
 *  1. 임시 파일 삭제 — `finally` 에서.
 *  2. 세션 트랜스크립트 삭제 — `cleanupSession: true`.
 *     Read 로 읽힌 **제품 사진 사본이 트랜스크립트에 남는다**(실측 확인).
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { acquire, release } from "@/lib/ai/guard";
import { currentUserId } from "@/lib/auth/anonUser";
import { isStringArray, parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { selectRows } from "@/lib/db/pool";
import { findIngredientsFromBrandSite } from "@/lib/ingredients/brandSites";
import { buildIngredientsPrompt } from "@/lib/prompts/ingredients";

// 자식 프로세스를 띄우므로 Edge 런타임에서는 동작하지 않는다.
export const runtime = "nodejs";

/** 이미지 인식은 텍스트만 다루는 호출보다 오래 걸린다(WatchList 기준 300초). */
const TIMEOUT_MS = 300_000;

/** 이미지 data URL 이 실려 다른 두 AI 엔드포인트보다 훨씬 크다. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

type Body = {
  productName?: unknown;
  capacity?: unknown;
  productCompany?: unknown;
  /** data URL (`data:image/jpeg;base64,...`) */
  productImg?: unknown;
};

/** data URL 을 확장자와 바이트로 가른다. 형식이 아니면 null. */
function decodeDataUrl(
  value: string,
): { extension: string; bytes: Buffer } | null {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(value);
  if (!match) return null;

  const extension =
    match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
  return { extension, bytes: Buffer.from(match[2], "base64") };
}

/**
 * 카탈로그에서 성분을 찾는다 — **AI 를 태우기 전의 DB 우선 경로**(사용자 지시 2026-08-20).
 *
 * 같은 제품을 누군가 이미 등록했다면 성분이 카탈로그(`products.ingredients`)에 있다.
 * 그건 실제 성분표 사진에서 추출된 값이라, 이름만으로 모델 지식에 묻는 것보다 **더 정확**하고
 * 20~50초와 구독 비용이 0이 된다.
 *
 * 매칭 규칙:
 *  - 회사가 오면 (name, brand) 정확 일치 — 저장 시 brand 는 trim·빈 문자열 정규화이므로
 *    같은 규칙으로 맞춘다(products POST 와 동일).
 *  - 회사가 없으면 이름만으로 찾되 **정확히 1건일 때만** 쓴다 — 동명 타사 제품 오매칭 방지.
 *  - 성분이 비어 있으면(아직 추출 전) 캐시로 치지 않는다.
 */
async function readCatalog(
  productName: string,
  productCompany: string | undefined,
): Promise<{ name: string; category: string; ingredients: string[] } | null> {
  const brand = productCompany?.trim() ?? "";
  const rows = await selectRows(
    brand
      ? `SELECT name, category, ingredients FROM products
          WHERE name = ? AND brand = ? AND JSON_LENGTH(ingredients) > 0`
      : `SELECT name, category, ingredients FROM products
          WHERE name = ? AND JSON_LENGTH(ingredients) > 0`,
    brand ? [productName, brand] : [productName],
  );
  if (rows.length !== 1) return null;

  const row = rows[0];
  if (typeof row !== "object" || row === null) return null;
  const item: Record<string, unknown> = { ...row };
  // mysql2 는 JSON 컬럼을 파싱해 주기도, 문자열로 주기도 한다.
  const raw =
    typeof item.ingredients === "string"
      ? (JSON.parse(item.ingredients) as unknown)
      : item.ingredients;
  if (!isStringArray(raw) || raw.length === 0) return null;

  return {
    name: typeof item.name === "string" ? item.name : productName,
    category: typeof item.category === "string" ? item.category : "미분류",
    ingredients: raw,
  };
}

export async function POST(request: Request) {
  const userId = await currentUserId();

  // content-length 가 없는 요청(예: 청크 전송)은 검사 없이 통과시킨다 —
  // 상한을 강제하지 못하는 유일한 경로이지만, 흔치 않고 다른 방어(가드·타임아웃)가 남아 있다.
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return Response.json(
      { message: "요청 본문이 너무 큽니다(최대 8MB)." },
      { status: 413 },
    );
  }

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

  const capacity =
    typeof body.capacity === "string" ? body.capacity : undefined;
  const productCompany =
    typeof body.productCompany === "string" ? body.productCompany : undefined;

  const hasImage =
    typeof body.productImg === "string" && body.productImg.length > 0;

  /*
   * 카탈로그 우선 — **성분표 사진이 없을 때만.** 사진이 왔다는 것은 사용자가 자기 제품의
   * 성분표를 근거로 내밀었다는 뜻이다(리뉴얼 제품 등 카탈로그와 다를 수 있다) —
   * 그때는 사진을 읽는다. 가드보다 먼저 본다: AI 를 태우지 않는 요청을 429 로 막을
   * 이유가 없다(concern·report 와 같은 순서). 조회 실패는 AI 경로로 계속 간다.
   */
  if (!hasImage) {
    try {
      const catalog = await readCatalog(productName, productCompany);
      if (catalog) {
        // 응답 계약은 AI 경로와 동일(snake_case) — 클라이언트는 차이를 모른다.
        return Response.json({
          product_name: catalog.name,
          category: catalog.category,
          ingredients: catalog.ingredients,
        });
      }
    } catch (error: unknown) {
      console.warn(
        "[api/ai/ingredients] 카탈로그 조회 실패, AI 로 진행:",
        error,
      );
    }

    /*
     * 2단계 — 브랜드 공식몰의 **전성분 표기**(화장품법상 표시 의무 정보).
     * 카탈로그에 없고 사진도 없을 때만 본다. 모델 기억보다 근거가 확실하고
     * 수 초면 끝난다(AI 는 20~50초). 실패는 조용히 다음 단계로 넘어간다.
     *
     * 카테고리는 이 경로로 알 수 없으므로 AI 를 태우지 않고 "미분류"로 둔다 —
     * 성분만으로도 충돌·시너지 분석이라는 핵심 가치가 성립한다.
     */
    const fromBrand = await findIngredientsFromBrandSite(
      productName,
      productCompany,
    );
    if (fromBrand) {
      console.info(
        `[api/ai/ingredients] 공식몰에서 전성분 ${fromBrand.length}개 확보 — AI 생략`,
      );
      return Response.json({
        product_name: productName,
        category: "미분류",
        ingredients: fromBrand,
      });
    }
  }

  // 사용자당 동시 1건. claude 프로세스 1개가 뜨는 비용이라 중복 실행을 막는다.
  if (!acquire(userId)) {
    return Response.json(
      {
        message: "이미 처리 중인 요청이 있습니다. 완료 후 다시 시도해 주세요.",
      },
      { status: 429 },
    );
  }

  try {
    let workdir: string | null = null;
    let imagePath: string | undefined;

    try {
      if (hasImage && typeof body.productImg === "string") {
        const decoded = decodeDataUrl(body.productImg);
        if (!decoded) {
          return Response.json(
            { message: "productImg 는 image data URL 이어야 합니다." },
            { status: 400 },
          );
        }
        workdir = await mkdtemp(join(tmpdir(), "al-ocr-"));
        imagePath = join(workdir, `label.${decoded.extension}`);
        await writeFile(imagePath, decoded.bytes);
      }

      const prompt = buildIngredientsPrompt({
        productName,
        capacity,
        productCompany,
        imagePath,
      });

      const raw = await runClaude(prompt, {
        // 이미지가 없으면 도구를 주지 않는다 — 불필요한 권한을 열지 않는다.
        allowedTools: imagePath ? ["Read"] : [],
        timeoutMs: TIMEOUT_MS,
        cleanupSession: Boolean(imagePath),
      });

      const parsed = parseJsonObject(raw) as Record<string, unknown>;

      // LLM 은 스키마를 보장하지 않는다. 프론트로 내보내기 전에 서버에서 좁힌다.
      if (!isStringArray(parsed.ingredients)) {
        // AI 응답 원문은 응답 본문이 아니라 로그로만 남긴다(공개 서비스에 내부 응답을 노출하지 않는다).
        console.error(
          "[api/ai/ingredients] ingredients 배열 없음:",
          raw.slice(0, 500),
        );
        return Response.json(
          { message: "AI 응답에 ingredients 배열이 없습니다." },
          { status: 502 },
        );
      }

      // ⚠️ 빈 배열은 실패가 아니라 정상 응답이다(프롬프트 규칙 2: 확신 없으면 []).
      //    여기서 에러로 바꾸면 "성분을 지어내지 않는다"는 설계를 정면으로 위배한다.
      return Response.json({
        product_name:
          typeof parsed.product_name === "string"
            ? parsed.product_name
            : productName,
        category:
          typeof parsed.category === "string" ? parsed.category : "미분류",
        ingredients: parsed.ingredients,
      });
    } catch (error: unknown) {
      // claude CLI 의 stderr·서버 절대 경로가 섞여 나올 수 있어 상세는 로그로만 남긴다.
      console.error("[api/ai/ingredients]", error);
      return Response.json(
        { message: "성분 추출에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      );
    } finally {
      // 성분표 사진이 서버에 남지 않게 한다. 실패해도 본 응답을 막지 않는다.
      if (workdir)
        await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  } finally {
    // 예외·타임아웃으로 새면 이 사용자는 영영 AI 를 못 쓰게 되므로 반드시 여기서 푼다.
    release(userId);
  }
}
