/**
 * GET /api/knowledge/concerns — 고민 시나리오별 도움 성분 사전.
 *
 * `ingredient_effects` 의 concern·helps 행을 시나리오로 묶어 준다.
 * **AI 를 부르지 않는다** — "내 고민" 탭의 자유 입력(AI 경로)과 달리,
 * 자주 찾는 고민은 여기서 즉시(0원·수백 ms) 답한다.
 */

import { dbErrorResponse, selectRows } from "@/lib/db/pool";

export const runtime = "nodejs";

/**
 * 시나리오 표시 순서 — 시드(db/seeds/001)의 순서와 같다. DB 에는 순서 컬럼이 없고,
 * 수확으로 새 시나리오가 생기면(지금은 concern 수확이 없어 시드 8종뿐) 뒤에 붙는다.
 */
const CONCERN_ORDER = [
  "여드름·트러블",
  "건조함",
  "유분·번들거림",
  "넓은 모공",
  "색소침착·칙칙함",
  "주름·탄력 저하",
  "민감·홍조",
  "각질·피부결",
];

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const rows = await selectRows(
      `SELECT scenario, ingredient, description, caution
         FROM ingredient_effects
        WHERE scenario_kind = 'concern' AND relation = 'helps'`,
      [],
    );

    const groups = new Map<
      string,
      { name: string; description: string; caution: string | null }[]
    >();
    for (const row of rows) {
      if (typeof row !== "object" || row === null) continue;
      const item: Record<string, unknown> = { ...row };
      const scenario = str(item.scenario);
      const name = str(item.ingredient);
      const description = str(item.description);
      if (!scenario || !name || !description) continue;
      const caution = str(item.caution);

      const list = groups.get(scenario) ?? [];
      list.push({ name, description, caution: caution || null });
      groups.set(scenario, list);
    }

    const ordered = [
      ...CONCERN_ORDER.filter((s) => groups.has(s)),
      ...[...groups.keys()].filter((s) => !CONCERN_ORDER.includes(s)),
    ];

    return Response.json({
      scenarios: ordered.map((scenario) => ({
        scenario,
        ingredients: groups.get(scenario) ?? [],
      })),
    });
  } catch (error) {
    return dbErrorResponse("api/knowledge/concerns GET", error);
  }
}
