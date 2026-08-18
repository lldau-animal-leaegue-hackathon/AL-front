/**
 * 루틴 수행 기록. 서버 `/api/runs` 를 부른다.
 *
 * "이번 주 루틴 달성률"이 이 기록에서만 계산된다 — 기록이 곧 점수의 유일한 근거다.
 *
 * ⚠️ **수행 중 표시(`RunStart`)는 여기 없다.** 그건 기기별 임시 상태라 서버에 테이블이 없고
 *    `src/lib/storage/history.ts` 의 localStorage 경로에 그대로 남는다.
 */

import type { RoutineRun } from "@/types/skincare";

import { api } from "./client";

export const fetchRuns = () => api.get<RoutineRun[]>("/runs");

export const createRun = (input: Omit<RoutineRun, "id">) =>
  api.post<RoutineRun>("/runs", input);
