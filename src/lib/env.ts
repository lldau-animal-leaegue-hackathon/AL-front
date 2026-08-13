/**
 * 환경변수를 한 곳에서 읽고 검증합니다.
 *
 * 왜 필요한가:
 *  - process.env.XXX 를 여기저기서 직접 읽으면 오타를 잡을 수 없고, 값이 없을 때
 *    `undefined` 가 조용히 흘러다니다 런타임에서 터집니다.
 *  - 여기서 한 번 검증해두면 잘못된 설정을 앱 시작 시점에 바로 알 수 있습니다.
 *
 * 주의: NEXT_PUBLIC_ 접두사가 붙은 값은 브라우저 번들에 그대로 들어갑니다.
 *       또한 Next.js 는 빌드 타임에 `process.env.NEXT_PUBLIC_XXX` 를 문자열로
 *       치환하므로, 반드시 아래처럼 "전체 이름을 그대로" 적어야 합니다.
 *       (process.env[key] 같은 동적 접근은 클라이언트에서 동작하지 않습니다.)
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.example 을 참고해 .env.local 에 추가하세요.`,
    );
  }
  return value;
}

/** 브라우저에서도 접근 가능한 값 */
export const publicEnv = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
} as const;

/**
 * 서버에서만 접근 가능한 값.
 * 클라이언트 컴포넌트에서 import 하면 값이 비어 있으니 주의하세요.
 */
export const serverEnv = {
  get backendOrigin(): string {
    return required(process.env.BACKEND_ORIGIN, "BACKEND_ORIGIN");
  },
  /** 네이버 검색 API 자격 증명. 라우트 핸들러에서만 읽는다. */
  get naverClientId(): string {
    return required(process.env.NAVER_CLIENT_ID, "NAVER_CLIENT_ID");
  },
  get naverClientSecret(): string {
    return required(process.env.NAVER_CLIENT_SECRET, "NAVER_CLIENT_SECRET");
  },
} as const;

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
