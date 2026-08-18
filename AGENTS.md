<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

이 저장소에서 AI 에이전트(Claude Code 등)가 작업할 때 따를 지침이다.
`CLAUDE.md`는 이 파일을 `@AGENTS.md`로 import하므로 **규칙은 이 파일 한 곳에만** 쓴다.

> ⚠️ 위 `nextjs-agent-rules` 블록은 `next dev`가 자동으로 다시 써넣는다. 지우지 말고 그대로 커밋한다.
> 끄고 싶으면 `next.config.ts`에 `agentRules: false`.

## 프로젝트

- **이름**: al-front (Animal League 프론트엔드)
- **스택**: Next.js 16 App Router, React 19, TypeScript 5.9, **CSS Modules** (Tailwind 미사용)
- **Node**: 24 LTS 권장 (`engines`는 Next 최소값인 `>=20.9.0`). **Node 20은 2026-04-30 EOL**
- **로컬 경로**: 프론트 `C:\Work\AL-front` · 백엔드 `C:\Work\animal-league-04-back` (Spring Boot)
- **원격**: `github.com/lldau-animal-leaegue-hackathon/AL-front`
- **도메인**(2026-08-18 확정 — `presentation/SERVICE.md`·`docs/plans/2026-08-18-skincare-core/` 기준):
  **스킨케어 루틴 앱.** 제품 등록(성분표 사진 → AI 성분 추출) · AI 루틴 생성(피부 고민 + 가용 시간 +
  보유 제품) · 루틴 수행(단계별 안내·타이머) · 수행 기록. 저장은 localStorage,
  AI는 헤드리스 Claude(`claude -p`)를 Route Handler가 감싼다.
  — _구 설명(점수/상점/채팅)은 `animal-league-04-back` 구조에서 유추한 오류였다.
  그 백엔드는 이 앱과 무관하다(실측 지식은 `ai-contract-check` 스킬 부록에 보존)._

## 명령어

```bash
npm ci               # 의존성 설치 (package-lock 기준)
npm run dev          # 개발 서버 http://localhost:3000 (Turbopack)
npm run check        # 타입 + 린트 + 포맷 일괄 검사  ← 커밋 전 필수
npm run build        # 프로덕션 빌드
npm run lint:fix     # ESLint 자동 수정
npm run format       # Prettier 자동 정렬
```

- **`npm run check` / `npm run build` / `npm run lint`는 직접 실행해도 된다.**
  이 레포에는 테스트 러너가 없으므로 **이 명령들이 사실상의 테스트 스위트**다.
  (jikjikjik 레포는 이들을 deny하지만, 여기서는 검증 수단이 이것뿐이라 정반대로 허용한다.)
- **`npm run dev`는 백그라운드로만 실행**하고, 이미 떠 있으면 다시 띄우지 않는다.
  포그라운드로 띄우면 세션이 멈춘다. 확인이 끝나면 반드시 종료한다.
- **테스트 러너 없음.** 테스트 파일을 새로 만들거나 찾으려 시도하지 말 것.
  (도입한다면 Vitest + Testing Library를 먼저 사용자와 합의한다.)
- Turbopack 관련 문제가 나면 `npm run dev:webpack` / `npm run build:webpack`으로 우회한다.

## 아키텍처

### 디렉토리 분리 원칙

| 위치              | 용도                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | App Router. **폴더 = URL 경로.** 페이지는 `page.tsx`, 레이아웃은 `layout.tsx`, 화면 전용 컴포넌트·훅은 그 라우트 폴더 안에 `components/`·`hooks/`로 둔다 |
| `src/api/`        | 백엔드 통신 — `client.ts`(공통 fetch 래퍼) + 도메인별 `*.ts` (`auth.ts`, `score.ts`, `shop.ts` …)                                                        |
| `src/lib/`        | 도메인-독립 유틸. 환경변수는 `env.ts` 한 곳에서만 읽는다                                                                                                 |
| `src/components/` | 여러 라우트가 공유하는 컴포넌트. **한 라우트에서만 쓰면 여기 두지 말 것**                                                                                |
| `src/types/`      | 여러 도메인이 공유하는 타입. 한 도메인 전용 타입은 해당 `src/api/*.ts`에 함께 둔다                                                                       |

