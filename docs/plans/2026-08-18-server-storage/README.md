# 서버 저장소 이전 — MariaDB + 쿠키 익명 인증

> ⏳ **접속 정보 대기(2026-08-18)** — 사용자가 서버에 MariaDB를 올리는 중이다.
> **접속 정보 없이 진행 가능한 것**(스키마 설계, 쿼리 계층, 인증, 화면 데이터 계층)과
> **접속 정보가 있어야 하는 것**(실제 연결·마이그레이션 실행·엔드투엔드)을 아래 구현 순서에서 분리했다.
>
> 🔗 관련: [스캔 탭 디벨롭](../2026-08-18-scan-search/README.md) — 이 문서가 **선행**이다.
> 🔗 무효화: [스킨케어 코어 플로우](../2026-08-18-skincare-core/README.md)의 **Q1(localStorage)**

---

## 🚩 다음 세션 인계 (2026-08-18 작성)

**이 문서가 현재 활성 계획서다.** 아래 순서대로 읽고 이어받으면 된다.

### 1. 먼저 할 일 — litedeck MCP 도구 확인

세션 중에 `litedeck` MCP 를 등록했으나 **그 세션에서는 도구가 안 잡혔다**(세션 시작 시점에
도구 목록이 고정된다). 새 세션에서는 붙어 있을 것이다.

```
등록: claude mcp add --transport http litedeck http://127.0.0.1:54572/mcp --header "Authorization: Bearer ..."
스코프: local (C:\Users\xoduq\.claude.json, project: C:\Work\AL-front)
```

⚠️ **LiteDeck 은 DB 도구가 아니다.** SSH 기반 **서버 관리 GUI** 다(파일·서비스·프로세스·컨테이너·터미널).
조회 12개 + 변경 5개의 MCP 도구를 노출한다고 되어 있으나 **구체적 도구 이름은 미확인**이다
(웹페이지 요약만 봤다). 새 세션에서 실제 목록을 먼저 확인할 것.

→ 용도는 **DB 에 SQL 을 직접 쏘는 것이 아니라, 서버에 접속해 명령을 실행하는 통로**다.

### 2. 서버에서 확인할 것

- MariaDB 가 설치·기동 중인가, **버전이 10.2 이상인가**
  (`JSON` 타입과 `ON UPDATE CURRENT_TIMESTAMP` 가 필요하다 — 스키마가 둘 다 쓴다)
- 접속 정보: host / port / database / user / password
- `db/migrations/001_init.sql` 을 서버로 올려 적용
  → 적용 후 `SELECT * FROM schema_migrations` 로 `001` 이 찍혔는지 확인

### 3. 그다음 — Step 3 부터 이어서

접속 정보를 `.env.local` 에 넣고 구현 순서의 Step 3(쿼리 계층) → Step 4 → Step 5~7 로 간다.
**`.env` 는 읽어도 된다**(사용자 결정 — `AGENTS.md` 보안 절 참조). 단 커밋·출력·전재는 여전히 금지.

### 지금까지의 커밋

| 커밋        | 내용                                                              |
| ----------- | ----------------------------------------------------------------- |
| `674d254`   | `fix:` 러너 도구 제한(`--tools`) — **보안. 웹 도구 켜기 전 선행** |
| `f1a2b3d`   | `docs:` 계획서 2건 + `.env` 읽기 예외 규칙                        |
| `05a0d84`   | `feat:` MariaDB 초기 스키마 (Step 1)                              |
| _(이 커밋)_ | `feat:` 쿠키 익명 사용자 발급 (Step 2)                            |

### 이 작업에서 이미 확인한 함정 — 다시 밟지 말 것

1. **`middleware.ts` 는 Next 16 에서 deprecated.** `proxy.ts` 로 바뀌었고 export 이름도 `proxy` 다.
   Proxy 는 **Node.js 런타임이 기본**이고 `runtime` 설정을 넣으면 **에러가 난다.**
   → `node_modules/next/dist/docs/` 를 먼저 읽는 AGENTS.md 규칙이 실제로 값을 했다.
