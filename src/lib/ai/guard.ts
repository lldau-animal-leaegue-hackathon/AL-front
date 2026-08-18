/**
 * AI 호출 동시 실행 가드 — **서버 전용, 메모리 기반**.
 *
 * `/api/ai/*` 는 호출 1건마다 `claude -p` 자식 프로세스를 띄운다(루틴 생성 약 90초).
 * 사용자의 Claude 구독 한도에서 차감되므로, 같은 사용자가 탭을 여러 개 열거나 버튼을
 * 연타하면 그만큼 실제 비용이 나간다. 그래서 **쿠키 사용자당 동시 1건**만 허용한다
 * (사용자 결정 2026-08-18 — 쿨다운·rate limit 은 넣지 않는다: 심사 자리에서 여러 명이
 * 번갈아 시연할 때 정상 사용까지 막힌다).
 *
 * dev 의 HMR 은 이 모듈을 다시 평가한다. Set 을 모듈 스코프에 두면 파일을 고칠 때마다
 * 새 Set 이 생겨 표시가 초기화된다 — `src/lib/db/pool.ts` 가 커넥션 풀을 붙이는 것과
 * 같은 이유로 `globalThis` 에 둔다.
 *
 * ⚠️ 한계(둘 다 지금 배포 형태에서는 실제로 발동하지 않는다):
 *  - **프로세스가 여러 개면(스케일아웃) 각자 따로 센다.** 이 Set 은 프로세스 로컬이라
 *    인스턴스 A 가 1건 실행 중이어도 인스턴스 B 는 모른다. 진짜 동시성 제어는 DB/Redis 같은
 *    공유 저장소가 필요하다 — 지금은 단일 프로세스(로컬/단일 서버 심사)라 충분하다.
 *  - **쿠키를 지우면 우회된다.** `x-al-uid` 가 바뀌면 새 사용자로 취급한다. 완전한 남용
 *    방지가 아니라 "정상 사용 중 실수(연타·중복 탭)"를 막는 수준의 장치다.
 */

const globalForGuard = globalThis as typeof globalThis & {
  __alAiInFlight?: Set<string>;
};

function inFlightSet(): Set<string> {
  globalForGuard.__alAiInFlight ??= new Set();
  return globalForGuard.__alAiInFlight;
}

/** 이미 실행 중이면 false, 아니면 실행 중으로 표시하고 true. */
export function acquire(userId: string): boolean {
  const inFlight = inFlightSet();
  if (inFlight.has(userId)) return false;
  inFlight.add(userId);
  return true;
}

/** 실행 종료 표시. `acquire` 가 true 를 반환했을 때만 호출한다(핸들러의 `finally`). */
export function release(userId: string): void {
  inFlightSet().delete(userId);
}