`@/`는 `src/`를 가리킨다 (`import { api } from "@/api/client"`).

> 새 공용 자산을 만들기 전에 `src/lib/`·`src/components/`를 먼저 grep한다. 재구현 금지.
> 공용 자산이 늘어나면 이 문서에 "공용 자산 빠른 참조" 표를 추가해 유지한다.

### 서버 컴포넌트 / 클라이언트 컴포넌트 경계

App Router에서 가장 사고가 잦은 지점이다.

- `src/app/**`의 컴포넌트는 **기본이 서버 컴포넌트**다. `useState`·`useEffect`·이벤트 핸들러·브라우저 API를
  쓰려면 파일 최상단에 `"use client"`가 필요하다.
- `"use client"`는 **경계를 가능한 한 아래(leaf)로** 내린다. 페이지 전체에 붙이면 서버 렌더링 이점이 사라진다.
- **서버 전용 값(`serverEnv`, 시크릿)을 클라이언트 컴포넌트에서 import하지 말 것.** 값이 비어 있거나 번들에 샌다.
- `error.tsx`는 규칙상 반드시 클라이언트 컴포넌트다.

### API 레이어 (`src/api/client.ts`)

- 브라우저는 항상 **같은 오리진 `/api/*`** 로만 호출한다. `next.config.ts`의 `rewrites`가
  `BACKEND_ORIGIN`으로 프록시하므로 **CORS 설정이 필요 없다.**
- 이 rewrite는 파일 기반 라우트보다 **나중에** 평가된다 → `src/app/api/foo/route.ts`가 있으면 그쪽이 우선.
- `api.get/post/put/patch/delete` 헬퍼 사용. 실패 시 `ApiError(status, statusText, body)`를 throw한다.

### API 호출 컨벤션

- **인자**: 모든 API 함수는 **object 인자**로 통일 (`fetchScore({ schoolId, date })`). positional 금지.
- **응답 변환 정책**: `src/api/`는 백엔드 raw 응답을 **그대로 반환**한다.
  키 이름 변경·한글화·derived 필드 같은 화면용 변환은 **훅/컴포넌트에서** 한다. API 계층에 넣지 않는다.
- **에러 처리**: 도메인별 `try/catch` + 상태 null 세팅. 사용자에게 보일 메시지는 화면 단에서 결정한다.
- **SSE**: 현재 이 앱에는 SSE가 없다. 도입한다면 `EventSource`는 클라이언트 컴포넌트에서만 쓰고,
  `useEffect` cleanup에서 반드시 `close()` 한다 (라우트 이동 시 커넥션 누수).

### AI 응답 매핑

헤드리스 Claude 응답을 프론트 모델로 변환하기 전엔 **`ai-contract-check` 스킬**을 따른다(관련 작업 시 자동 발동).
추측하지 말고 `src/lib/prompts/*.ts`의 프롬프트 원문을 읽어 출력 필드·타입을 확인한다.
**LLM은 스키마를 보장하지 않으므로** 프롬프트 대조와 런타임 검증을 둘 다 한다.
자격 증명 파일·디렉토리는 열지 않는다(아래 "보안" 참조).

## 스타일링

### ⛔ Tailwind를 쓰지 않는다

**이 프로젝트는 Tailwind CSS를 사용하지 않는다.** 의존성(`tailwindcss`,
`@tailwindcss/postcss`, `prettier-plugin-tailwindcss`)도 설치돼 있지 않고 `postcss.config.mjs`도 없다.

- `className="flex gap-4"` 같은 **유틸리티 클래스를 쓰지 말 것.**
- `@apply`·`@theme`·`@reference "tailwindcss"` 같은 Tailwind 디렉티브를 쓰지 말 것.
- 편의를 이유로 Tailwind를 다시 설치하지 말 것. 필요하다고 판단되면 **먼저 사용자와 합의**한다.
- 다른 프로젝트(muzig-front 등)에서 코드를 가져올 때 Tailwind 클래스가 섞여 오기 쉽다.
  **옮기기 전에 CSS Modules로 변환**한다.