2. **`--allowedTools` 는 도구를 제한하지 않는다.** `--strict-mcp-config --tools` 를 써야 한다.
   `674d254` 에서 고쳤으니 **되돌리지 말 것.**
3. **`ANON_HEADER` 위조 방지는 `matcher` 에 달려 있다.** 경로를 빼면 그 경로에서 사칭이 가능하다.
4. **`uk_products_name_brand`** — MySQL/MariaDB 는 `NULL` 끼리를 중복으로 안 본다.
   브랜드 미상은 **빈 문자열**로 넣어야 유니크 키가 작동한다.
5. **React 19 린터가 effect 안 `setState` 를 막는다.** 서버 데이터로 갈아탈 때 같은 벽을 만난다
   (직전 작업에서 `useStored` 를 만들며 겪었다 — [skincare-core](../2026-08-18-skincare-core/README.md) 참조).

## Context

지금까지 모든 데이터는 **브라우저 localStorage**에 있었다([skincare-core Q1](../2026-08-18-skincare-core/README.md)).
백엔드 담당자를 기다리지 않고 전체 플로우를 돌리려는 결정이었고, 그 목적은 달성했다 — Step 0~9로
제품 등록 → 루틴 생성 → 수행 → 기록 → 달성률이 끝까지 이어진다.

**사용자 결정(2026-08-18): localStorage를 철회하고 서버 DB로 옮긴다.**

바꾸는 이유는 스캔 기능과 맞물린다. 웹 검색으로 찾은 제품을 **전체가 공유하는 카탈로그**에 쌓으면
40초짜리 검색이 쓸수록 줄어든다. localStorage로는 기기 밖으로 공유가 안 되므로 이 효과가 없다.

### 무엇이 무효가 되나

