/**
 * 생성된 루틴 저장소 + 그 생성 입력(피부 프로필).
 *
 * 루틴은 **여러 벌**이다(db9eaed 로 확정된 모델) — 프롬프트 1회 호출이
 * `{ morning, evening }` 을 주므로 `Routine` 2개로 펼쳐 저장한다.
 * 생성 입력은 여러 루틴이 공유하므로 루틴마다 중복 저장하지 않고 따로 둔다.
 *
 * ⚠️ 이름이 비슷한 `src/app/routine/routines.ts` 는 **시드 데이터**다(Step 6 에서 제거).
 *    이 파일은 사용자가 실제로 생성한 루틴을 다룬다.
 */

import type { Routine, SkinProfile } from "@/types/skincare";

import { load, remove, save } from "./local";

/** `useStored` 로 같은 값을 구독하는 화면들이 있어 키를 노출한다 — 문자열을 두 곳에 적으면 갈라진다. */
export const ROUTINES_KEY = "routines";
export const PROFILE_KEY = "skin-profile";

export function listRoutines(): Routine[] {
  return load<Routine[]>(ROUTINES_KEY, []);
}

export function getRoutine(id: string): Routine | undefined {
  return listRoutines().find((routine) => routine.id === id);
}

/**
 * 생성 결과로 **통째 교체**한다.
 * 루틴은 한 번 생성할 때 아침·저녁이 한 세트로 나오므로, 부분 갱신보다
 * 세트 교체가 상태를 단순하게 유지한다(반쪽만 남는 경우가 없다).
 */
export function saveRoutines(routines: Routine[]): boolean {
  return save(ROUTINES_KEY, routines);
}

export function clearRoutines(): boolean {
  return remove(ROUTINES_KEY);
}

/** 루틴 생성 입력. 없으면 아직 한 번도 생성하지 않은 상태다. */
export function getSkinProfile(): SkinProfile | null {
  return load<SkinProfile | null>(PROFILE_KEY, null);
}

export function saveSkinProfile(
  input: Omit<SkinProfile, "updatedAt">,
): boolean {
  return save(PROFILE_KEY, {
    ...input,
    updatedAt: new Date().toISOString(),
  } satisfies SkinProfile);
}
