"use client";

import { useMemo, useSyncExternalStore } from "react";

import { loadRaw, subscribe } from "./local";

/**
 * localStorage 를 읽는 클라이언트 훅.
 *
 * effect 안에서 `setState` 로 끌어오면 cascading render 가 생기고(React 19 린터가 막는다)
 * 서버 렌더와 하이드레이션도 어긋난다. `useSyncExternalStore` 가 이 용도의 정답이다.
 *
 * ⚠️ **`ready` 를 반드시 확인하라.** 서버 렌더 단계에서는 값을 알 수 없는데, 이를
 * "저장된 게 없음"과 같이 다루면 빈 상태가 한 번 깜빡였다가 사라진다.
 *
 * ⚠️ `fallback` 은 **모듈 상수로 넘겨라.** 인라인 `[]` 를 주면 매 렌더 새 배열이라
 * `useMemo` 가 무의미해진다.
 */
export function useStored<T>(
  key: string,
  fallback: T,
): { ready: boolean; value: T } {
  const raw = useSyncExternalStore(subscribe, () => loadRaw(key), server);

  return useMemo(() => {
    // 서버 스냅샷 — 아직 모른다.
    if (raw === undefined) return { ready: false, value: fallback };
    // 키가 없다 — 저장된 적이 없는 정상 상태다.
    if (raw === null) return { ready: true, value: fallback };

    try {
      return { ready: true, value: JSON.parse(raw) as T };
    } catch {
      // 값 하나가 손상됐다고 화면이 죽지 않게 폴백한다(local.ts 의 load 와 같은 정책).
      return { ready: true, value: fallback };
    }
  }, [raw, fallback]);
}

const server = () => undefined;
