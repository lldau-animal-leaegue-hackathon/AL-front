# AL-front

Animal League 프론트엔드. Next.js 16 App Router 기반입니다.

## 요구 사항

| 항목 | 버전       | 비고                                                  |
| ---- | ---------- | ----------------------------------------------------- |
| Node | **24 LTS** | `.nvmrc` 참고. 최소 20.9.0 이상 (Next.js 16 요구사항) |
| npm  | 10 이상    | Node 24 에 포함                                       |

> ⚠️ **Node 20 은 2026년 4월 30일에 지원이 종료(EOL)되어 더 이상 보안 패치를 받지 못합니다.**
> 현재 Node 24 가 Active LTS 입니다 (2028년 4월까지 지원). Node 22 는 이미 유지보수 단계입니다.
>
> ```bash
> nvm install 24 && nvm use 24
> ```
>
> Windows 는 [nvm-windows](https://github.com/coreybutler/nvm-windows) 를 사용하세요.
> `package.json` 의 `engines` 는 Next.js 의 실제 최소 요구사항인 `>=20.9.0` 으로 두어
> 당장 설치가 막히지는 않지만, **24 로 올리는 것을 권장합니다.**

## 시작하기

```bash
npm ci                       # package-lock.json 기준으로 정확히 설치
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

## 스크립트

| 명령                    | 설명                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | 개발 서버 (Turbopack)                                       |
| `npm run build`         | 프로덕션 빌드                                               |
| `npm start`             | 빌드 결과 실행                                              |
| `npm run dev:webpack`   | Turbopack 대신 webpack 으로 개발 서버 (아래 참고)           |
| `npm run build:webpack` | Turbopack 대신 webpack 으로 빌드                            |
| `npm run lint`          | ESLint 검사                                                 |
| `npm run lint:fix`      | ESLint 자동 수정                                            |
| `npm run typecheck`     | 라우트 타입 생성 후 `tsc --noEmit`                          |
| `npm run format`        | Prettier 자동 정렬                                          |
| `npm run format:check`  | Prettier 검사만 (CI 용)                                     |
| **`npm run check`**     | **타입 + 린트 + 포맷을 한 번에 검사 — PR 올리기 전에 실행** |

## 폴더 구조

```
src/
├─ app/                # App Router. 폴더 = URL 경로
│  ├─ layout.tsx       # 전역 레이아웃 (metadata, 폰트)
│  ├─ page.tsx         # "/"
│  ├─ page.module.css  # "/" 전용 스타일
│  ├─ globals.css      # 전역 리셋 + 디자인 토큰 (여기만 전역)
│  ├─ error.tsx        # 렌더링 에러 화면
│  ├─ not-found.tsx    # 404 화면
│  └─ status.module.css # error·not-found 공용 스타일
├─ api/              # 백엔드 호출 모듈. 도메인별로 파일을 나눕니다
│  └─ client.ts      # 공용 fetch 래퍼 (api.get / api.post ...)
└─ lib/
   └─ env.ts         # 환경변수를 한 곳에서 읽고 검증
```

`@/` 는 `src/` 를 가리킵니다. (`import { api } from "@/api/client"`)

### API 모듈 작성 예시

```ts
// src/api/user.ts
import { api } from "./client";

export type User = { id: number; nickname: string };

export const getMe = () => api.get<User>("/users/me");
export const updateNickname = (nickname: string) =>
  api.patch<User>("/users/me", { nickname });
```

## 스타일링

**이 프로젝트는 Tailwind 를 쓰지 않습니다.** 스타일은 전부 CSS Modules 로 작성합니다.

컴포넌트와 같은 폴더에 `Xxx.module.css` 를 두고 import 합니다:

```tsx
import styles from "./page.module.css";

export default function Page() {
  return <main className={styles.main}>...</main>;
}
```

- 여러 컴포넌트가 같은 모양을 공유하면 CSS Module 하나를 여러 곳에서 import 합니다.
  (예: `src/app/status.module.css` 를 `error.tsx`·`not-found.tsx` 가 함께 사용)
- 색·폰트·모서리 같은 공통 값은 `src/app/globals.css` 의 `:root` 에 CSS 변수로 정의하고
  `var(--background)` 로 참조합니다. **hex 하드코딩은 하지 마세요.**
- 새 색을 추가할 땐 `:root` 와 `prefers-color-scheme: dark` **양쪽 다** 정의합니다.

> ⚠️ Tailwind 의 preflight 가 없으므로 **전역 리셋을 `globals.css` 가 직접 들고 있습니다.**
> `box-sizing`·`margin: 0`·`button`/`a` 초기화 등을 지우면 전 화면이 틀어집니다.

### 폰트

현재 Pretendard 를 jsDelivr CDN 으로 불러옵니다 (`src/app/layout.tsx`).
외부 요청을 없애고 레이아웃 이동(CLS)을 줄이려면 폰트 파일을 받아
`next/font/local` 로 바꾸세요:

```ts
import localFont from "next/font/local";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-sans",
  display: "swap",
});
// <html className={pretendard.variable}>
```

> `globals.css` 의 `--font-sans` 변수를 그대로 덮어쓰면 나머지 코드는 고칠 필요가 없습니다.

## 환경변수

`.env.local` 에 작성합니다. **커밋되지 않습니다.**
키를 추가하면 `.env.example` 에도 (값 없이) 같이 추가해 주세요.

| 키                         | 노출 범위           | 설명                                 |
| -------------------------- | ------------------- | ------------------------------------ |
| `BACKEND_ORIGIN`           | 서버 전용           | `/api/*` 요청을 프록시할 백엔드 주소 |
| `NEXT_PUBLIC_API_BASE_URL` | **브라우저에 노출** | 클라이언트가 호출할 API 베이스 경로  |

> `NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저 번들에 **평문으로** 들어갑니다.
> 비밀 키에는 절대 붙이지 마세요.

### 백엔드 연동

`.env.local` 에 `BACKEND_ORIGIN=http://localhost:8080` 을 넣으면
`next.config.ts` 의 `rewrites` 가 `/api/*` 를 백엔드로 넘겨줍니다.
프론트엔드에서 보면 같은 오리진이므로 **CORS 설정이 필요 없습니다.**

이 rewrite 는 파일 기반 라우트보다 나중에 평가되므로,
`src/app/api/foo/route.ts` 를 만들면 그 경로는 Next.js 가 직접 처리합니다.

## CI

`.github/workflows/ci.yml` 이 PR 과 main push 마다
포맷 → 린트 → 타입체크 → 빌드를 검사합니다.
로컬에서 `npm run check` 를 먼저 돌리면 CI 실패를 미리 막을 수 있습니다.

## 버전 선택 근거

Next.js 16 은 **Turbopack 이 기본 번들러**입니다. `--turbopack` 플래그는 필요 없습니다.
혹시 Windows 에서 Turbopack 관련 문제가 생기면 `npm run dev:webpack` 으로 우회할 수 있습니다.

`next` / `react` / `react-dom` 은 정확한 버전으로 고정했습니다.
프레임워크 마이너 버전이 예고 없이 올라가 빌드가 깨지는 것을 막기 위해서입니다.
업데이트는 Dependabot 이 주간 PR 로 제안합니다 (`.github/dependabot.yml`).

### 왜 최신 버전이 아닌 것들이 있나요

일부러 "가장 최신"을 피한 항목이 있습니다. **최신 버전을 쓰면 오히려 깨지기 때문**입니다.

| 패키지      | 채택 버전 | 최신 버전 | 최신을 안 쓴 이유                                                                                                                                                                      |
| ----------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript  | `~5.9.3`  | `7.0.2`   | TS 7 은 Go 로 새로 작성된 버전이라 **JS API 가 없습니다.** `typescript-eslint` 가 지원하지 않아 `npm run lint` 가 규칙 실행 전에 통째로 죽습니다. `create-next-app` 도 `^5` 를 씁니다. |
| ESLint      | `^9.39.5` | `10.8.1`  | `eslint-config-next` 가 의존하는 `eslint-plugin-react` / `import` / `jsx-a11y` 가 아직 ESLint 9 까지만 지원합니다. 10 을 넣으면 설치 단계에서 의존성 충돌이 납니다.                    |
| @types/node | `^24`     | `26.2.0`  | 타입 메이저는 Node 런타임 메이저와 맞춰야 합니다. Node 24 에 없는 API 가 타입상으로만 통과해서 런타임에 터지는 걸 막습니다.                                                            |

> TypeScript 를 `6.0.3` 으로 올리는 것도 가능합니다 (실제로 Vercel 은 Next 16.3 을 TS 6.0.2 로 빌드합니다).
> 이 저장소에서 타입체크·린트·빌드가 모두 통과하는 것을 확인했습니다. 다만 아직 점유율이 낮아 기본값은 5.9 로 두었습니다.
> **TypeScript 7 로는 올리지 마세요.** `typescript-eslint` 가 지원할 때까지 린트가 동작하지 않습니다.