### CSS Modules가 유일한 방식

- 컴포넌트와 **같은 폴더**에 `Xxx.module.css`를 두고 `import styles from "./Xxx.module.css"`.
  적용은 `className={styles.someClass}`.
- 여러 컴포넌트가 같은 모양을 공유하면 CSS Module 하나를 여러 곳에서 import한다
  (예: `src/app/status.module.css`를 `error.tsx`·`not-found.tsx`가 함께 쓴다).
- 전역 CSS는 `src/app/globals.css` **하나뿐**이다. 여기에는 리셋과 토큰만 두고
  컴포넌트 스타일을 넣지 않는다.

### 디자인 토큰 (`src/app/globals.css`)

색·폰트·모서리 같은 공통 값은 `:root`의 CSS 변수로 정의하고 `var(--x)`로 참조한다.

- **hex 하드코딩 금지.** `--background` / `--foreground` / `--muted` / `--border` 토큰을 쓴다.
- 새 색을 추가할 땐 `:root` + `prefers-color-scheme: dark` **양쪽 다** 정의한다.
- Tailwind preflight가 없으므로 **전역 리셋은 `globals.css`가 직접 들고 있다.**
  `box-sizing`·`margin: 0`·`button`/`a` 초기화 등을 지우면 전 화면이 틀어진다.

## 컨벤션

### 코드 스타일

- **한글 주석 우선**: 식별자는 영문, 주석/문구는 한글. 비즈니스 로직의 의도·제약 위주로 짧게 (WHAT 말고 **WHY**).
- **타입**: `any` 금지. 모르면 `unknown` + 좁히기. 백엔드 응답 타입은 DTO 확인 후 명시적으로 선언한다.
- early return으로 분기 깊이 줄이기.
- 폼 검증·데이터 fetch·비즈니스 로직은 커스텀 훅으로 분리한다.
- **폴더/파일 이동 시 참조 갱신**: 정적 `from`, 동적 `import()`, bare side-effect import,
  문서 상대 링크 **네 형태 모두** 새 경로로 빠짐없이 재작성한다.
- 포맷은 Prettier가 강제한다. 손으로 정렬하지 말고 `npm run format`.

### 환경변수

