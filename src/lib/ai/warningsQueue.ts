/**
 * 주의사항 백그라운드 생성 큐 — **서버 전용**.
 *
 * 예전에는 홈 화면(useIngredientAlerts)이 주의사항 없는 제품을 발견하면 클라이언트가
 * 순차로 AI 를 호출했다. 그 호출들이 **사용자당 동시 1건 가드를 30초×제품 수만큼
 * 독점**해서, 그동안 "내 고민"·루틴 생성이 전부 429 로 튕겼다(사용자 보고 2026-08-20).
 * 탭을 옮기면 고아가 된 진행 중 호출이 가드를 쥔 채 남아 다음 루프까지 429 를 받았다.
 *
 * 이제 생성은 **제품 등록 시점에 서버가 응답을 보낸 뒤** 여기서 한다:
 *  - 사용자 가드(acquire/release)를 쓰지 않는다 — 사용자가 시작한 대화형 호출이
 *    아니라서 사용자의 다른 AI 기능을 막을 이유가 없다.
 *  - 대신 **전역 직렬 큐**로 스스로를 제한한다 — claude 프로세스가 겹쳐 뜨지 않는다.
 *  - 홈 화면은 저장된 값만 읽는다(AI 호출 0건).
 *
 * HMR 이 모듈을 재평가해도 체인이 끊기지 않도록 globalThis 에 둔다(guard.ts 와 같은 이유).
 */

import { isStringArray, parseJsonObject } from "@/lib/claude/parseJson";
import { runClaude } from "@/lib/claude/runner";
import { execute, selectRows } from "@/lib/db/pool";
import { textArray } from "@/lib/db/input";
import { buildWarningsPrompt } from "@/lib/prompts/warnings";

/**
 * 프롬프트 규칙 6 — 성분 정보가 부족하면 AI 도 이 문구 하나만 반환하도록 못박혀 있다.
 * 결과가 정해져 있으므로 성분 없는 제품은 호출 없이 이 문구를 바로 저장한다.
 */
export const NO_INGREDIENTS_WARNING =
  "성분 정보가 부족하여 구체적인 주의사항을 제공하기 어렵습니다";

const TIMEOUT_MS = 120_000;

const globalForQueue = globalThis as typeof globalThis & {
  /** 전역 직렬 체인 — 작업이 하나씩만 돈다. */
  __alWarningsChain?: Promise<void>;
  /** 대기·실행 중인 product id. 같은 제품을 연달아 담아도 한 번만 생성한다. */
  __alWarningsQueued?: Set<string>;
};

type Job = {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
};

async function generate(job: Job): Promise<void> {
  // 큐에서 기다리는 사이 다른 경로(다른 사용자의 등록 등)로 채워졌으면 건너뛴다.
  const rows = await selectRows(
    `SELECT 1 FROM products WHERE id = ? AND warnings IS NULL`,
    [job.id],
  );
  if (rows.length === 0) return;

  const raw = await runClaude(
    buildWarningsPrompt({
      productName: job.name,
      category: job.category,
      ingredients: job.ingredients,
    }),
    { timeoutMs: TIMEOUT_MS },
  );

  const parsed = parseJsonObject(raw) as Record<string, unknown>;
  if (!isStringArray(parsed.warning)) {
    console.error(
      `[warningsQueue] "${job.name}" warning 배열 없음:`,
      raw.slice(0, 300),
    );
    return; // NULL 로 남는다 — 다음 등록 때 다시 시도된다.
  }

  // PATCH 와 같은 상한(개수 20·길이 500). 넘치면 저장하지 않고 로그만 남긴다.
  const warnings = textArray(parsed.warning, { maxItems: 20, maxLength: 500 });
  if (warnings === null) {
    console.warn(`[warningsQueue] "${job.name}" 상한 초과 — 저장 생략`);
    return;
  }

  /*
   * **첫 기록(NULL)일 때만** 쓴다 — 데이터 손실 가드(PATCH 와 같은 규칙).
   * 빈 배열도 저장한다: "확인했고 주의 없음"이라는 답이라 재생성이 반복되지 않는다.
   */
  await execute(
    `UPDATE products SET warnings = ? WHERE id = ? AND warnings IS NULL`,
    [JSON.stringify(warnings), job.id],
  );
}

/**
 * 생성을 큐에 넣는다. **응답을 기다리지 않는다** — 등록 UX 를 34초 막지 않기 위한
 * 지연 생성이라는 원래 결정(useIngredientAlerts 주석)은 그대로고, 실행 주체만
 * 클라이언트 → 서버로 옮겼다.
 */
export function enqueueWarningsGeneration(job: Job): void {
  if (job.ingredients.length === 0) return; // 규칙 6 — 라우트가 고정 문구를 동기 저장한다

  globalForQueue.__alWarningsQueued ??= new Set();
  const queued = globalForQueue.__alWarningsQueued;
  if (queued.has(job.id)) return;
  queued.add(job.id);

  globalForQueue.__alWarningsChain = (
    globalForQueue.__alWarningsChain ?? Promise.resolve()
  )
    .then(() => generate(job))
    .catch((error: unknown) => {
      // 실패해도 체인은 계속 돈다. warnings 는 NULL 로 남아 다음 등록 때 재시도된다.
      console.warn(`[warningsQueue] "${job.name}" 생성 실패:`, error);
    })
    .finally(() => {
      queued.delete(job.id);
    });
}
