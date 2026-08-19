"use client";

/**
 * 서버 데이터 계층 — `useStored`(localStorage)를 대체한다.
 *
 * **반환 모양을 `useStored` 와 맞췄다**(`{ ready, value }`). 화면의 `if (!ready) return null`
 * 이 그대로 동작하게 두고, 거기에 `error`·`retry` 를 더한 것이다.
 *
 * ⚠️ **`ready` 는 "로딩이 끝났다"이지 "성공했다"가 아니다.** 실패해도 `ready` 는 true 가 되고
 * `value` 는 폴백이다. `error` 를 확인하지 않으면 **네트워크 실패가 "데이터 없음"으로 위장된다.**
 * 화면은 `<DataState>` 로 로딩·에러를 먼저 처리한다.
 *
 * 쓰기 함수는 성공 후 관련 키를 `mutate` 한다 — localStorage 시절의 pub/sub 자동 갱신을
 * 서버에서도 유지하기 위함이다. 안 하면 저장해도 화면이 그대로다.
 */

import useSWR, { mutate, type SWRConfiguration } from "swr";

import {
  createProduct,
  fetchPopularProducts,
  fetchProducts,
  removeProduct as removeProductRequest,
  updateProductWarnings,
  type IngredientSource,
} from "@/api/products";
import { fetchSkinProfile, saveSkinProfile } from "@/api/profile";
import {
  clearRoutines as clearRoutinesRequest,
  fetchRoutines,
  saveRoutines as saveRoutinesRequest,
  type RoutineInput,
} from "@/api/routines";
import { createRun, fetchRuns } from "@/api/runs";
import type {
  Product,
  Routine,
  RoutineRun,
  SkinProfile,
} from "@/types/skincare";

/** SWR 캐시 키. 쓰기 후 무엇을 다시 불러올지 정하는 기준이라 한 곳에 모은다. */
const KEYS = {
  products: "/products",
  popular: "/products/popular",
  routines: "/routines",
  runs: "/runs",
  profile: "/profile",
} as const;

/**
 * DB 가 죽었거나 SSH 터널이 안 열려 있으면 503 이 **계속** 난다.
 * 기본값(무한 재시도)이면 콘솔이 에러로 뒤덮이므로 몇 번만 시도하고 화면에 넘긴다.
 */
const SWR_OPTIONS: SWRConfiguration = { errorRetryCount: 3 };

export type Resource<T> = {
  /** 첫 로딩이 끝났는가. **성공 여부가 아니다** — `error` 를 따로 봐야 한다. */
  ready: boolean;
  value: T;
  error: boolean;
  retry: () => void;
};

function useResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T,
): Resource<T> {
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<T>(key, fetcher, SWR_OPTIONS);

  return {
    ready: data !== undefined || error !== undefined,
    value: data ?? fallback,
    error: error !== undefined,
    retry: () => void revalidate(),
  };
}

/**
 * 폴백은 **모듈 상수**로 둔다. 인라인 `[]` 를 넘기면 매 렌더 새 배열이라
 * 이 값을 의존성에 쓰는 `useMemo` 가 전부 무의미해진다(useStored 때와 같은 함정).
 */
const NO_PRODUCTS: Product[] = [];
const NO_ROUTINES: Routine[] = [];
const NO_RUNS: RoutineRun[] = [];

export const useProducts = () =>
  useResource(KEYS.products, fetchProducts, NO_PRODUCTS);

/**
 * 많이 담긴 순 공유 카탈로그. **빈 배열이 정상이다**(아무도 아직 담지 않은 상태).
 * 화면은 그때 시드 카탈로그로 폴백한다.
 */
export const usePopularProducts = () =>
  useResource(KEYS.popular, fetchPopularProducts, NO_PRODUCTS);

export const useRoutines = () =>
  useResource(KEYS.routines, fetchRoutines, NO_ROUTINES);

export const useRuns = () => useResource(KEYS.runs, fetchRuns, NO_RUNS);

export const useSkinProfile = () =>
  useResource<SkinProfile | null>(KEYS.profile, fetchSkinProfile, null);

// ── 쓰기 ────────────────────────────────────────────────────────────
// 실패하면 예외가 그대로 올라간다. 화면이 "저장하지 못했어요"를 보여줘야 하므로
// 여기서 삼키지 않는다(localStorage 시절 `null` 반환과 같은 취지다).

export async function addProduct(input: {
  productName: string;
  productCompany?: string;
  category: string;
  ingredients: string[];
  /** 직접 찍은 사진(256px data URL) */
  thumbnail?: string;
  /** 검색 결과 이미지 주소. 서버가 받아서 저장한다(직접 찍은 사진이 우선). */
  thumbnailUrl?: string;
  ingredientSource?: IngredientSource;
}): Promise<Product> {
  const created = await createProduct(input);
  await mutate(KEYS.products);
  return created;
}

export async function setProductWarnings(input: {
  id: string;
  warnings: string[];
}): Promise<void> {
  await updateProductWarnings(input);
  await mutate(KEYS.products);
}

export async function removeProduct(input: { id: string }): Promise<void> {
  await removeProductRequest(input);
  await mutate(KEYS.products);
}

export async function saveRoutines(routines: RoutineInput[]): Promise<void> {
  await saveRoutinesRequest({ routines });
  await mutate(KEYS.routines);
}

export async function clearRoutines(): Promise<void> {
  await clearRoutinesRequest();
  await mutate(KEYS.routines);
}

export async function appendRun(
  input: Omit<RoutineRun, "id">,
): Promise<RoutineRun> {
  const created = await createRun(input);
  await mutate(KEYS.runs);
  return created;
}

export async function saveProfile(
  input: Omit<SkinProfile, "updatedAt">,
): Promise<void> {
  await saveSkinProfile(input);
  await mutate(KEYS.profile);
}