| 대상                                  | 영향                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/storage/*` 5파일             | 서버 API 호출로 교체                                                           |
| `useStored` + `local.ts` pub/sub      | **네트워크는 느리고 실패한다.** `ready` 2상태로는 부족 — 로딩·에러·재시도 필요 |
| 저장소를 읽는 화면 전부               | 홈·루틴·프로필·스캔 재작업                                                     |
| `Product.thumbnail` (base64 data URL) | localStorage 5MB 제약 때문에 256px로 줄였다. DB에서는 제약이 달라진다          |

⚠️ **가장 큰 리스크는 `ready` 플래그다.** 지금 화면들은 `ready === false`면 `null`을 렌더한다
(서버 렌더 단계 구분용). 네트워크가 끼면 이 자리가 **수백 ms~수 초**가 되므로,
그대로 두면 화면이 한동안 비어 보인다. 로딩 표시가 없는 게 아니라 **아예 아무것도 안 그린다.**

---

## 결정 확정 (2026-08-18)

| 항목                     | 확정                                                       |
| ------------------------ | ---------------------------------------------------------- |
| DB                       | **MariaDB** (사용자가 서버에 직접 올림)                    |
| 연결 위치                | **Next.js Route Handler가 직접.** Spring 백엔드 경유 안 함 |
| 사용자 식별              | **쿠키 익명 ID** (IP 기반은 철회 — 아래 근거)              |
| 기존 localStorage 데이터 | **첫 진입 시 서버로 이관** 후 비움                         |
| 제품 테이블              | **전체 공유 카탈로그**                                     |

### IP 기반을 쓰지 않는 이유 (사용자 결정, 2026-08-18)

원 요청은 "IP 기반 로그인"이었으나 아래 셋을 확인하고 쿠키로 변경했다.

| 상황                         | 결과                                                 |
| ---------------------------- | ---------------------------------------------------- |
| 카페·학교·회사 와이파이(NAT) | 여러 사람이 같은 IP → **남의 선반이 내 것으로 보임** |
| 모바일 데이터                | IP가 수시로 변경 → **데이터 유실**                   |
| 로컬 개발                    | 전부 `::1` → **전원이 한 계정**                      |

심사 자리에서 여러 명이 같은 와이파이를 쓰면 데이터가 섞이는 게 바로 드러난다.
쿠키 익명 ID는 **로그인 화면이 없다는 요구(원 의도)를 그대로 지키면서** 셋을 모두 없앤다.

---

### 추가 확정 (2026-08-18) — Q1~Q4 답변

| 질문                | 확정                                               |
| ------------------- | -------------------------------------------------- |
| Q1 쿼리 계층        | **`mysql2` + 생 SQL.** ORM 없음                    |
| Q2 클라이언트 계층  | **SWR 추가**(약 4KB). `useStored` 대체             |
| Q3 스키마 관리      | **번호 붙인 마이그레이션 파일** + 실행 기록 테이블 |
| Q4 `.env` 읽기 범위 | **전면 허용** — 세션이 `.env` 를 제한 없이 읽는다  |

> ⚠️ **Q4 리스크(고지 후 사용자 결정)** — `.env` 에는 곧 DB 비밀번호가 들어간다.
> 전면 허용이므로 **자격 증명이 세션 컨텍스트와 대화 기록에 남을 수 있다.**
> 사용자가 이를 알고 선택했다(2026-08-18). 좁히려면 `AGENTS.md` 의 해당 항목 한 줄만 고치면 된다.

---

## 검토했던 옵션 (기록)

### Q1. 쿼리 계층 — 생 SQL인가 ORM인가

- **옵션 A: `mysql2` + 얇은 쿼리 헬퍼 + `schema.sql` 한 장**
  - 장점: 빌드 단계·코드젠이 없다. 테이블 6개 규모에 도구가 필요 없다.
    이 레포는 이미 AI 응답을 `unknown` → 좁히기로 다루므로 **행 좁히기도 같은 패턴**으로 간다.
  - 단점: 타입을 손으로 선언한다. 스키마 변경 추적을 파일 규칙으로 지켜야 한다.
- **옵션 B: Drizzle ORM**
  - 장점: 스키마에서 타입이 나오고 마이그레이션 도구가 딸려 온다.
  - 단점: 의존성·설정·생성 파일이 늘고, 이 규모에서 얻는 게 적다.
- **추천: A.** 테이블 6개에 ORM은 과하다. 스키마가 커지면 그때 B로 옮겨도 늦지 않다.

### Q2. 클라이언트 데이터 계층 — 무엇으로 가져오나

`useStored`(동기·즉시)를 대체해야 한다. **네트워크는 실패하고 느리다.**

- **옵션 A: 직접 `fetch` + 상태 훅 하나 (`useResource`)**
  - 장점: 새 의존성 0. `src/api/client.ts`(이미 있는 `ApiError` 래퍼)를 그대로 쓴다.
  - 단점: 캐시·재검증·중복 요청 제거를 직접 짜야 한다. 화면이 늘면 부담이 커진다.
- **옵션 B: SWR 추가** (약 4KB)
  - 장점: 캐시·포커스 재검증·중복 제거가 공짜다. 여러 화면이 같은 목록을 볼 때 특히 이득
    (홈·루틴·프로필이 전부 루틴/기록을 읽는다 — **실제로 그렇다**).
  - 단점: 의존성이 하나 는다.
- **추천: B.** 지금 구조가 이미 "같은 데이터를 여러 화면이 읽는" 모양이라 A로 가면
  `useResource`가 결국 SWR을 어설프게 재구현하게 된다. 다만 **의존성 추가는 사용자 합의 사항**이라 여쭙는다.

### Q3. 스키마 변경을 어떻게 관리하나

- **옵션 A: `db/schema.sql` 한 장 + 손으로 실행** — 해커톤 기간에는 이게 가장 빠르다.
- **옵션 B: 번호 붙은 마이그레이션 파일** (`001_init.sql`, `002_add_x.sql`) + 실행 기록 테이블
  - 스키마가 바뀔 때 서버에 이미 있는 데이터를 안 깨뜨린다.
- **추천: B**, 단 도구 없이 파일 규칙만. 데모 중에 컬럼 하나 추가하려고 테이블을 드롭하면
  그 자리에서 데이터가 날아간다.

---

## 스키마 초안

MariaDB. 문자셋은 `utf8mb4`(한글·이모지), 정렬은 `utf8mb4_unicode_ci`.

```sql
-- 쿠키 익명 ID. 로그인 화면이 없으므로 비밀번호 컬럼도 없다.
CREATE TABLE users (
  id          CHAR(36)     NOT NULL PRIMARY KEY,   -- crypto.randomUUID()
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ⭐ 전체 공유 카탈로그. 누가 검색했든 모두가 즉시 쓴다(사용자 결정).
CREATE TABLE products (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  brand        VARCHAR(120) NULL,
  category     VARCHAR(60)  NOT NULL,
  ingredients  JSON         NOT NULL,              -- string[]
  warnings     JSON         NULL,                  -- string[] (지연 생성)
  -- 성분을 어디서 얻었는지. 화면에 표시해야 한다(폴백은 구버전일 수 있음).
  ingredient_source ENUM('photo','hwahae','fallback','manual') NOT NULL,
  source_url   VARCHAR(500) NULL,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 같은 제품이 중복으로 쌓이는 것을 막는다. 이름+브랜드를 키로 본다.
  UNIQUE KEY uk_products_name_brand (name, brand)
);

-- 내 선반 (사용자 ↔ 제품)
CREATE TABLE shelf_items (
  id          CHAR(36)  NOT NULL PRIMARY KEY,
  user_id     CHAR(36)  NOT NULL,
  product_id  CHAR(36)  NOT NULL,
  thumbnail   MEDIUMTEXT NULL,                     -- 256px JPEG data URL
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_shelf_user_product (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE skin_profiles (
  user_id          CHAR(36)     NOT NULL PRIMARY KEY,
  wonder           TEXT         NOT NULL,
  usable_morning   VARCHAR(30)  NOT NULL,
  usable_evening   VARCHAR(30)  NOT NULL,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE routines (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  `condition` VARCHAR(60)  NOT NULL,               -- 예약어라 백틱 필요
  time_slot   ENUM('am','pm') NOT NULL,
  summary     VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_routines_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE routine_steps (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  routine_id     CHAR(36)     NOT NULL,
  seq            SMALLINT     NOT NULL,            -- 표시 순서
  routine_name   VARCHAR(100) NOT NULL,
  estimated_time INT          NOT NULL,            -- ⚠️ 초 단위. 분 아니다
  using_product  JSON         NOT NULL,            -- string[] — 제품 id 가 아니라 이름
  how_to_use     JSON         NOT NULL,
  tips           JSON         NOT NULL,
  warning        JSON         NOT NULL,            -- 단수형 키에 배열(프롬프트 명세 그대로)
  UNIQUE KEY uk_step_routine_seq (routine_id, seq),
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
);

CREATE TABLE routine_runs (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  routine_id         CHAR(36) NOT NULL,
  started_at         DATETIME NOT NULL,
  finished_at        DATETIME NOT NULL,
  completed_step_ids JSON     NOT NULL,
  KEY idx_runs_user_finished (user_id, finished_at),   -- 주간 달성률 조회용
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**설계 메모**

- `routine_runs.routine_id`에 **FK를 걸지 않았다.** 루틴을 다시 만들면 옛 기록이 고아가 되는데,
  기록은 남아야 한다(프로필이 "삭제된 루틴"으로 표시하는 현재 동작과 일치).
- `products.ingredient_source`는 **화면 표시용 필수 값**이다. 폴백 출처가 구버전 성분표를 주는 것을
  실측했으므로([scan-search 실측](../2026-08-18-scan-search/README.md)) 사용자가 출처를 알아야 한다.
- `thumbnail`을 `products`가 아니라 `shelf_items`에 둔 이유: 사용자가 **자기 제품 사진**을 찍은
  것이라 공유 카탈로그에 넣으면 안 된다.
- `estimated_time`이 초 단위라는 것을 컬럼 주석에 남긴다 — 옛 시드가 분·초를 이원화해 실제로 혼동을 만들었다.

---

## 변경 대상 파일

### 신규

| 파일 경로                                     | 작업 요약                                          |
| --------------------------------------------- | -------------------------------------------------- |
| `db/migrations/001_init.sql`                  | 위 스키마                                          |
| `src/lib/db/pool.ts`                          | `mysql2/promise` 커넥션 풀. **서버 전용**          |
| `src/lib/db/rows.ts`                          | 행 → 도메인 타입 좁히기(`as` 금지, `unknown` 기반) |
| `src/lib/auth/anonUser.ts`                    | 쿠키 익명 ID 발급·조회                             |
| `middleware.ts`                               | 쿠키가 없으면 발급 (HttpOnly·SameSite=Lax·Secure)  |
| `src/app/api/products/route.ts`               | 선반 목록·추가                                     |
| `src/app/api/routines/route.ts`               | 루틴 조회·저장                                     |
| `src/app/api/runs/route.ts`                   | 수행 기록                                          |
| `src/app/api/profile/route.ts`                | 피부 프로필                                        |
| `src/app/api/migrate/route.ts`                | localStorage 데이터 1회 이관                       |
| `src/api/{products,routines,runs,profile}.ts` | 클라이언트 래퍼                                    |

### 수정

| 파일 경로                      | 작업 요약                                           |
| ------------------------------ | --------------------------------------------------- |
| `src/lib/storage/*` (5파일)    | **삭제** — 이관 코드에서만 한시적으로 사용 후 제거  |
| `src/lib/storage/useStored.ts` | 서버 조회 훅으로 교체(Q2 확정 후)                   |
| 홈·루틴·프로필·스캔 화면       | `ready` 2상태 → 로딩·에러·재시도                    |
| `src/lib/env.ts`               | `serverEnv`에 DB 접속 정보. **`NEXT_PUBLIC_` 금지** |
| `.env.example`                 | DB 키 자리표시자                                    |
| `AGENTS.md`                    | 저장소 설명 갱신 + **`.env` 읽기 예외 규칙**(아래)  |

### AGENTS.md 보안 규칙 개정 (Q4 = 전면 허용)

기존 규칙은 _".env 등 실제 값이 든 파일은 읽지도 커밋하지도 말 것"_ 이었다.
**사용자 결정(2026-08-18)으로 읽기는 전면 허용한다** — 프롬프트를 env 에 두면서
계약 검증이 막히는 것을 풀기 위함이다.

바뀌는 것과 바뀌지 않는 것을 규칙에 명확히 쓴다:

- ✅ **읽기 허용** — `.env`·`.env.local` 등을 세션이 읽을 수 있다.
- ⛔ **커밋 금지는 그대로** — `.env.example`(값 없는 템플릿)만 커밋 대상이다.
- ⛔ **출력 금지는 그대로** — 읽은 값을 화면에 `echo`/`cat` 하거나 커밋 메시지·문서에 옮기지 않는다.
  읽는 것과 퍼뜨리는 것은 다르다.
- ⛔ **외부 전송 금지는 그대로** — `curl`·`wget` 인자에 넣지 않는다.
- ⚠️ 자격 증명이 세션 컨텍스트에 들어올 수 있음을 사용자가 인지하고 선택했다.

---

## 구현 순서

### 접속 정보 없이 가능 (지금 착수)

- [x] **Step 1 — 스키마 확정** — 완료 2026-08-18. 커밋 `05a0d84`.
      `db/migrations/001_init.sql` 133줄, 테이블 7개(`schema_migrations` 포함).
      **아직 서버에 적용하지 않았다** — DB 가 없다. 판단이 갈린 4가지(FK 미설정, thumbnail 위치,
      NULL 유니크 함정, `ingredient_source` NOT NULL)는 SQL 주석에 근거를 남겼다.
- [x] **Step 2 — 쿠키 익명 인증** — 완료 2026-08-18. 커밋은 이 문서 상단 인계 표 참조.
      `src/proxy.ts` + `src/lib/auth/anonUser.ts` (2파일 +124).
      ⚠️ 계획 초안은 `middleware.ts` 였으나 **Next 16 에서 deprecated → `proxy.ts`** 다.
      **브라우저 실측**: 1차 요청에 `al_uid` 발급(HttpOnly · SameSite=lax · Max-Age 1년),
      2차 요청에 쿠키를 동봉하면 `Set-Cookie` 없음 = 재발급 안 함.
      `Secure=false` 는 로컬 http 라 정상이다(켜면 쿠키가 아예 저장되지 않는다).
      **교훈**: 쿠키만 세팅하면 **그 요청**의 핸들러는 값을 못 본다 → 같은 요청에 헤더로 함께 실었다.
- [ ] **Step 3 — 쿼리 계층 골격** `pool.ts`·`rows.ts` + Route Handler 4종.
      _접속 정보가 없으면 연결 에러가 나는 게 정상이다. 타입·구조를 먼저 맞춘다._
- [ ] **Step 4 — 클라이언트 데이터 계층** (Q2 확정 후). 화면의 `ready` → 로딩·에러 확장.

### 접속 정보 필요

- [ ] **Step 5 — 실제 연결 + 마이그레이션 실행.** 여기서 처음으로 엔드투엔드가 돈다.
- [ ] **Step 6 — localStorage 이관** `/api/migrate` 연결, 성공 후 로컬 비움.
- [ ] **Step 7 — `src/lib/storage/*` 제거** 및 잔여 참조 정리.

⚠️ **Step 4까지는 앱이 깨진 상태로 둘 수 없다.** 화면 전환(Step 4)은 서버가 응답하기 전까지
기존 localStorage 경로를 유지하다가 Step 5에서 한 번에 스위치하는 편이 안전하다.

---

## 검증

- `npm run check` · `npm run build` 통과 — **신규 라우트 5개** 이상이라 `next typegen` 선행 필수
- **서버 전용 격리** — `src/lib/db/*`·`middleware.ts`·`serverEnv`가 클라이언트로 import되지 않았는지 grep.
  빌드 후 `.next/static`에서 **DB 호스트·비밀번호가 검색되지 않아야** 한다
- **`as` 캐스팅 0건** — 행 좁히기는 `unknown` 기반. AI 응답과 같은 규율
- **쿠키** — HttpOnly(JS로 못 읽음)·SameSite·만료. 브라우저에서 `document.cookie`에 안 보이는지 실측
- **네트워크 실패 경로** — DB를 끄고 전 화면 진입. **에러 문구가 보여야 하고 빈 화면이면 실패**
- **동시성** — 같은 제품을 두 사용자가 동시에 검색했을 때 `uk_products_name_brand`로
  중복이 안 생기는지(`INSERT ... ON DUPLICATE KEY UPDATE`)
- **이관 멱등성** — 이관을 두 번 눌러도 제품이 두 배가 되지 않는지
- 수동 확인: 쿠키를 지운 뒤 진입 → 새 사용자로 시작되는지 / 다른 브라우저에서 같은 제품이 검색되는지

---

## 비범위 (Out of Scope)

- **진짜 로그인(이메일·소셜)** — 원 기획에서 명시적으로 `X`. 쿠키 익명 ID로 충분하다.
- **기기 간 계정 이어붙이기** — 쿠키를 지우면 다른 사용자가 된다. 복구 수단은 로그인이 있어야 성립한다.
- **제품 카탈로그 관리자 화면** — 잘못 들어간 제품을 고치는 UI. 필요해지면 그때.
- **Spring 백엔드 연동** — 사용자 결정(2026-08-18)으로 Next가 직접 붙는다.
  `next.config.ts`의 `rewrites`는 그대로 두되 이번 범위에서 쓰지 않는다.
