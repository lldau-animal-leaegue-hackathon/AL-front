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

/**
 * ISO 문자열을 Date 로 바꾼다.
 * 문자열을 그대로 넘기면 `2026-08-18T11:23:11.000Z` 의 `T`·`Z` 를 DB 가 해석하지 못한다.
 * Date 로 주면 드라이버가 풀의 `timezone: "Z"` 기준으로 직렬화한다.
 */
function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

  const routineId = typeof body.routineId === "string" ? body.routineId : "";
  const startedAt = toDate(body.startedAt);
  const finishedAt = toDate(body.finishedAt);

  if (!routineId || !startedAt || !finishedAt) {
    return Response.json(
      { message: "routineId·startedAt·finishedAt 이 필요합니다." },
      { status: 400 },
    );
  }

  const completedStepIds = Array.isArray(body.completedStepIds)
    ? body.completedStepIds.filter((v): v is string => typeof v === "string")
    : [];

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