- 환경변수는 `src/lib/env.ts`를 통해서만 읽는다. `process.env.X`를 화면 코드에 직접 쓰지 않는다.
- **`NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 평문으로 들어간다.** 비밀 키에 절대 붙이지 말 것.
- Next는 빌드 타임에 `process.env.NEXT_PUBLIC_XXX`를 문자열로 치환한다 →
  `process.env[key]` 같은 **동적 접근은 클라이언트에서 동작하지 않는다.**
- 키를 추가하면 `.env.example`에도 (값 없이) 같이 추가한다.

## 보안

- `.env` / `.env.local` / `.env.production` 등 **실제 값이 든 파일은 읽지도 커밋하지도 말 것.**
  `.env.example`(값 없는 템플릿)만 커밋 대상이다.
- Firebase 서비스 계정 JSON(`*firebase*.json`), 키스토어·인증서(`*.keystore`, `*.jks`, `*.p12`, `*.pem`),
  `application-*.yml`의 시크릿 등 **자격 증명 파일은 읽거나 출력(echo/cat)하거나 커밋하지 말 것.**
- 백엔드 DTO 검증 시에도 `src/main/resources/`의 자격 증명 디렉토리는 건드리지 않는다.
- 외부로 데이터를 전송하는 명령(`curl`, `wget` 등)은 저장소 코드·환경변수를 인자로 넣어 사용하지 않는다.
- 토큰을 `localStorage`에 넣기 전에 사용자와 합의한다. 가능하면 백엔드가 주는 **HttpOnly 쿠키**를 쓴다
  (같은 오리진 프록시라 그대로 동작한다).

## 워크플로

### 커밋 정책

- **커밋은 사용자가 명시적으로 요청할 때만 한다.** 작업이 끝나도 자동으로 `git commit`하지 말 것 —
  변경 요약과 커밋 메시지 후보만 제시하고 사용자가 "커밋해줘"라고 할 때까지 기다린다.
  **push는 항상 사용자가 직접 한다.**
- `main`에 직접 커밋하지 말고 브랜치를 먼저 만든다.

### 검증 일괄 실행

- 편집할 때마다 돌리지 않는다. **변경 묶음이 끝난 뒤 커밋 직전에 한 번에** 실행한다:

  ```bash
  npm run check && npm run build
  ```

- `npm run check`는 `next typegen`을 먼저 돌린다 — `typedRoutes`가 켜져 있어 라우트 타입이
  생성돼야 `tsc`가 통과한다. 신규 라우트를 추가했으면 반드시 이 경로로 검증한다.
- 하나라도 실패하면 커밋을 멈추고 먼저 알린다.

### 작업 완료 시 자동 제시

변경 묶음이 끝나면 사용자가 요청하지 않아도 자동으로 제시한다(자동 커밋·푸시는 하지 않음):

- **커밋 메시지 후보**
- **테스트 가이드**: 진입 경로(어느 화면·탭) · 확인 포인트 · 네트워크 검증(DevTools에서 볼 요청·응답)

### plan md 작성 (`docs/plans/`)

긴 작업(여러 PR/세션, 결정 필요)은 시작 전 `docs/plans/`에 plan md를 만들어 추적한다.
형식·위치 규칙은 **`plan-md` 스킬**을 따른다(관련 작업 시 자동 발동).

### 리팩토링 등가 검증

파일 분리·통합·이동·죽은코드 삭제·CSS 병합 등 **동작 보존 리팩토링**을 마치면
커밋 전에 **`refactor-equivalence-check` 스킬**로 원본과의 등가를 검증한다(관련 편집 직후 자동 발동).

### 광역 코드리뷰

도메인 단위 광역 리뷰 요청은 **`adversarial-code-review` 스킬**을 따른다 —
파인더 fan-out → 발견별 반박 검증 → 인계 가능한 추적 md 작성.
현재 diff 한 건만 보는 가벼운 리뷰는 `/code-review`를 쓴다.

## 오케스트레이션 (위임)

### 서브에이전트 (`.claude/agents/`)

| 에이전트             | 언제 띄우나                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `browser-prober`     | 코드로는 확인 불가, 브라우저로 재야만 아는 것 (레이아웃·토큰 계산값·터치 타깃) |
| `refuter`            | 문서·리뷰에 **단정적 주장**을 쓴 뒤 반박 스탠스로 검증                         |
| `ai-contract-prober` | `/api/ai/*` 를 실제 호출해 프롬프트 규칙 준수 확인                             |

**전부 읽기·측정 전용이다.** 코드 수정은 세션이 한다(3계층·2계층 결과는 반드시 검수 — 전역 규칙).

### 언제 위임하는가 — 실제로 놓쳤던 기준

모델 선택(전역 CLAUDE.md 3단 라우팅)보다 **발동 조건**이 자주 빠진다. 아래는 실측 근거가 있다.

- **독립 검증이 3건 이상이면 병렬로 돌린다.**
  _근거: Step 2의 CLI 실측 4가지(stdin·봉투·이미지·트랜스크립트)는 서로 독립인데 순차로 해서 손해._
- **수십 초 걸리는 호출을 여러 조합으로 확인해야 하면 병렬.**
  _근거: 루틴 생성 1회 90초. 4조합 순차 6분 → 병렬 1분 반._
- **단정적 주장을 문서에 쓴 직후 `refuter`.**
  _근거: "주소창 입력 외엔 길이 없다"는 과장을 실제로 잡아냈다._
- **같은 측정을 뷰포트·경로별로 반복해야 하면 `browser-prober`.**

역으로 **위임하지 않는 경우**: 만들고 → 재고 → 결과 보고 설계를 고치는 루프는 컨텍스트를
계속 들고 있어야 해서 쪼개면 손해다. Step 2·3·4가 그랬다.

### Paseo 프로필 (사용자가 Paseo UI에서 생성)

MCP에는 `list_profiles` 만 있고 생성 도구가 없다. 아래 값으로 만들어 두면
`create_agent` 호출 시 provider/model/mode 를 매번 고르지 않아도 되고,
`bypassPermissions` 가 provider 간 상속되지 않는 문제도 사라진다.

| 이름   | provider/model                                                  | mode        | notes (내가 읽고 고르는 기준)                                   |
| ------ | --------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `검수` | `claude/claude-opus-5`                                          | acceptEdits | 설계·보안·최종 검수. 3계층 결과 검증에 필수                     |
| `위임` | `claude/claude-sonnet-5`                                        | acceptEdits | 스코프 명확한 구현·문서화·1차 리뷰                              |
| `물량` | `opencode/ollama/hf.co/unsloth/Qwen3.6-35B-A3B-GGUF:UD-Q4_K_XL` | plan        | **컨텍스트 32k 한계 — 파일 2~3개까지.** 결과는 반드시 상위 검수 |

⚠️ **3계층 결과를 그대로 믿지 마라.** 실측 사례: `gpt-oss:20b` 가 `flex-direction: column` 을
겹침으로 오판해 터치 타깃을 36px(실제 56px)로 계산했다. 전역 규칙의 "3계층은 1~2계층 리뷰"가
장식이 아니다.

## 스킬

| 스킬                         | 언제 발동                                     |
| ---------------------------- | --------------------------------------------- |
| `ai-contract-check`          | AI 응답을 프론트 모델로 변환하는 코드 작성 전 |
| `plan-md`                    | 여러 파일·여러 세션에 걸치는 큰 작업 시작 전  |
| `refactor-equivalence-check` | 동작 보존 리팩토링을 마친 뒤, 커밋 전         |
| `adversarial-code-review`    | 도메인 이상 범위의 광역 코드리뷰 요청 시      |

### ponytail (전역 플러그인, 2026-08-18 도입)

`ponytail@ponytail`이 사용자 전역에 설치돼 **모든 세션에 상시 적용**된다(스킬 6개 + 훅 3개).
"가장 단순하고 짧은, 실제로 동작하는 해법"을 강제한다 — 코드 쓰기 전 7단 사다리를 밟는다:
필요한가 → 코드베이스에 있나 → 표준 라이브러리 → 네이티브 기능 → 이미 깔린 의존성 → 한 줄로 되나 → 최소 구현.

이 레포에 특히 잘 맞는다. UI가 AI로 대량 생성돼 **데이터 출처 없는 카드**(`SkinHealthCard` 등)와
쓰이지 않는 시드가 남아 있고, 앞으로 신규 파일이 20개 이상 추가될 예정이라 과설계 억제 효과가 크다.

**충돌 시 우선순위 — 이 문서(프로젝트 규칙)가 ponytail보다 우선한다.** 알려진 충돌:

- ponytail은 "프레임워크 없는 assert 기반 검증 파일"을 요구하지만,
  **이 레포는 테스트 러너를 두지 않는다.** `npm run check` + `npm run build`가 검증 수단이다.
- `/ponytail-review`·`/ponytail-audit`은 `adversarial-code-review`·`refactor-equivalence-check`와
  범위가 겹친다. **도메인 이상 광역 리뷰는 프로젝트 스킬을, 과설계 점검은 ponytail을** 쓴다.

> jikjikjik 레포의 `sidebar-isolation-check`·`be-changelog-impact`는 이 프로젝트에 대응 개념이
> 없어서 가져오지 않았다. 사이드바 담당자 분리 구조나 BE 변경 로그 공유 프로세스가 생기면 그때 이식한다.

## 사용자 메모

<!-- 팀 규칙·파트 분배·서버 주소 등 프로젝트가 굴러가며 확정되는 것들을 여기에 누적한다. -->

- **백엔드 연동**: 로컬은 `.env.local`의 `BACKEND_ORIGIN`으로 프록시한다(기본 `http://localhost:8080`).
  운영/테스트 서버 주소가 정해지면 여기에 기록할 것.
- **파트 분배**: 미정.
