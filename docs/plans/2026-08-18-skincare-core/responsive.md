# 반응형 설계 — 모바일 · 태블릿 · 데스크톱

> 📐 **설계 문서(2026-08-18)** — [메인 plan](./README.md)의 부속 문서.
> Step 3–9의 모든 화면 작업은 이 문서의 토큰·브레이크포인트·체크리스트를 따른다.
> **R1(데스크톱 네비게이션 부재)은 신규 화면을 만들기 전에 먼저 고쳐야 한다** — 안 고치면
> 새로 만드는 화면마다 같은 결함이 복제된다.
>
> **Q-R1·Q-R2 확정(2026-08-18)** — 좌측 사이드바 + 다크 팔레트 제작. 미결 없음.
>
> ~~🚧 작업 경계(2026-08-18) — `src/app/routine/**` 는 다른 팀원 담당.~~
> **해제(2026-08-18): 사용자가 루틴을 위임받았고 `feature/routine`(db9eaed)을 머지했다.**
> R-Step 3·4·5의 루틴 파일 제외를 되돌린다. R7의 `StepActions`도 직접 고친다.
> ⚠️ db9eaed로 루틴 라우트가 `[slot]` → `[routineId]`로 바뀌었고 `IMMERSIVE` 정규식도
> `/^\/routine\/[^/]+\//`로 일반화됐다 — 본문의 옛 경로·정규식 표기는 이 기준으로 읽을 것.

## Context

이 앱은 모바일 우선으로 만들어졌지만 **웹에서도 온전히 동작해야 한다.**
현재 코드를 실측한 결과, 모바일은 대체로 견고하나 **데스크톱은 사용 불가 수준**이다.

### 실측 요약 (2026-08-18, `e8568a9` 기준)

| 항목                         | 현황                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| 미디어 쿼리 총 15개          | **전부 `min-width: 768px`** — 단일 브레이크포인트            |
| `clamp()` / 유동 타이포      | **0건** — 타이포 토큰이 전부 고정 px                         |
| `@container`                 | **0건**                                                      |
| `dvh`                        | 3건 (`body`, `status`, `testCamera`) — 좋음                  |
| `prefers-reduced-motion`     | 2건 (`SkinHealthCard`, `StepTimer`) — 좋음                   |
| `env(safe-area-inset-*)`     | 2건, **그러나 `viewport-fit=cover`가 없어 항상 0** (R5)      |
| `prefers-color-scheme: dark` | **0건**, 그런데 `layout.tsx`는 dark `themeColor`를 선언 (R8) |

**잘 되어 있는 것** — `dvh` 사용, `prefers-reduced-motion` 대응, `color-mix`·`backdrop-filter`·
`aspect-ratio` 같은 현대 CSS, `--container-max`로 초광폭 캡, `ProductSearch`·`profile`의
`repeat(2,1fr)`→`repeat(4,1fr)` 카드 그리드. 기반은 나쁘지 않다. 문제는 **중간 구간과 셸**이다.

---

## 발견된 결함

심각도 순. `R#`은 이 문서 안에서의 추적 번호다.

### 🔴 R1. 데스크톱에 4방향 네비게이션이 존재하지 않는다

**가장 심각하다. 데스크톱에서 섹션 간 자유 이동이 불가능하다.**

- [`BottomNav.module.css:46`](../../../src/components/BottomNav/BottomNav.module.css) —
  `@media (min-width: 768px) { .nav { display: none } }`
- [`TopAppBar.tsx`](../../../src/components/TopAppBar/TopAppBar.tsx) — 아바타·이름·알림 벨뿐,
  **네비게이션 링크가 하나도 없다.**
- [`layout.tsx:71`](../../../src/app/layout.tsx) — `<body>{children}<BottomNav /></body>`.
  대체 네비게이션이 없다.

→ **≥768px에서 홈·스캔·루틴·프로필을 자유롭게 오갈 방법이 없다.**
`BottomNav.module.css`의 주석은 `데스크톱에서는 하단 탭 대신 넓은 그리드를 쓴다 (목업의 md:hidden)`
이라고 적었지만, **"넓은 그리드"는 콘텐츠 레이아웃이지 네비게이션이 아니다.**
목업을 옮기며 빠뜨린 것으로 보인다.

> **정정(2026-08-18, 적대 검증)** — 초기 서술은 "주소창 입력 외엔 길이 없다"였으나 **과장이었다.**
> 단방향 링크는 실제로 존재하고 데스크톱에서도 보인다:
> [`ScanCard.tsx:21`](<../../../src/app/(home)/components/ScanCard.tsx>)(홈→스캔),
> [`profile/page.tsx:121,173`](../../../src/app/profile/page.tsx)(프로필→스캔),
> [`RunHeader.tsx:20`](../../../src/app/routine/components/RunHeader.tsx)(수행→루틴),
> `not-found.tsx:10`(→홈).
> 다만 전부 **단일 목적 CTA·닫기 버튼**이라 4방향 이동을 대체하지 못한다.
> 예: 스캔 화면의 `PageHeader`에는 뒤로가기뿐이라 **스캔 → 루틴/프로필로 갈 수 없다.**
> 대체 네비 컴포넌트가 코드베이스에 없다는 것도 확인됐다(`layout.tsx`가 유일한 레이아웃).

⚠️ 관련 사실 — [`BottomNav.tsx:20`](../../../src/components/BottomNav/BottomNav.tsx)의
`IMMERSIVE = /^\/routine\/(am|pm)\//`에서는 `BottomNav`가 `null`을 반환한다.
즉 **루틴 수행 화면은 모바일에서도 4방향 네비가 없고** `RunHeader`의 닫기 링크가 유일한 탈출구다.
이건 의도된 몰입 설계이므로 결함이 아니다 — `SideNav`도 **같은 정규식을 공유**해야 한다(설계 절 참조).

### 🔴 R2. 브레이크포인트가 768px 하나뿐 — 태블릿 구간이 뭉갠다

15개 미디어 쿼리가 전부 768px다. 즉 **768px와 1920px가 같은 레이아웃 규칙**을 쓴다.

홈 벤토 그리드가 정확히 여기서 깨진다. `.narrow`(`grid-column: span 4`)의 실제 폭을 계산하면:

