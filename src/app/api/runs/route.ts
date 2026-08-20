/**
 * 루틴 수행 기록 — `routine_runs`.
 *
 * Q10 의 "이번 주 루틴 달성률"이 이 기록에서만 계산된다. 기록이 곧 점수의 유일한 근거다.
 *
 * ⚠️ `routine_id` 에는 **FK 가 없다**(의도적). 루틴을 다시 만들면 옛 기록이 고아가 되는데,
 *    CASCADE 로 지우면 과거 수행 이력이 사라져 달성률이 소급해서 바뀐다.
 */

import { currentUserId } from "@/lib/auth/anonUser";
import {
  dbErrorResponse,
  ensureUser,
  execute,
  selectRows,
} from "@/lib/db/pool";
import { isoDate, LIMITS, text, textArray } from "@/lib/db/input";
import { toRoutineRun } from "@/lib/db/rows";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await selectRows(
      `SELECT id, routine_id, started_at, finished_at, completed_step_ids
         FROM routine_runs WHERE user_id = ? ORDER BY finished_at`,
      [await currentUserId()],
    );
    return Response.json(rows.map(toRoutineRun).filter((r) => r !== null));
  } catch (error) {
    return dbErrorResponse("api/runs GET", error);
  }
}

export async function POST(request: Request) {
  let body: {
    routineId?: unknown;
    startedAt?: unknown;
    finishedAt?: unknown;
    completedStepIds?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  // 컬럼이 CHAR(36)(UUID)라 넘치면 DB 에러 → 503. migrate 라우트와 같은 상한으로 400 처리.
  const routineId = text(body.routineId, 36);
  /*
   * `new Date()` 는 "March 5" 나 서기 5만년도 받아 준다. 시각이 터무니없으면
   * 주간 달성률이 조용히 틀어지므로 `isoDate` 가 범위까지 확인한다.
   */
  const startedAt = isoDate(body.startedAt);
  const finishedAt = isoDate(body.finishedAt);

  if (!routineId || !startedAt || !finishedAt) {
    return Response.json(
      { message: "routineId·startedAt·finishedAt 이 필요합니다." },
      { status: 400 },
    );
  }

  const completedStepIds = textArray(body.completedStepIds ?? [], {
    maxItems: LIMITS.completedStepIds,
    maxLength: 64,
  });
  if (!completedStepIds) {
    return Response.json(
      { message: "completedStepIds 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const userId = await currentUserId();
    await ensureUser(userId);

    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO routine_runs
         (id, user_id, routine_id, started_at, finished_at, completed_step_ids)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        routineId,
        startedAt,
        finishedAt,
        JSON.stringify(completedStepIds),
      ],
    );

    return Response.json(
      {
        id,
        routineId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        completedStepIds,
      },
      { status: 201 },
    );
  } catch (error) {
    return dbErrorResponse("api/runs POST", error);
  }
}
