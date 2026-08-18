/**
 * 피부 프로필 — `skin_profiles`. 루틴 생성의 입력이다.
 *
 * 여러 루틴이 같은 입력에서 나오므로 루틴마다 중복 저장하지 않고 따로 둔다.
 * 재생성 화면의 프리필과 프로필 화면의 "피부 프로필" 표시가 이걸 함께 쓴다.
 */

import { currentUserId } from "@/lib/auth/anonUser";
import {
  dbErrorResponse,
  ensureUser,
  execute,
  selectRows,
} from "@/lib/db/pool";
import { toSkinProfile } from "@/lib/db/rows";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await selectRows(
      `SELECT wonder, usable_morning, usable_evening, updated_at
         FROM skin_profiles WHERE user_id = ?`,
      [await currentUserId()],
    );

    // 아직 한 번도 루틴을 만들지 않은 상태다. 404 가 아니라 null 이 정상 응답이다.
    return Response.json(rows.length > 0 ? toSkinProfile(rows[0]) : null);
  } catch (error) {
    return dbErrorResponse("api/profile GET", error);
  }
}

export async function PUT(request: Request) {
  let body: { wonder?: unknown; usableTime?: unknown };
  try {
    body = (await request.json()) as { wonder?: unknown; usableTime?: unknown };
  } catch {
    return Response.json({ message: "JSON 본문이 아닙니다." }, { status: 400 });
  }

  const wonder = typeof body.wonder === "string" ? body.wonder.trim() : "";
  if (!wonder) {
    return Response.json({ message: "wonder 는 필수입니다." }, { status: 400 });
  }

  const usableTime =
    typeof body.usableTime === "object" && body.usableTime !== null
      ? { ...body.usableTime }
      : {};
  const morning =
    "morning" in usableTime && typeof usableTime.morning === "string"
      ? usableTime.morning
      : "";
  const evening =
    "evening" in usableTime && typeof usableTime.evening === "string"
      ? usableTime.evening
      : "";

  try {
    const userId = await currentUserId();
    await ensureUser(userId);

    // PK 가 user_id 라 사용자당 1행이다. 두 번째부터는 갱신된다.
    await execute(
      `INSERT INTO skin_profiles (user_id, wonder, usable_morning, usable_evening)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         wonder         = VALUES(wonder),
         usable_morning = VALUES(usable_morning),
         usable_evening = VALUES(usable_evening)`,
      [userId, wonder, morning, evening],
    );

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse("api/profile PUT", error);
  }
}