```
뷰포트 768 − padding-inline(40×2) = 688
gap 24 × 11 = 264  →  컬럼 합계 424  →  1컬럼 35.3px
span 4 = 35.3×4 + 24×3 = 약 213px
```

**213px 폭에 `ScanCard`·`IngredientAlerts` 같은 카드를 넣으면 내용이 뭉갠다.**
`--margin-desktop: 40px`와 `--container-max: 1200px` 토큰은 이미 있는데 **그 사이를 잇는 단계가 없다.**

### 🟠 R3. 타이포그래피가 고정 px이고 수동으로 갈아끼운다

[`globals.css:83`](../../../src/app/globals.css)의 스케일은 전부 고정값이다.

```css
--text-display-lg: 700 48px/56px var(--font-sans);
--text-headline-lg: 600 32px/40px var(--font-sans);
--text-headline-lg-mobile: 600 24px/32px var(--font-sans); /* ← 별도 토큰 = 손으로 스위칭 */
```

`-mobile` 접미사 토큰이 따로 있다는 것 자체가 신호다 — 컴포넌트마다 미디어 쿼리로 갈아끼워야 하고,
**빠뜨리면 320px 화면에서 48px 제목이 그대로 나온다.** `clamp()`가 0건이다.

### 🟠 R4. 고정 헤더/푸터 회피 여백이 매직 넘버다

각 페이지가 상단 고정 헤더와 하단 고정 바를 **하드코딩한 padding**으로 피한다.

| 파일                                    | padding (모바일) | 비고                       |
| --------------------------------------- | ---------------- | -------------------------- |
| `(home)/page.module.css`                | `88px … 120px`   | TopAppBar + BottomNav      |
| `routine/page.module.css`               | `88px … 120px`   | 동일                       |
| `scan/page.module.css`                  | `96px … 128px`   | **PageHeader라 값이 다름** |
| `routine/[slot]/[step]/page.module.css` | `8px … 180px`    | RunHeader + StepActions    |

→ 헤더 높이를 조금만 바꿔도 **4곳을 손으로 고쳐야 하고, 하나 놓치면 내용이 헤더 밑에 가린다.**
CSS Modules는 타입 검사를 받지 않으므로 이런 누락은 **런타임에 눈으로 봐야만** 발견된다.

### 🟠 R5. `env(safe-area-inset-*)`가 항상 0이다 — iOS 노치 미대응

`BottomNav`와 `StepActions`가 `calc(24px + env(safe-area-inset-bottom))`을 쓴다. 의도는 옳다.
그런데 [`layout.tsx:30`](../../../src/app/layout.tsx)의 `viewport`에 **`viewportFit: "cover"`가 없다.**

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewportFit 없음 → safe-area-inset-* 는 전부 0
  themeColor: [...],
};
```

`viewport-fit=cover` 없이는 브라우저가 safe area를 노출하지 않는다.
→ **`env()`를 써도 값이 0이라 아무 효과가 없다.** 홈 인디케이터에 탭바가 겹친다.
가로모드 노치(`safe-area-inset-left/right`)는 아예 처리하지 않았다.

### 🟡 R6. 모바일 가로모드가 무너진다

`/routine/[slot]/[step]`은 `aspect-ratio: 4 / 5` 사진 + `padding-bottom: 180px`다.
iPhone 가로(약 390px 높이)에서 **사진 하나가 화면 높이를 넘긴다.** 루틴 수행은 세면대 앞에서
거치대에 눕혀 놓고 볼 가능성이 높은 화면이라 가로모드 무시는 위험하다.

### 🟡 R7. 터치 타깃이 44px 미만인 곳이 있다

[`StepActions.module.css:61`](../../../src/app/routine/components/StepActions.module.css)의
`.subtle`(이전 단계 / 건너뛰기)은 **패딩이 없어 높이가 텍스트 줄높이 24px뿐**이다.
WCAG 2.5.8(최소 24×24)은 겨우 통과하나 모바일 권장(44×44)에는 한참 못 미친다.
루틴 수행 중 **젖은 손으로 누르는 버튼**이라 실사용에서 더 나쁘다.

적대 검증으로 확인된 세부(2026-08-18) — 높이를 늘려 줄 요소가 **하나도 없다**:

- 부모 `.secondary`(`:54`)의 패딩은 `0 8px`로 **수평뿐**이라 세로 여백이 0이다.
- 아이콘도 `Icon.module.css`의 `.sm { font-size: 16px }`라 **줄높이 24px보다 작아** 높이를 못 늘린다.
- 따라서 `line-height: 24px`가 곧 클릭 영역 전체 높이다. `이전`·`건너뛰기` **둘 다** 해당.
- 반면 `.primary`(다음 단계, `:24-38`)는 `padding: 16px 24px`로 **충분하다.** `.subtle` 계열만 고치면 된다.

루틴 밖 실측(2026-08-18) — **경계 안이라 이번에 고칠 수 있는 것**:

| 파일                                           | 클래스  | 계산                            | 높이     | 판정               |
| ---------------------------------------------- | ------- | ------------------------------- | -------- | ------------------ |
| `scan/components/PageHeader.module.css:19`     | `.back` | `8 + 24(icon) + 8`              | **40px** | ❌ 4px 부족 → 고침 |
| `components/BottomNav/BottomNav.module.css:17` | `.item` | `6 + 24 + 4(label mt) + 16 + 6` | **56px** | ✅ 통과            |

`.back`은 `padding: 8px` → `10px`이면 44px가 된다. 시각적 변화가 거의 없다.

> ⚠️ `.item`은 `flex-direction: column`이라 아이콘과 라벨이 **쌓인다.**
> `max(icon, label)`로 계산하면 36px이 나와 실패로 오판한다 — 실제로는 합산이라 56px다.
> 세로 flex의 터치 타깃을 계산할 때 반복되는 실수라 여기 남긴다.

### 🟡 R8. 다크 모드 선언과 구현이 불일치한다

- [`globals.css:11`](../../../src/app/globals.css) 주석: `라이트 전용 팔레트다. 다크 팔레트는 DESIGN.md에 정의돼 있지 않다.`
- [`layout.tsx:33`](../../../src/app/layout.tsx): `themeColor`에 **dark `#0a0a0a`를 선언**.
- `AGENTS.md`: `새 색을 추가할 땐 :root + prefers-color-scheme: dark 양쪽 다 정의한다.`

