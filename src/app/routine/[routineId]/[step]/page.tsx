import { RoutineRunner } from "../../components/RoutineRunner";

/**
 * 루틴 수행 화면.
 *
 * 루틴이 localStorage 에 있으므로 **서버는 내용을 모른다.**
 * 예전에는 시드 기반으로 `generateStaticParams` 를 돌려 정적 프리렌더했지만,
 * 사용자마다 단계 수가 달라 미리 만들 수 없다 → 제거했다.
 *
 * 페이지는 껍데기만 남기고 `params` 만 넘긴다. 화면 본문·404 판정은
 * 클라이언트 경계인 `RoutineRunner` 가 맡는다.
 */
export default async function RoutineStepPage({
  params,
}: PageProps<"/routine/[routineId]/[step]">) {
  const { routineId, step } = await params;

  return <RoutineRunner routineId={routineId} step={step} />;
}
