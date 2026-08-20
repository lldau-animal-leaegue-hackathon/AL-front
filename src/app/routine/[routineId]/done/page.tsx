import { RoutineDone } from "../../components/RoutineDone";

/**
 * 루틴 완료 화면.
 *
 * 기록은 localStorage 에 남으므로 서버는 아무것도 모른다 —
 * 페이지는 `params` 만 넘기는 껍데기이고 본문은 클라이언트 경계가 맡는다.
 */
export default async function RoutineDonePage({
  params,
}: PageProps<"/routine/[routineId]/done">) {
  const { routineId } = await params;

  return <RoutineDone routineId={routineId} />;
}