→ 셋이 서로 어긋난다. OS가 다크 모드면 **브라우저 UI만 검어지고 페이지는 흰색**이라 이질적이다.
`prefers-color-scheme: dark` 블록이 코드에 0건이다. → **Q-R2에서 결정 필요.**

### 🟡 R9. 컨테이너 쿼리가 없어 카드가 맥락을 모른다

같은 카드 모듈(`card.module.css`)이 서로 다른 폭에 놓인다 — 홈 `span 4`(약 213px),
홈 `span 8`, 프로필 `repeat(2,1fr)`, 프로필 `repeat(4,1fr)`.
그런데 카드 내부 스타일은 **뷰포트만 보고** 반응한다.
→ 뷰포트는 넓은데 카드는 좁은 조합에서 레이아웃이 어긋난다. `@container`가 정확히 이 문제를 푼다.

### 🟡 R10. 최소 폭(320px) 검증이 없다

`--margin-mobile: 20px`이므로 320px 화면에서 콘텐츠 폭은 280px다.
프로필 `.shelfGrid`가 `repeat(2, 1fr)`이면 카드 하나가 **132px**(gap 16 제외)이다.
제품명 + 카테고리 칩 + 성분 노트가 들어가기엔 좁다. 실기기 확인이 필요하다.

---

## 결정 확정 (2026-08-18)

### Q-R1 → **좌측 사이드바(≥1024px) + 상단 바(768–1023px)**

