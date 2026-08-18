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

import { isStringArray, parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { buildIngredientsPrompt } from "@/lib/prompts/ingredients";

// 자식 프로세스를 띄우므로 Edge 런타임에서는 동작하지 않는다.
export const runtime = "nodejs";

/** 이미지 인식은 텍스트만 다루는 호출보다 오래 걸린다(WatchList 기준 300초). */
const TIMEOUT_MS = 300_000;

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

  const capacity =
    typeof body.capacity === "string" ? body.capacity : undefined;
  const productCompany =
    typeof body.productCompany === "string" ? body.productCompany : undefined;

  let workdir: string | null = null;
  let imagePath: string | undefined;

  try {
    if (typeof body.productImg === "string" && body.productImg.length > 0) {
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
      return Response.json(
        {
          message: "AI 응답에 ingredients 배열이 없습니다.",
          raw: raw.slice(0, 500),
        },
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/ai/ingredients]", message);
    return Response.json({ message }, { status: 502 });
  } finally {
    // 성분표 사진이 서버에 남지 않게 한다. 실패해도 본 응답을 막지 않는다.
    if (workdir)
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}
