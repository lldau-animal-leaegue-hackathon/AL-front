/**
 * localStorage 공통 래퍼.
 *
 * 왜 직접 쓰지 않는가:
 *  - **SSR 안전**: 모듈 최상단이나 서버 컴포넌트에서 `localStorage` 를 만지면
 *    `ReferenceError` 가 난다. 여기서 매번 존재 여부를 확인한다.
 *    (호출부는 `useEffect` 나 이벤트 핸들러여야 한다.)
 *  - **스키마 버전**: 모델이 바뀌어도 옛 값이 폭발하지 않게 키에 버전을 붙인다.
 *  - **용량 한계**: 5~10MB 를 넘기면 `QuotaExceededError` 가 난다. 제품 썸네일이
 *    쌓이면 실제로 닿는다(Q7). 그래서 `save` 는 성공 여부를 **반환**한다 —
 *    호출부가 사용자에게 알릴 수 있어야 한다.
 */

/** 모델이 바뀌면 올린다. 옛 키는 그대로 남지만 읽히지 않는다. */
const VERSION = "v1";

/*
 * 변경 알림 — `useSyncExternalStore` 의 구독원이다.
 *
 * 없으면 저장 직후 화면이 갱신되지 않아, 컴포넌트가 결과를 로컬 state 로 미러링하게 된다.
 * 그 미러링이 곧 "effect 안에서 setState" 이고 React 19 린터가 막는 패턴이다.
 * 저장소가 스스로 알리게 하면 화면은 **저장소를 단일 출처로** 두고 파생만 하면 된다.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function storageKey(key: string): string {
  return `al:${VERSION}:${key}`;
}

/** 브라우저이고 localStorage 를 쓸 수 있는가 (사파리 프라이빗 모드 등에서 막힌다) */
function available(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * 저장된 값을 읽는다. 없거나 깨졌으면 `fallback` 을 준다.
 * 값 하나가 손상됐다고 화면 전체가 죽지 않게 조용히 폴백한다.
 */
export function load<T>(key: string, fallback: T): T {
  if (!available()) return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 파싱하지 않은 원시 문자열. 키가 없으면 `null`.
 *
 * `useSyncExternalStore` 전용이다. 그쪽 `getSnapshot` 은 **값이 안 바뀌면 같은 참조**를
 * 돌려줘야 하는데, `load()` 는 매번 `JSON.parse` 로 새 객체를 만들어 무한 렌더가 난다.
 * 문자열은 `Object.is` 로 값 비교가 되므로 안전하다 — 파싱은 호출부가 `useMemo` 로 한다.
 */
export function loadRaw(key: string): string | null {
  if (!available()) return null;

  try {
    return window.localStorage.getItem(storageKey(key));
  } catch {
    return null;
  }
}

/**
 * 값을 저장한다. **성공 여부를 반환한다** — false 면 대개 용량 초과다.
 * 호출부는 이 값을 무시하지 말고 사용자에게 알릴 것.
 */
export function save(key: string, value: unknown): boolean {
  if (!available()) return false;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
    notify();
    return true;
  } catch (error: unknown) {
    // QuotaExceededError 가 대부분이다(썸네일 누적). 원인을 삼키지 않고 남긴다.
    console.warn(`[storage] "${key}" 저장 실패:`, error);
    return false;
  }
}

/** 키를 지운다. 없어도 성공으로 본다. */
export function remove(key: string): boolean {
  if (!available()) return false;

  try {
    window.localStorage.removeItem(storageKey(key));
    notify();
    return true;
  } catch (error: unknown) {
    console.warn(`[storage] "${key}" 삭제 실패:`, error);
    return false;
  }
}

/**
 * 새 레코드 id.
 * `crypto.randomUUID` 는 보안 컨텍스트(HTTPS·localhost)에서만 있으므로
 * 없을 때를 대비해 시각 기반으로 폴백한다 — 로컬 저장용이라 충돌 위험이 낮으면 충분하다.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