아래 옵션 A 채택. 셸 구조는 [설계](#셸-구조-q-r1--a-기준) 절 참조.
`AppShell` 컴포넌트는 **원안대로 유지**한다(ponytail의 제거 제안은 Q-ponytail에서 미반영으로 결정).

### Q-R2 → **다크 팔레트를 만든다**

아래 옵션 B 채택. 단 **색을 새로 지어내지 않는다** — 상세는 [다크 팔레트 도출](#다크-팔레트-도출-q-r2) 절.

> ⚠️ 이 결정으로 `AGENTS.md`의 `새 색을 추가할 땐 :root + prefers-color-scheme: dark 양쪽 다
정의한다` 규칙이 **비로소 강제 가능해진다.** 지금까지는 dark 블록이 없어 규칙이 공회전했다.

---

## 검토했던 옵션 (기록)

### Q-R1. 데스크톱 네비게이션을 어떤 형태로 할 것인가 — R1 해결책

- **옵션 A: 좌측 고정 사이드바(≥1024px) + 상단 바(768–1023px)**
  - 장점: 4개 탭이 항상 보이고, 넓은 화면의 가로 공간을 낭비하지 않는다.
    콘텐츠 영역이 좁아져 **R2의 213px 문제도 같이 완화**된다.
  - 단점: 셸 구조 변경이 가장 크다. `layout.tsx`에 그리드 셸이 필요하다.
- **옵션 B: `TopAppBar`에 네비게이션 링크 추가(≥768px)**
  - 장점: 변경이 가장 작다. `TopAppBar`는 이미 홈·루틴·프로필에서 쓰인다.
  - 단점: **`/scan`은 `PageHeader`를, `/routine/[slot]/[step]`은 `RunHeader`를 쓴다.**
    세 헤더에 각각 붙이거나 헤더를 통합해야 한다 — 결국 셸 작업이 생긴다.
- **옵션 C: `BottomNav`를 데스크톱에서도 유지**
  - 장점: 변경 거의 없음(미디어 쿼리 한 줄 삭제).
  - 단점: 데스크톱에서 화면 하단 고정 탭바는 낯설고, 넓은 화면에서 조작 거리가 멀다.
- **추천: A.** R1과 R2를 한 번에 푼다. 셸을 한 번 제대로 잡으면 Step 3–9에서 만드는
  **모든 신규 화면이 자동으로 혜택**을 본다. 지금이 가장 싼 시점이다
  (화면이 늘어난 뒤에 바꾸면 전 화면을 다시 손봐야 한다).

### Q-R2. 다크 모드를 지원할 것인가 — R8 해결책

`DESIGN.md`에 다크 팔레트가 **없다.** 지원하려면 색을 새로 정의해야 한다.

- **옵션 A: 지원하지 않는다고 명시** — `layout.tsx`의 dark `themeColor`를 **제거**하고,
  `<meta name="color-scheme" content="light">`를 선언한다. `globals.css` 주석과 일치시킨다.
  가장 정직하고 비용 0. 나중에 팔레트가 나오면 그때 추가.
- **옵션 B: 지금 다크 팔레트를 만든다** — Material 계열 토큰이라 기계적 반전은 가능하나,
  **근거 없이 만든 색은 브랜드가 아니다.** DESIGN.md의 "Clinical-Soft" 의도를 해칠 수 있다.
- **추천: A.** 해커톤 범위에서 다크 팔레트를 지어내는 것보다, **불일치를 없애는 쪽**이 낫다.
  지금 상태(브라우저 UI만 검음)가 가장 나쁘다.

---

## 설계

### 브레이크포인트 스케일

**모바일 우선 `min-width`만 사용한다.** `max-width`와 섞으면 경계에서 중첩·누락이 생긴다.

| 이름 | 값       | 대상                      | 레이아웃 전환                           |
| ---- | -------- | ------------------------- | --------------------------------------- |
| `sm` | `480px`  | 큰 폰 / 폴더블 펼침       | 카드 2열 허용, 여백 20→24px             |
| `md` | `768px`  | 태블릿 세로               | BottomNav → 상단 네비, 벤토 그리드 시작 |
| `lg` | `1024px` | 태블릿 가로 / 작은 노트북 | **좌측 사이드바 등장**, 12열 본격화     |
| `xl` | `1280px` | 데스크톱                  | 여백 40→64px, `--container-max` 도달    |

**CSS에는 변수를 쓸 수 없다** — `@media (min-width: var(--bp-md))`는 동작하지 않는다.
값을 직접 쓰되 **`globals.css` 상단 주석에 이 표를 박아** 단일 출처로 삼는다.

기존 `768px` 쿼리 15개는 **그대로 유효**하다. `lg`·`xl`을 **추가**하는 방향이라 회귀 위험이 낮다.

### 토큰 추가 (`globals.css`)

```css
:root {
  /* ── 유동 타이포 (R3) ────────────────────────────────────────
     clamp(최소, 유동, 최대). 뷰포트 360~1280 구간에서 선형 증가.
     -mobile 접미사 토큰이 필요 없어진다. */
  --text-display-lg: 700 clamp(32px, 6vw, 48px) / 1.15 var(--font-sans);
  --text-headline-lg: 600 clamp(24px, 4vw, 32px) / 1.25 var(--font-sans);
  --text-headline-md: 600 clamp(20px, 3vw, 24px) / 1.33 var(--font-sans);
  --text-body-lg: 400 clamp(16px, 1.5vw, 18px) / 1.55 var(--font-sans);
  /* body-md·label-sm은 본문·라벨이라 고정 유지 — 유동시키면 가독성이 흔들린다 */

  /* ── 셸 치수 (R4) — 매직 넘버 제거 ──────────────────────────── */
  --header-h: 72px; /* TopAppBar / PageHeader / RunHeader 공통 높이 */
  --nav-h: 76px; /* BottomNav 높이 (safe-area 제외) */
  --sidebar-w: 240px; /* lg 이상 좌측 사이드바 */

  /* 페이지 본문이 고정 요소를 피하는 여백 — 각 페이지는 이것만 쓴다 */
  --page-pt: calc(var(--header-h) + 16px);
  --page-pb: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 24px);

  /* ── 유동 좌우 여백 ──────────────────────────────────────────── */
  --page-inline: clamp(
    16px,
    4vw,
    40px
  ); /* margin-mobile ↔ margin-desktop 대체 */
}

@media (min-width: 1024px) {
  :root {
    /* 사이드바가 생기면 하단 탭바가 사라지므로 하단 여백을 줄인다 */
    --page-pb: 40px;
  }
}
```

- **기존 `--margin-mobile`·`--margin-desktop`은 남겨둔다**(별칭). 한 번에 갈아엎으면
  15개 미디어 쿼리를 동시에 건드려야 해서 회귀 위험이 크다. 신규 코드부터 `--page-inline`을 쓴다.
- `env(safe-area-inset-bottom, 0px)`의 **폴백 `0px`를 반드시 넣는다.** 없으면 미지원 브라우저에서
  `calc()` 전체가 무효가 되어 여백이 통째로 사라진다.

### 셸 구조 (Q-R1 = A 기준)

```
< lg (0~1023px)                   ≥ lg (1024px~)
┌─────────────────┐               ┌──────┬──────────────────┐
│  Header (fixed) │               │      │  Header (sticky) │
├─────────────────┤               │ Side ├──────────────────┤
│                 │               │ nav  │                  │
│    children     │               │ 240px│     children     │
│                 │               │(fixed)│  max 1200 - 240  │
├─────────────────┤               │      │                  │
│ BottomNav(fixed)│               └──────┴──────────────────┘
└─────────────────┘
```

- `layout.tsx`에 **`AppShell`(서버 컴포넌트)**을 두고 그 안에서 `SideNav`(클라이언트 —
  `usePathname` 필요)와 `BottomNav`를 함께 렌더한다. 둘 다 CSS로 표시/숨김을 전환한다.
  → **JS로 분기하지 않는다.** 뷰포트 분기를 JS로 하면 SSR/하이드레이션 불일치가 난다.
- `SideNav`는 `BottomNav`의 `TABS` 배열을 **공유**한다. 탭 정의가 두 벌이 되면 반드시 어긋난다.
  → `src/components/nav/tabs.ts`로 분리하고 양쪽이 import.
- `BottomNav`의 `IMMERSIVE` 정규식(db9eaed 이후 `/^\/routine\/[^/]+\//`)은 **`SideNav`에도 적용**한다.
  루틴 수행은 데스크톱에서도 몰입 화면이어야 한다. → 정규식도 `tabs.ts`로 함께 이동.

### 그리드 정책 (R2)

홈 벤토 그리드의 `span` 값을 브레이크포인트별로 나눈다.

| 클래스    | `md` (768–1023) | `lg` (1024–) | 근거                               |
| --------- | --------------- | ------------ | ---------------------------------- |
| `.full`   | `span 12`       | `span 12`    | —                                  |
| `.wide`   | `span 12`       | `span 8`     | md에서 8/12는 좁다 — 전폭으로 둔다 |
| `.narrow` | `span 6`        | `span 4`     | **md의 span 4(213px) 문제 해결**   |

`/routine/[slot]/[step]`의 12열 그리드도 동일 정책을 적용한다.

### 컨테이너 쿼리 (R9)

카드가 놓이는 **셀에 `container-type: inline-size`**를 주고, 카드 내부는 `@container`로 반응한다.

```css
/* 그리드 셀 = 컨테이너 */
.full,
.wide,
.narrow {
  container-type: inline-size;
}

/* 카드 내부 — 뷰포트가 아니라 '내가 놓인 폭'을 본다 */
@container (min-width: 320px) {
  .cardBody {
    flex-direction: row;
  }
}
```

- **뷰포트 쿼리를 대체하는 게 아니라 보완한다.** 레이아웃 골격(그리드 열 수, 네비 형태)은
  뷰포트로, **재사용 카드 내부**는 컨테이너로 나눈다.
- `container-type: inline-size`는 해당 축의 **크기 격리**를 만든다. 자식이 부모 높이를 늘리는
  패턴이 있으면 깨질 수 있으니, 적용 후 해당 카드를 눈으로 확인한다.

### 다크 팔레트 도출 (Q-R2)

**색을 지어내지 않는다.** DESIGN.md의 팔레트는 Material 3 계열이고, `-fixed` 계열 토큰이
**이미 톤 10 / 30 / 80 / 90을 담고 있다.** 즉 다크 스킴에 필요한 값이 대부분 **라이트 팔레트 안에
다른 이름으로 존재**한다. 새로 만들어야 하는 건 톤 20 몇 개와 중성 표면 단계뿐이다.

#### 톤 대응표 — 라이트 토큰이 곧 다크 값이다

| 다크 토큰                  | 값        | 출처 (라이트 팔레트의 어느 토큰인가)        |
| -------------------------- | --------- | ------------------------------------------- |
| `--primary`                | `#afcebb` | = 라이트 `--inverse-primary`(톤 80)         |
| `--primary-container`      | `#314c3e` | = 라이트 `--on-primary-fixed-variant`(30)   |
| `--on-primary-container`   | `#cbead6` | = 라이트 `--primary-fixed`(90)              |
| `--inverse-primary`        | `#466253` | = 라이트 `--primary`(40)                    |
| `--secondary`              | `#ddc2a5` | = 라이트 `--secondary-fixed-dim`(80)        |
| `--secondary-container`    | `#56432e` | = 라이트 `--on-secondary-fixed-variant`(30) |
| `--on-secondary-container` | `#fbdec0` | = 라이트 `--secondary-fixed`(90)            |
| `--tertiary`               | `#b6c7e7` | = 라이트 `--tertiary-fixed-dim`(80)         |
| `--tertiary-container`     | `#374762` | = 라이트 `--on-tertiary-fixed-variant`(30)  |
| `--on-tertiary-container`  | `#d5e3ff` | = 라이트 `--tertiary-fixed`(90)             |
| `--error-container`        | `#93000a` | = 라이트 `--on-error-container`(30)         |
| `--on-error-container`     | `#ffdad6` | = 라이트 `--error-container`(90)            |
| `--on-surface`             | `#e1e3e4` | = 라이트 `--surface-container-highest`(90)  |
| `--on-surface-variant`     | `#c2c8c2` | = 라이트 `--outline-variant`(80)            |
| `--outline-variant`        | `#424844` | = 라이트 `--on-surface-variant`(30)         |
| `--surface-container-low`  | `#191c1d` | = 라이트 `--on-surface`(10)                 |
| `--inverse-on-surface`     | `#2e3132` | = 라이트 `--inverse-surface`(20)            |
| `--inverse-surface`        | `#e1e3e4` | = 라이트 `--surface-container-highest`(90)  |

**새로 계산해야 하는 값** — 라이트 팔레트에 대응 토큰이 없는 것뿐이다:

- *_톤 20 (on-_ 계열)**: 톤 10과 30 사이 보간 —
  `--on-primary: #1b3527` · `--on-secondary: #3e2d18` · `--on-tertiary: #20304a`
- **중성 표면 단계**: `--surface: #101415`(t6) · `--surface-dim: #101415` · `--surface-bright: #363a3b`(t24)
  · `--surface-container-lowest: #0b0f10`(t4) · `--surface-container: #1d2021`(t12)
  · `--surface-container-high: #272b2c`(t17) · `--surface-container-highest: #323637`(t22)
  · `--outline: #8c928c`(t60) · `--surface-variant: #424844`
- **에러 톤 80/20**: M3 표준값 `--error: #ffb4ab` · `--on-error: #690005`

#### 색 말고도 바꿔야 하는 것

토큰만 뒤집으면 반드시 깨지는 지점들이다.

- **그림자는 다크에서 보이지 않는다.** `--shadow-card: 0 4px 20px rgb(26 43 68 / 4%)`는
  어두운 배경에서 사실상 투명하다. M3 방식대로 **표면 톤 차이로 elevation을 표현**한다
  (카드 배경을 `--surface-container`로 올림). 그림자는 `rgb(0 0 0 / 40%)`로 강화하되 보조 역할.
- **`--glass-fill: rgb(255 255 255 / 85%)`** — `BottomNav`·`StepActions`의 backdrop-filter 배경이
  다크에서 **흰 판**이 된다. `rgb(29 32 33 / 85%)`로 교체.
- **`layout.tsx`의 dark `themeColor: "#0a0a0a"`는 팔레트에 없는 값**이다.
  다크 `--surface`인 `#101415`로 교체해 브라우저 UI와 페이지 배경을 일치시킨다.
- **`color-scheme: dark` 선언 필수.** 없으면 스크롤바·`<input type="date">`·셀렉트 같은
  **네이티브 위젯이 라이트로 남아** 화면에서 튄다. `:root { color-scheme: light dark }`.
- **별칭 토큰 4개**(`--background`·`--foreground`·`--muted`·`--border`)도 dark 블록에서 다시 정의한다.
  기존 화면 상당수가 이 별칭을 쓰므로 빠뜨리면 그 화면만 라이트로 남는다.

#### 구현 형태

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* 위 표의 값 전체 + 새로 계산한 값 + 별칭 4개 + glass/shadow */
  }
}
```

- **`:root` 안의 토큰만 재정의**하고 컴포넌트 CSS는 건드리지 않는다.
  컴포넌트가 전부 `var(--x)`를 쓰고 있으므로 이것만으로 전 화면이 전환된다.
  → 컴포넌트 CSS에 hex가 하드코딩된 곳이 있으면 **거기만 다크에서 깨진다.**
  R-Step 6에서 `#` 리터럴을 grep해 전수 확인한다(`globals.css` 제외).
