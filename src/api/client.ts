import { publicEnv } from "@/lib/env";

/**
 * 프로젝트 공용 HTTP 클라이언트.
 *
 * 도메인별 API 모듈(src/api/auth.ts, src/api/user.ts ...)에서 이 함수를 가져다 씁니다.
 *
 *   // src/api/user.ts
 *   import { api } from "./client";
 *   export const getMe = () => api.get<User>("/users/me");
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: unknown,
  ) {
    super(`API ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body" | "method"> & {
  /** 쿼리스트링. undefined/null 인 값은 자동으로 빠집니다. */
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = publicEnv.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { query, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    ...init,
    method,
    // 쿠키 기반 인증을 쓰는 경우 필요합니다. 토큰 방식이면 지워도 됩니다.
    credentials: init.credentials ?? "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : null,
  });

  // 204 No Content 등 본문이 없는 응답
  if (response.status === 204 || response.headers.get("content-length") === "0")
    return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
