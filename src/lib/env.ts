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
  /**
   * 헤드리스 Claude 실행 파일 경로. PATH 에 `claude` 가 있으면 기본값으로 충분하다.
   * Windows 실측: 사용자 홈의 `.local\bin\claude.exe` (진짜 .exe 라 셸 없이 실행된다).
   */
  get claudeBin(): string {
    return process.env.CLAUDE_BIN ?? "claude";
  },
  /**
   * 서버 MariaDB 접속 정보.
   *
   * ⚠️ **`NEXT_PUBLIC_` 을 붙이면 비밀번호가 브라우저 번들에 평문으로 들어간다.**
   * 이 getter 는 Route Handler 에서만 호출한다 — 클라이언트 컴포넌트에서 읽으면 값이 비어 있다.
   *
   * DB 는 인터넷에 열려 있지 않다. 로컬 개발은 SSH 터널을 먼저 열고 `DB_HOST=127.0.0.1`
   * 로 붙는다(자세한 건 `docs/ONBOARDING.md`).
   */
  get db(): {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  } {
    return {
      host: required(process.env.DB_HOST, "DB_HOST"),
      // 기본값을 두면 터널 포트를 안 적었을 때 조용히 3306(다른 DB)으로 붙는다. 명시를 요구한다.
      port: Number(required(process.env.DB_PORT, "DB_PORT")),
      database: required(process.env.DB_NAME, "DB_NAME"),
      user: required(process.env.DB_USER, "DB_USER"),
      password: required(process.env.DB_PASSWORD, "DB_PASSWORD"),
    };
  },
} as const;

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