- 수동 토글(라이트/다크 강제)은 **이번 범위 밖** — OS 설정만 따른다.

### 안전 영역·가로모드 (R5, R6)

```ts
// layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ← 이게 없으면 env(safe-area-inset-*)가 전부 0이다
  themeColor: "#f8f9fa", // Q-R2 = A 이면 단일 값으로 (dark 항목 제거)
};
```

가로 노치 대응 — 고정 요소의 좌우에도 inset을 넣는다:

```css
.nav {
  padding-left: max(8px, env(safe-area-inset-left, 0px));
  padding-right: max(8px, env(safe-area-inset-right, 0px));
}
```

모바일 가로모드(R6) — 높이가 짧을 때 사진 비율을 낮춘다:

```css
@media (orientation: landscape) and (max-height: 500px) {
  .photo {
    aspect-ratio: 16 / 9;
  }
}
```

### 터치 타깃 (R7)

- 탭 가능한 모든 요소의 **최소 히트 영역 44×44px**를 보장한다.
- 시각적 크기를 키우고 싶지 않으면 패딩 대신 의사요소로 히트 영역만 넓힌다:

```css
.subtle {
  position: relative;
  min-height: 44px; /* 우선 이것부터 */
}
```

---

## 변경 대상 파일

| 파일 경로                                            | 작업 요약                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`                                | 브레이크포인트 주석표 + 유동 타이포·셸 치수 토큰 + **`prefers-color-scheme: dark` 블록**(R-Step 6) |
| `src/app/layout.tsx`                                 | `viewportFit: "cover"`, `themeColor` → 다크 `--surface`(`#101415`), `AppShell` 도입                |
| `src/app/(home)/components/ScanCard.module.css`      | **hex 하드코딩 `#ffffff` 1건 제거**(L85) → `--surface-container-lowest`                            |
| `src/components/nav/tabs.ts`                         | **신규** — `TABS` + `IMMERSIVE` 단일 출처                                                          |
| `src/components/nav/SideNav.tsx`                     | **신규** — `lg` 이상 좌측 네비 (+ `.module.css`)                                                   |
| `src/components/AppShell/AppShell.tsx`               | **신규** — 사이드바 + 본문 그리드 셸 (+ `.module.css`)                                             |
| `src/components/BottomNav/BottomNav.tsx`             | `tabs.ts` 사용으로 변경                                                                            |
| `src/components/BottomNav/BottomNav.module.css`      | 숨김 기준 `768px` → `1024px`, 좌우 safe-area 추가                                                  |
| `src/components/TopAppBar/TopAppBar.module.css`      | 높이를 `--header-h`로 고정                                                                         |
| `src/app/(home)/page.module.css`                     | `span` 정책 md/lg 분리, 셀에 `container-type`                                                      |
| `src/app/{routine,scan,profile}/page.module.css`     | 매직 넘버 → `--page-pt`/`--page-pb`/`--page-inline`                                                |
| `src/app/routine/[routineId]/[step]/page.module.css` | 위 + 가로모드 `aspect-ratio` 대응                                                                  |
| `src/app/routine/components/StepActions.module.css`  | `.subtle` 최소 44px                                                                                |
| `src/app/scan/components/PageHeader.module.css`      | 높이를 `--header-h`로 통일 (현재만 96px 여백)                                                      |

