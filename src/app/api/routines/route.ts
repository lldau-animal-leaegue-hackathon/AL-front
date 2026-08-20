/**
 * 생성된 루틴 — `routines` × `routine_steps`.
 *
 * 저장은 **`condition` 단위 교체**다. 루틴은 한 번 생성할 때 아침·저녁이 한 세트로 나오므로
 * 세트 교체가 상태를 단순하게 유지하고(반쪽만 남는 경우가 없다), 조건으로 범위를 좁혀서
 * 기본 루틴과 고민 집중 루틴이 서로를 지우지 않는다.
 */

import { currentUserId } from "@/lib/auth/anonUser";
import {
  dbErrorResponse,
  ensureUser,
  execute,
  selectRows,
  withTransaction,
} from "@/lib/db/pool";
import {
  intInRange,
  LIMITS,
  optionalText,
  text,
  textArray,
} from "@/lib/db/input";
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

/** 단계 안의 문자열 배열(사용법·팁·주의). 상한을 넘으면 빈 배열로 떨어뜨린다. */
function stepTexts(value: unknown): string[] {
  return (
    textArray(value ?? [], {
      maxItems: LIMITS.stepTextItems,
      maxLength: LIMITS.stepTextLength,
    }) ?? []
  );
}

function narrowStep(value: unknown): StepInput | null {
  if (typeof value !== "object" || value === null) return null;
  const step: Record<string, unknown> = { ...value };

  const routineName = text(step.routineName, LIMITS.routineName);
  if (!routineName) return null;

  return {
    routineName,
    /*
     * 초 단위 정수다. 분으로 착각해 넣으면 타이머가 60배 틀어진다.
     * 상한이 필요한 이유: 값 하나가 INT 범위를 넘으면 그 INSERT 가 죽고
     * **트랜잭션 전체가 롤백돼 루틴이 한 벌도 저장되지 않는다.**
     */
    estimatedTime: intInRange(step.estimatedTime, 0, LIMITS.estimatedTime) ?? 0,
    usingProduct: stepTexts(step.usingProduct),
    howToUse: stepTexts(step.howToUse),
    tips: stepTexts(step.tips),
    warning: stepTexts(step.warning),
  };
}

function narrowRoutine(value: unknown): RoutineInput | null {
  if (typeof value !== "object" || value === null) return null;
  const routine: Record<string, unknown> = { ...value };

  const name = text(routine.name, LIMITS.routineName);
  if (!name) return null;

  /*
   * 단계 수 상한. 없으면 steps 를 수만 개 보내 트랜잭션이 사용자 행을 잡은 채
   * 수십 초를 왕복하고, `seq` 가 SMALLINT 라 32,767 을 넘는 순간 전체가 롤백된다.
   */
  const rawSteps = Array.isArray(routine.steps) ? routine.steps : [];
  if (rawSteps.length > LIMITS.steps) return null;

  /*
   * ⚠️ 길이를 넘긴 `condition` 을 "평소"로 떨어뜨리면 안 된다.
   *    저장이 조건 단위 교체라, 그 순간 **사용자의 기본 루틴이 지워진다.**
   *    없는 것(undefined)만 기본값을 쓰고, 잘못된 값은 그 루틴을 통째로 거부한다.
   */
  const condition = optionalText(routine.condition, LIMITS.condition);
  if (condition === null) return null;

  return {
    name,
    condition: condition ?? "평소",
    time: routine.time === "pm" ? "pm" : "am",
    summary: text(routine.summary, LIMITS.summary) ?? "",
    steps: rawSteps.map(narrowStep).filter((s) => s !== null),
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
  if (body.routines.length > LIMITS.routines) {
    return Response.json(
      {
        message: `루틴은 한 번에 ${LIMITS.routines}벌까지 저장할 수 있습니다.`,
      },
      { status: 400 },
    );
  }
  const routines = body.routines.map(narrowRoutine).filter((r) => r !== null);

  /*
   * ⚠️ 걸러진 루틴을 **조용히 버리면 안 된다.** 저장이 조건 단위 교체라, 2벌 중 1벌이
   *    걸러지면 기존 2벌을 지우고 1벌만 넣는다 — 화면은 "루틴을 만들었어요"를 띄운
   *    채로 아침 루틴이 사라진다. 부분 저장 대신 요청 전체를 거부한다.
   */
  if (routines.length !== body.routines.length) {
    return Response.json(
      { message: "루틴 형식이 올바르지 않아 저장하지 못했습니다." },
      { status: 400 },
    );
  }

  try {
    const userId = await currentUserId();

    /*
     * ⭐ **`condition` 단위로 교체한다.** 예전에는 사용자의 루틴을 전부 지우고 다시 넣었는데,
     *    그러면 "고민 집중 케어"를 만든 뒤 기본 루틴을 다시 만들면 고민 루틴이 사라진다.
     *    이번 요청에 담긴 조건만 갈아 끼우면 나머지 조건은 그대로 남는다.
     *
     *    전부 지우려면 `DELETE /api/routines` 를 쓴다 — 그쪽이 그 일을 하는 자리다.
     *
     * 삭제와 삽입 사이에서 실패하면 그 조건의 루틴이 사라진다. 반드시 한 트랜잭션 안에서 한다.
     * (routine_steps 는 FK CASCADE 라 따로 지우지 않아도 함께 사라진다.)
     */
    const conditions = [...new Set(routines.map((r) => r.condition))];

    await withTransaction(async (conn) => {
      await ensureUser(userId, conn);

      for (const condition of conditions) {
        await conn.execute(
          `DELETE FROM routines WHERE user_id = ? AND \`condition\` = ?`,
          [userId, condition],
        );
      }

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
