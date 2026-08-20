/**
 * 생성된 루틴. 서버 `/api/routines` 를 부른다.
 *
 * 저장은 **통째 교체**다 — 한 번 생성할 때 아침·저녁이 한 세트로 나오므로
 * 부분 갱신보다 세트 교체가 상태를 단순하게 유지한다(반쪽만 남는 경우가 없다).
 */

import type { Routine } from "@/types/skincare";

import { api } from "./client";

export const fetchRoutines = () => api.get<Routine[]>("/routines");

/** 서버가 id·createdAt 을 만들므로 보낼 때는 없어도 된다. */
export type RoutineInput = Omit<Routine, "id" | "createdAt"> & {
  steps: Omit<Routine["steps"][number], "id">[];
};

export const saveRoutines = (input: { routines: RoutineInput[] }) =>
  api.put<{ ok: boolean; count: number }>("/routines", input);

/** condition 을 주면 그 세트만, 없으면 전부 지운다. */
export const deleteRoutines = (input?: { condition?: string }) =>
  api.delete<{ ok: boolean; deleted: number }>(
    input?.condition
      ? `/routines?condition=${encodeURIComponent(input.condition)}`
      : "/routines",
  );