---

## 구현 순서

메인 plan의 Step에 끼워 넣는다. **R1·R5는 Step 3보다 먼저** 해야 신규 화면이 결함을 복제하지 않는다.

- **R-Step 1 (Step 1과 병행 가능)** — `globals.css` 토큰 추가 + `layout.tsx`의 `viewportFit`·`themeColor`.
  _순수 추가라 기존 화면에 영향이 거의 없다. R5·R8·R3의 기반._
- **R-Step 2 (Step 3 이전 필수)** — `tabs.ts` 분리 → `SideNav` + `AppShell` → `BottomNav` 기준 1024px로.
  _R1 해결. 이후 만드는 모든 화면이 자동으로 네비게이션을 얻는다._
- **R-Step 3** — 기존 4개 페이지의 매직 넘버를 셸 토큰으로 교체. _R4 해결._
- **R-Step 4** — 홈·수행 화면 `span` 정책 분리 + `container-type` 도입. _R2·R9 해결._
- **R-Step 5** — 가로모드·터치 타깃·320px 다듬기. _R6·R7·R10._
- **R-Step 6** — 다크 팔레트(Q-R2). `globals.css`에 `prefers-color-scheme: dark` 블록,
  `color-scheme` 선언, `themeColor` 교체, glass/shadow 대응.
  **선행**: 컴포넌트 CSS의 hex 하드코딩을 grep해 전수 제거(`globals.css` 제외) — 남아 있으면
  그 화면만 다크에서 깨진다. _R8 해결._

R-Step 3은 **동작 보존 리팩토링**이므로 마친 뒤 `refactor-equivalence-check` 스킬을 적용한다
(특히 2단계 CSS 클래스 집합 diff — `styles.없는클래스`는 `tsc`를 통과하고 런타임에 조용히 사라진다).

---

## 검증

`npm run check` · `npm run build` 통과는 기본. 그 외 **반응형 전용 체크리스트**:

### 뷰포트 매트릭스 (DevTools Device Toolbar)

| 폭       | 기기 예시         | 확인 항목                                                    |
| -------- | ----------------- | ------------------------------------------------------------ |
| `320px`  | iPhone SE (1세대) | 가로 스크롤 0, 프로필 선반 2열이 뭉개지지 않는지 (R10)       |
| `390px`  | iPhone 14         | 기준 화면. 탭바가 홈 인디케이터를 피하는지 (R5)              |
| `768px`  | iPad 세로         | **네비게이션이 보이는지 (R1)**, 홈 `.narrow`가 읽히는지 (R2) |
| `1024px` | iPad 가로         | 사이드바 등장, 하단 탭바 사라짐, 둘이 겹치지 않는지          |
| `1440px` | 노트북            | `--container-max` 도달, 좌우 여백이 과하지 않은지            |
| `1920px` | 데스크톱          | 콘텐츠가 중앙 정렬되고 늘어지지 않는지                       |

### 그 외

- **가로모드**: 390×844를 눕혀 844×390에서 `/routine/am/1` — 사진이 화면을 넘지 않는지 (R6).
- **확대**: 브라우저 200% 확대에서 레이아웃이 깨지지 않는지 (WCAG 1.4.4).
  `clamp()`의 `vw` 항은 확대에 반응하지 않으므로 **최소값이 읽을 만한지**가 관건이다.
- **터치 타깃**: 모든 탭 가능 요소 44×44 이상 (R7). DevTools에서 요소 박스로 확인.
- **`prefers-reduced-motion`**: DevTools > Rendering에서 강제하고 애니메이션이 멈추는지.
- **다크 모드**: DevTools > Rendering > `prefers-color-scheme: dark` 강제 후 —
  ① 전 화면에 흰 판이 남지 않는지(특히 `BottomNav`·`StepActions`의 backdrop-filter),
  ② 스크롤바·네이티브 위젯이 다크인지(`color-scheme` 확인),
  ③ 카드 경계가 구분되는지(그림자가 안 보이므로 표면 톤 차이로 살아야 한다),
  ④ 브라우저 상단 UI 색이 페이지 배경과 일치하는지(`themeColor`).
- **hex 하드코딩 0 검증** — `globals.css`를 제외한 CSS에 `#` 리터럴이 남아 있으면 다크에서 깨진다:
  ```bash
  grep -rn "#[0-9a-fA-F]\{3,8\}\b" src --include=*.module.css
  ```
- **safe-area 실측**: `viewport-fit=cover` 적용 후 실기기 또는 시뮬레이터에서 확인.
  **DevTools 에뮬레이션으로는 검증되지 않는다** — `env()`가 0으로 남는다.
- **키보드 네비게이션**: 사이드바 도입 후 Tab 순서가 논리적인지, 포커스 링이 보이는지.
- **가로 스크롤 0 검증** — 모든 폭에서:
  ```js
  document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  ```

