/**
 * 피부 프로필(루틴 생성 입력). 서버 `/api/profile` 을 부른다.
 *
 * 여러 루틴이 같은 입력에서 나오므로 루틴마다 중복 저장하지 않고 따로 둔다.
 */

import type { SkinProfile } from "@/types/skincare";

import { api } from "./client";

/** 아직 한 번도 루틴을 만들지 않았으면 `null` 이다 — 404 가 아니라 정상 응답이다. */
export const fetchSkinProfile = () => api.get<SkinProfile | null>("/profile");

export const saveSkinProfile = (input: Omit<SkinProfile, "updatedAt">) =>
  api.put<{ ok: boolean }>("/profile", input);
