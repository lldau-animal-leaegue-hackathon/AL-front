/**
 * 생성된 루틴 — `routines` × `routine_steps`.
 *
 * 저장은 **통째 교체**다. 루틴은 한 번 생성할 때 아침·저녁이 한 세트로 나오므로
 * 부분 갱신보다 세트 교체가 상태를 단순하게 유지한다(반쪽만 남는 경우가 없다).
 */

import { currentUserId } from "@/lib/auth/anonUser";
import {
  dbErrorResponse,
  ensureUser,
  execute,
  selectRows,
  withTransaction,
} from "@/lib/db/pool";
import { groupSteps, toRoutine } from "@/lib/db/rows";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await currentUserId();

    const routineRows = await selectRows(
      `SELECT id, name, \`condition\`, time_slot, summary, created_at
         FROM routines WHERE user_id = ? ORDER BY created_at`,
      [userId],
    );
    if (routineRows.length === 0) return Response.json([]);

    const ids = routineRows
      .map((row) =>
        typeof row === "object" && row !== null && "id" in row
          ? String(row.id)
          : "",
      )
      .filter(Boolean);

    // 루틴마다 쿼리를 날리면 N+1 이 된다. IN 으로 한 번에 가져와 묶는다.
    const stepRows = await selectRows(
      `SELECT routine_id, id, routine_name, estimated_time,
              using_product, how_to_use, tips, warning
         FROM routine_steps
        WHERE routine_id IN (${ids.map(() => "?").join(",")})
        ORDER BY seq`,
      ids,
    );
    const stepsByRoutine = groupSteps(stepRows);

    const routines = routineRows
      .map((row) => {
        const id =
          typeof row === "object" && row !== null && "id" in row
            ? String(row.id)
            : "";
        return toRoutine(row, stepsByRoutine.get(id) ?? []);
      })
      .filter((r) => r !== null);

    return Response.json(routines);
  } catch (error) {
    return dbErrorResponse("api/routines GET", error);
  }
}

/** 저장 대상으로 인정할 최소 모양. 클라이언트가 보내는 값이라도 서버에서 다시 좁힌다. */
type StepInput = {
  routineName: string;
  estimatedTime: number;
  usingProduct: string[];
  howToUse: string[];
  tips: string[];
  warning: string[];
};
type RoutineInput = {
  name: string;
  condition: string;
  time: "am" | "pm";
  summary: string;
  steps: StepInput[];
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function narrowStep(value: unknown): StepInput | null {
  if (typeof value !== "object" || value === null) return null;
  const step: Record<string, unknown> = { ...value };

  const routineName =
    typeof step.routineName === "string" ? step.routineName : "";
  if (!routineName) return null;

  return {
    routineName,
    // 초 단위 정수다. 분으로 착각해 넣으면 타이머가 60배 틀어진다.
    estimatedTime:
      typeof step.estimatedTime === "number" &&
      Number.isFinite(step.estimatedTime)
        ? Math.max(0, Math.trunc(step.estimatedTime))
        : 0,
    usingProduct: strings(step.usingProduct),
    howToUse: strings(step.howToUse),
    tips: strings(step.tips),
    warning: strings(step.warning),
  };
}

function narrowRoutine(value: unknown): RoutineInput | null {
  if (typeof value !== "object" || value === null) return null;
  const routine: Record<string, unknown> = { ...value };

  const name = typeof routine.name === "string" ? routine.name : "";
  if (!name) return null;

  const steps = Array.isArray(routine.steps)
    ? routine.steps.map(narrowStep).filter((s) => s !== null)
    : [];

  return {
    name,
    condition:
      typeof routine.condition === "string" && routine.condition
        ? routine.condition
        : "평소",
    time: routine.time === "pm" ? "pm" : "am",
    summary: typeof routine.summary === "string" ? routine.summary : "",
    steps,
  };
}

export async function PUT(request: Request) {
  let body: { routines?: unknown };
  try {
    body = (await request.json()) as { routines?: unknown };
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  if (!Array.isArray(body.routines)) {
    return Response.json(
      { message: "routines 배열이 필요합니다." },
      { status: 400 },
    );
  }
  const routines = body.routines.map(narrowRoutine).filter((r) => r !== null);

  try {
    const userId = await currentUserId();

    /*
     * 삭제와 삽입 사이에서 실패하면 루틴이 통째로 사라진다. 반드시 한 트랜잭션 안에서 한다.
     * (routine_steps 는 FK CASCADE 라 따로 지우지 않아도 함께 사라진다.)
     */
    await withTransaction(async (conn) => {
      await ensureUser(userId, conn);
      await conn.execute(`DELETE FROM routines WHERE user_id = ?`, [userId]);

      for (const routine of routines) {
        /*
         * id 를 **여기서** 만든다. DB 의 UUID() 에 맡기면 방금 넣은 행을 다시 찾아야 하는데,
         * 같은 이름·시간대 루틴이 여러 벌이면 엉뚱한 행을 집을 수 있다.
         */
        const routineId = crypto.randomUUID();

        await conn.execute(
          `INSERT INTO routines (id, user_id, name, \`condition\`, time_slot, summary)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            routineId,
            userId,
            routine.name,
            routine.condition,
            routine.time,
            routine.summary,
          ],
        );

        for (const [index, step] of routine.steps.entries()) {
          await conn.execute(
            `INSERT INTO routine_steps
               (id, routine_id, seq, routine_name, estimated_time,
                using_product, how_to_use, tips, warning)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID(),
              routineId,
              index,
              step.routineName,
              step.estimatedTime,
              JSON.stringify(step.usingProduct),
              JSON.stringify(step.howToUse),
              JSON.stringify(step.tips),
              JSON.stringify(step.warning),
            ],
          );
        }
      }
    });

    return Response.json({ ok: true, count: routines.length });
  } catch (error) {
    return dbErrorResponse("api/routines PUT", error);
  }
}

export async function DELETE() {
  try {
    const changed = await execute(`DELETE FROM routines WHERE user_id = ?`, [
      await currentUserId(),
    ]);
    return Response.json({ ok: true, deleted: changed });
  } catch (error) {
    return dbErrorResponse("api/routines DELETE", error);
  }
}