---

## 비범위 (Out of Scope)

- **다크 모드 수동 토글** — OS 설정(`prefers-color-scheme`)만 따른다.
  앱 내 라이트/다크 강제 스위치는 상태 저장·SSR 깜빡임 대응이 따로 필요해 이번 범위 밖이다.
  (팔레트 자체는 Q-R2에서 **제작으로 확정**됐다 — R-Step 6.)
- **PWA / 홈 화면 추가** — 별도 작업.
- **프린트 스타일시트** — 이 앱의 사용 맥락에 없다.
- **RTL(우→좌) 지원** — 한국어 전용 앱이다. 단, 신규 CSS는 `padding-inline` 같은
  **논리 속성을 우선 사용**해 나중에 열어둔다(비용이 0이다).
- **컨테이너 쿼리 폴백** — 대상 브라우저가 모두 지원한다(Chrome 105+, Safari 16+).
  구형 지원이 요구되면 그때 재검토.

---

## 진행 상태

- [x] Q-R1 결정 — **좌측 사이드바** (2026-08-18)
- [x] Q-R2 결정 — **다크 팔레트 제작** (2026-08-18)
- [x] R-Step 1 — 완료 2026-08-18. 커밋 `1a840ab`. 유동 타이포(clamp) + 셸 치수 토큰 +
      `viewportFit: "cover"` + `themeColor` 단일화 + `color-scheme: light`.
      **브라우저 실측**: `font` 단축 속성 안의 `clamp()` 파싱 확인(실패 시 전체 타이포가
      조용히 죽는 지점). 1440px에서 48/32/24/18px → 320px에서 32/24/20/16px 축소.
      `--page-pb`가 `calc(76px + 0px + 24px)`로 `env()` 폴백 동작. _R3·R5·R8 기반 완료._
- [x] R-Step 2 — 완료 2026-08-18. 커밋 `8d8f373`. **R1 해결.**
      `tabs.ts`(단일 출처) + `SideNav`(lg 이상) + `AppShell` + BottomNav 숨김 기준 1024px로.
      `TopAppBar`·`PageHeader`에 `left: var(--sidebar-w)` 추가 — `position:fixed`라
      `AppShell`의 padding이 안 먹어 사이드바에 가려졌다.
      **브라우저 실측**: 900px에서 네비 복구(예전 이동 불가 구간), 1440px에서 사이드바 240px·
      헤더/본문 x=240·겹침 0건·링크 48px, 몰입 화면 네비 0개.
      **구현 중 발견·수정**: 몰입 화면에서 사이드바가 없는데도 본문이 240px 밀리는 버그.
- [~] R-Step 3 — 매직 넘버 제거 — **4개 페이지 컨테이너 전부 완료.** 홈·루틴·스캔은
  메인 plan의 Step 3 커밋(`720c9d8`)에 묻어 들어갔고(그 커밋 메시지도 스스로 **"R-Step 3 _일부_"**
  라고 적었다), **profile은 2026-08-18에 별도로 마무리**했다.
  4개 다 루트 셀렉터는 `.main`이고 각 `page.tsx`의 최상위 `<main>`에 실제로 붙는다(대조 확인).

  **`profile`이 왜 따로 남았나** — `720c9d8`이 홈·루틴·스캔은 데스크톱 오버라이드까지 지웠는데
  profile만 `@media (min-width: 768px)` 안의 `.main { padding: 96px var(--margin-desktop) 40px }`를
  남겼다. 루트는 토큰인데 768px부터 매직넘버가 덮는 구조라, **토큰 작업이 데스크톱에서만 무효**였다.

  | 구간       | pt (토큰 88 vs 오버라이드 96) | inline (`clamp` vs 40px) | pb (토큰 100 vs 40)                  |
  | ---------- | ----------------------------- | ------------------------ | ------------------------------------ |
  | 768–1023px | +8px                          | +9.28px (4vw=30.72px)    | **−60px ← 위험 구간이었다**          |
  | ≥1024px    | +8px                          | 일치 (clamp 상한 도달)   | 일치 (`--page-pb`가 40px로 재정의됨) |

  −60px가 핵심이었다. R-Step 2에서 `BottomNav` 숨김 기준을 768px→**1024px**로 올렸으므로
  768–1023px에서 탭바는 여전히 `position: fixed`로 떠 있는데, 탭바 회피용 `--page-pb`(100px)가
  **정확히 탭바가 살아 있는 구간에서만 40px로 죽고 있었다.**

  **✅ 해결 + 브라우저 실측 검증(2026-08-18)** — 오버라이드 3줄을 삭제하고 사유 주석으로 대체.
  같은 블록의 `.sectionTitle`·`.profileGrid`·`.shelfGrid`는 정당한 데스크톱 레이아웃이라 유지.
  `/profile`과 대조군 `/`(home)을 4개 폭에서 실측한 결과 **두 페이지가 완전히 일치**한다:

  | 폭   | padding (t/r/b/l)        | BottomNav | 하단 여유(nav.top − 콘텐츠.bottom) | 상단 여유 | 가로 스크롤 |
  | ---- | ------------------------ | --------- | ---------------------------------- | --------- | ----------- |
  | 768  | 88 / 30.72 / 100 / 30.72 | 보임      | **+12.34px** (home +11.98)         | +16px     | 없음        |
  | 1023 | 88 / 40 / 100 / 40       | 보임      | **+11.59px** (home +12.20)         | +16px     | 없음        |
  | 1024 | 88 / 40 / 40 / 40        | 숨김      | 해당없음 (SideNav 240px 등장)      | +16px     | 없음        |
  | 1440 | 88 / 40 / 40 / 40        | 숨김      | 해당없음                           | +16px     | 없음        |

  **겹침 0건.** 맨 아래까지 스크롤한 상태에서 쟀다. 기대값(pt 88 전 구간, pb 100/40, inline clamp)과
  8개 측정 전부 일치.

  > 📌 측정 함정 기록 — `BottomNav`와 `SideNav`가 **`aria-label="주요 메뉴"`를 공유**한다.
  > `querySelector('nav[aria-label="주요 메뉴"]')`는 DOM 순서상 `SideNav`를 먼저 잡아
  > 768px에서 "탭바 숨김"으로 **오측정된다.** 클래스명으로 특정해야 한다.
  > _접근성 결함은 아니다_ — 양쪽 다 `display: none`으로 숨기므로 어느 폭에서든
  > 접근성 트리에 노출되는 `<nav>`는 항상 하나뿐이다(확인함).

  **남은 2줄 — 수행 화면뿐이다** (전수 grep: padding·margin·인라인 style·신규 화면 4방향 조사, 그 외 없음):
  `routine/[routineId]/[step]/page.module.css`의 `:8`(`8px … 180px`)과 `:119`(데스크톱 짝).
  이 화면은 **애초에 셸 토큰을 채택한 적이 없고**, 회피 대상도 탭바가 아니라 `StepActions`라
  단순 치환이 불가능하다 — 아래 "R4 매직 넘버" 항목 참조. 그래서 이 Step은 `[~]`로 둔다.

  **범위 밖이지만 같이 봐야 하는 것** — `@deprecated`로 표시한 `--margin-mobile`/`--margin-desktop`을
  **고정 헤더·푸터가 8줄** 쓴다: `TopAppBar` 2(`:14`,`:67`) · `PageHeader` 2(`:13`,`:42`) ·
  `RunHeader` 2(`:8`,`:78`) · `StepActions` 2(`:7`,`:88`).
  _(이 문서는 한때 "6줄"이라 적었으나 나열은 2+2+2+2였다 — 실측 8줄이 맞다. `StepActions:88`은
  `padding-inline` 축약형이라 `padding:` grep에서 빠진다.)_
  이들은 페이지 컨테이너가 아니라 자체 좌우 여백이라 R-Step 3의 `--page-pt`/`--page-pb` 대상이 아니다.
  `--page-inline`으로 옮길지는 R-Step 4에서 그리드와 함께 판단한다.

