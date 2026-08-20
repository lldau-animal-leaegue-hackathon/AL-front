/**
 * 쿠키 기반 익명 사용자 — **서버 전용**.
 *
 * 로그인 화면이 없다는 요구는 그대로 두고, 첫 방문에 익명 ID 를 발급해 그걸로 사용자를 가른다.
 * 발급은 `src/proxy.ts` 가 하고 여기서는 읽기만 한다.
 *
 * ⚠️ **IP 를 쓰지 않은 이유**(사용자 결정 2026-08-18):
 *  - 카페·학교 와이파이(NAT) → 여러 사람이 같은 IP → 남의 선반이 내 것으로 보인다
 *  - 모바일 데이터 → IP 가 수시로 바뀌어 데이터가 유실된다
 *  - 로컬 개발 → 전부 `::1` 이라 전원이 한 계정이 된다
 */

import { headers } from "next/headers";

/** 브라우저에 저장되는 쿠키 이름. `HttpOnly` 라 JS 로는 못 읽는다. */
export const ANON_COOKIE = "al_uid";

/**
 * proxy 가 사용자 ID 를 실어 보내는 요청 헤더.
 *
 * 쿠키만 세팅하면 **그 요청**의 Route Handler 는 못 본다(브라우저가 다음 요청부터 보낸다).
 * 첫 방문에도 바로 동작해야 하므로 헤더로 같이 넘긴다.
 *
 * ⚠️ **위조 방지는 proxy 의 `headers.set()` 이 담당한다** — 클라이언트가 이 헤더를 직접 보내도
 * proxy 가 덮어쓴다. 따라서 **proxy 의 `matcher` 가 이 값을 읽는 모든 경로를 덮어야 한다.**
 * 어떤 경로를 matcher 에서 빼면 그 경로는 클라이언트가 남의 ID 를 보내 사칭할 수 있다.
 */
export const ANON_HEADER = "x-al-uid";

/**
 * 현재 요청의 익명 사용자 ID.
 *
 * proxy 가 항상 채우므로 없으면 **설정 오류**다(matcher 가 이 경로를 안 덮고 있다).
 * 조용히 빈 값으로 진행하면 모든 사용자가 한 계정으로 합쳐지므로 명확히 실패시킨다.
 */
export async function currentUserId(): Promise<string> {
  const id = (await headers()).get(ANON_HEADER);

  if (!id) {
    throw new Error(
      `[auth] ${ANON_HEADER} 가 없습니다. src/proxy.ts 의 matcher 가 이 경로를 덮는지 확인하세요.`,
    );
  }

  return id;
}

/**
 * `users` 행이 아직 없을 수 있다.
 *
 * proxy 는 요청마다 도는데 거기서 DB 를 건드리면 **모든 요청에 왕복이 하나 붙는다**
 * (정적 자산 요청까지). 그래서 행 생성은 **실제로 쓰기가 일어나는 Route Handler 가
 * `INSERT ... ON DUPLICATE KEY UPDATE` 로 지연 수행**한다.
 *
 * 이 함수는 그 쿼리를 쓸 자리를 표시해 둔 것이다 — DB 접속 정보가 오면 `src/lib/db/` 로 옮긴다.
 */
export const ENSURE_USER_SQL = `
  INSERT INTO users (id) VALUES (?)
  ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
`;