- [ ] R-Step 4 — 그리드·컨테이너 쿼리 — ~~home만~~ **home + `routine/[routineId]/[step]`**
- [ ] R-Step 5 — 320px + 가로모드(R6) + 터치타깃(R7 `.subtle`, R7 `.back`) — **전체 해제**
- [ ] R-Step 6 — 다크 팔레트 (globals.css 중심이라 경계 영향 없음)

### ~~루틴 담당자에게 전달할 것~~ → 위임 해제(2026-08-18)로 내 작업이 됨

아래 3건은 R-Step 3·5에 흡수됐다. 경로는 `[slot]` → `[routineId]`로 읽는다.

- **R6 가로모드** — `routine/[slot]/[step]/page.module.css`의 `.photo { aspect-ratio: 4/5 }`가
  모바일 가로에서 화면 높이를 넘는다. `@media (orientation: landscape) and (max-height: 500px)`에서 `16/9`로.
- **R7 터치 타깃** — `StepActions.module.css`의 `.subtle`(이전/건너뛰기)이 **24px**다.
  부모 `.secondary`가 `padding: 0 8px`로 수평뿐이고 아이콘도 16px이라 높이를 늘려줄 요소가 없다.
  `min-height: 44px` 추가로 해결. `.primary`는 이미 충분하니 건드릴 필요 없다.
- **R4 매직 넘버** — ~~`routine/page.module.css`(`88px…120px`)와~~ **완료(`720c9d8`)**.
  `routine/[routineId]/[step]/page.module.css`(`8px…180px`, L8·L119)만 남았다.

  ⚠️ **`--page-pb`를 그대로 쓰면 안 된다** (2026-08-18 적대 검증 CONFIRMED). 이 화면은
  탭바가 아니라 **`StepActions` 고정 액션바**를 피한다. 근거:
  - `--page-pb`의 유일한 가변 입력은 `--nav-h`(76px, BottomNav 전용)다. 액션바 높이는 개입하지 않는다.
  - 이 라우트는 `IMMERSIVE_PATH`에 걸려 **BottomNav가 `null`을 반환**한다(`BottomNav.tsx:15`).
    즉 회피 대상이 아예 다른 요소다.
  - `StepActions`는 `position: fixed`이고 `.primary`+`.secondary` 두 줄이 **항상** 렌더된다
    → 실측 **≈129px + safe-area**. 반면 `--page-pb`는 `<1024px`에서 100px, **`≥1024px`에서 40px**.
  - 부족분: `<1024px` **약 29px**, `≥1024px` **약 89px**. 액션바는 브레이크포인트와 무관하게
    항상 떠 있으므로 **넓은 화면일수록 더 많이 가린다.**

  → `globals.css`에 `--step-actions-h`(≈132–136px)를 신설하고
  `calc(var(--step-actions-h) + env(safe-area-inset-bottom, 0px) + 24px)`로 구성한다.
  **`--page-pb`의 1024px 축소 규칙(사이드바 전환용)을 여기 적용하지 말 것.**
  _현재 하드코딩 180px는 필요치 129–163px에 17–51px 여유를 둔 값이라, 지금 당장 깨져 있진 않다._
  _단 `.primary` 라벨이 2줄로 접히는 경우는 계산에 없다 — 확정 전 `browser-prober`로 실측할 것._

- **R5 꼬리 — `env()` 폴백 누락 2건 → ✅ 수정 완료(2026-08-18).** `globals.css:136-137`이 스스로
  _"env() 폴백 0px을 반드시 넣는다. 없으면 미지원 브라우저에서 `calc()` 전체가 무효가 되어
  여백이 통째로 사라진다"_ 라고 적어 뒀는데, **정작 컴포넌트 2곳이 그 규칙을 어기고 있다:**

  | 파일                                        | 줄   | 현재                                       |
  | ------------------------------------------- | ---- | ------------------------------------------ |
  | `routine/components/StepActions.module.css` | `7`  | `calc(16px + env(safe-area-inset-bottom))` |
  | `components/BottomNav/BottomNav.module.css` | `10` | `calc(24px + env(safe-area-inset-bottom))` |

  둘 다 R-Step 1 이전부터 있던 파일이라 토큰 작업 때 함께 고쳐지지 않았다.
  `CameraCapture`·`SideNav`(신규)와 `--page-pb`는 폴백이 들어가 있었다.
  → **`, 0px` 추가로 해결.** 지원 브라우저에서는 계산값이 동일하므로 **시각적 변화 0**이고,
  미지원 브라우저에서만 여백이 살아난다. 재발 방지로 두 파일에 사유 주석을 남겼다.
