# 성분 지식 계층 — 시너지·충돌·타입별 주의 + AI 결과 영속 캐시

> 사용자 지시(2026-08-20) 요지: 이 앱의 궁극 가치는 루틴 수행만이 아니다.
> **"인터넷으로 오랫동안 검색하고 공부해야 할 내용을 이 앱을 통해서 한 번에"** —
> 내 화장대 제품끼리의 시너지·충돌, 피부 타입별 주의 성분, 고민별 유효 성분,
> 그리고 그 성분들의 주의점·상호작용까지.

## Context

### 왜 지금 하는가

1. **비용 문제가 실재한다.** "내 고민" 성분 추천(`POST /api/ai/concern`)은 서버 캐시가
   전혀 없다. 클라이언트 SWR 캐시는 메모리뿐이라 **새로고침만 해도 같은 고민에
   10~30초짜리 AI 호출(＝`claude -p` 프로세스＝구독 차감)이 다시 나간다.**
2. 홈 성분알림은 오해와 달리 **이미 DB 에 저장된다**(`products.warnings`, 지연 생성).
   재방문 시 AI 호출이 없다. 남은 구멍은 ① AI 가 빈 배열을 줬거나 실패한 제품이
   `undefined` 로 남아 **홈 재방문마다 재시도**되는 것, ② `/products` SWR 재검증의
   로딩 표시가 "새로 불러오는 느낌"을 주는 것 둘이다.
3. **리포트가 보여줄 수 있는 지식이 절반이다.** 지금은 제품별 단독 사용 주의만 있다
   (프롬프트 규칙 5 가 "단독 사용 기준"을 명시). 제품 **간** 상호작용 — 레티놀×비타민C
   같은 충돌, 나이아신아마이드×레티놀 같은 시너지 — 과 피부 타입별 관점이 없다.

### 확인된 사실 (2026-08-20 조사, 파일:줄 근거는 조사 워크플로 기록)

- 새 AI 엔드포인트가 따를 계약 골격은 `/api/ai/concern` 에 이미 있다:
  가드(429)·본문 상한(413)·`narrowXxx` 런타임 좁히기·**빈 배열=정상 응답**·상세는 로그만.
- 프롬프트는 stdin 으로 넘어간다(argv 상한 회피). 제품 20×성분 30 = 약 27KB — 문제없다.
- `products.ingredients` 는 JSON(string[]). `updated_at` 은 `ON UPDATE CURRENT_TIMESTAMP` 라
  warnings 저장·이미지 채우기에도 갱신된다 → **지문(fingerprint)에 쓰면 과잉 무효화**.
  역방향 결함도 있다(refuter 검증 2026-08-20): 기존 카탈로그 제품을 선반에 담고 빼는 것은
  `products` 행을 안 건드려 `updated_at` 지문으로는 **변화를 감지하지 못한다(과소 무효화)**.
  정확한 지문 = 정렬된 `(product_id, ingredients)` 쌍의 SHA-256.
  ⚠️ `popular`·`by-ingredient` 라우트는 `updated_at` 을 정렬 키로 쓴다 — 별개 용도이므로
  지문을 도입해도 그쪽은 건드리지 않는다.
- `skin_profiles` 에 피부 타입 컬럼은 없다(wonder·usable_morning/evening 뿐).
- "지연 생성 JSON NULL 컬럼" 선례: `products.warnings`(001:41). 마이그레이션 규칙:
  번호 파일 추가만, DROP 금지, `schema_migrations` 기록(002 가 ALTER 템플릿).
- 리포트의 성분명 표시는 warnings **문장에서 문자열 포함으로 역추적**(취약) —
  새 기능의 구조화 출력이 이걸 대체할 수 있다.
- DESIGN.md 에 **탭/세그먼트 규정은 없다.** 코드베이스 선례는 ScanTabs 의
  "투명 배경 + `--primary` 밑줄"(채움 알약은 하단 내비 전용이라는 근거 주석 포함).
- DESIGN.md 칩 규정: "pill-shaped, Warm Sand 20% + Deep Navy text" — **성분 마커 용도**.
  현재 칩 4종 구현이 전부 제각각이고 스펙 일치가 0건이다(감사 결과).

## 결정 필요 사항

### Q1. "고민 → 성분" 결과를 어디에 영속 캐시하나

- **A. `skin_profiles.concern_ingredients JSON NULL` 컬럼 (추천)**
  - 화면이 쓰는 키가 프로필의 wonder 하나뿐이고, 사용자당 1행이라 구조가 정확히 맞는다.
  - `PUT /api/profile` 에서 wonder 가 바뀌면 NULL 로 리셋 → **무효화가 공짜**.
  - `products.warnings` 의 "지연 생성 JSON NULL" 선례 그대로.
  - 단점: wonder 를 A→B→A 로 되돌리면 재생성(히스토리 캐시 없음). 자유 텍스트라 드묾.
- B. 별도 테이블 `concern_results(user_id, wonder_hash PK, …)`
  - 되돌림에도 캐시 히트. 대신 테이블·정리(row 증식) 관리가 생긴다. 지금은 과설계.
- C. localStorage
  - 서버 저장소로 이전한 방향(2026-08-18 결정)과 역행. 기기 간 공유 안 됨. 비추천.
- 추천: **A**. 보완으로 클라이언트 `AI_SWR_OPTIONS` 는 유지(이중 절약).

### Q2. 선반 분석(시너지·충돌·타입별 주의·추가 추천)의 생성·캐시 단위

- **A. 선반 스냅샷 1회 호출 + `shelf_reports` 테이블 (추천)**
  - 입력: 선반 전체(이름·카테고리·성분). AI 가 조합을 한 번에 본다.
  - 캐시 키: 위 지문. **선반이 안 바뀌면 0원·0초, 바뀌면 1회 재생성.**
  - `shelf_reports(user_id PK, fingerprint CHAR(64), result JSON, created_at)` —
    사용자당 최신 1건. 명명은 기존 관례(복수형 snake_case).
  - 서버가 선반을 직접 읽는다(클라이언트 body 아님) — 지문 계산과 한 곳에서 일관.
- B. 성분 쌍 단위 공유 지식 테이블(`ingredient_pairs`)
  - 이상적인 최종형이지만 조합 관리·정합성 부담. A 의 결과가 쌓인 뒤 추출하는 편이 싸다.
- 추천: **A** (B 는 후속 과제로 명시).

### Q3. "피부 타입별 주의"의 타입을 어떻게 얻나

- **A. AI 가 4타입(건성·지성·복합성·민감성) 전부 생성, 화면에서 타입별 그룹 표시 (추천)**
  - 스키마·프로필 UI 변경 없음. 지금 프로필에는 피부 타입이 없다.
  - 모든 사용자에게 유효하고, 결과가 선반 지문 캐시에 함께 실린다.
- B. 프로필에 피부 타입 필드 추가(003 마이그레이션 + 선택 UI) 후 그 타입만 생성
  - 화면은 좁아지지만 마이그레이션·프로필 UI·"모름" 처리까지 범위가 커진다.
- 추천: **A 먼저**, B 는 나중에 얹으면 "내 타입 강조"로 자연 확장된다.

### Q4. 리포트 하위 탭 구성과 스타일

- 구성(사용자 지정 반영): **[종합] [피부 타입별] [시너지·궁합]** 3탭.
  - 종합 = 현행(자주 쓰는 성분 + 제품별 주의).
  - 피부 타입별 = 타입 4그룹 × 주의 성분·이유.
  - 시너지·궁합 = ① 충돌 쌍(어떤 제품의 어떤 성분끼리·왜) ② 시너지 쌍 ③ **"이런 성분이
    추가되면 좋겠다"** 제안 → 누르면 기존 성분→제품 추천(`IngredientProducts`)으로 연결
    (막다른 길 금지 원칙).
- 스타일: DESIGN.md 에 탭 규정이 없으므로 **ScanTabs 선례(투명 배경+밑줄)** 를 따른다.
  성분 이름 표시는 DESIGN.md 칩 스펙(pill·Warm Sand 20%·Deep Navy)을 **이번에 처음
  스펙대로 구현**하고, 기존 칩 4종 통일은 별도 백로그로 뺀다(범위 폭발 방지).
- 추천: 위 그대로. 이견 있으면 탭 이름·구성만 알려 주면 된다.

### Q5. DESIGN.md 위반(감사에서 발견)을 이번에 어디까지 고치나

감사 결과: 높음 1(다크에서 DataState 재시도 버튼 호버 시 글자 안 보임) ·
보통 6(칩 불일치, 임의 font-size 15곳, 그림자 하드코딩 2, 모달 radius/패딩, 루틴 카드
아이콘·진행바 미구현) · 낮음 다수.

- **추천: 이번 계획에는 "높음 1건 + 새 UI 가 닿는 것(새 칩을 스펙대로)"만 포함.**
  나머지는 `docs/plans/2026-08-20-ingredient-knowledge/design-debt.md` 로 목록화해
  별도 정리(한 번에 섞으면 리뷰 불가능한 커밋이 된다).

## 결정 확정 (2026-08-20)

| 질문              | 확정                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------- |
| Q1 캐시 위치      | **A — DB 컬럼** (`skin_profiles.concern_ingredients JSON NULL`) + 클라이언트 SWR 유지   |
| Q2 선반 분석 단위 | **A — 선반 스냅샷 + `shelf_reports` 지문 캐시** (대안 없음으로 세션 확정)               |
| Q3 피부 타입      | **A — 4타입 전부 생성** (프로필 필드는 후속 확장)                                       |
| Q4 하위 탭        | **[종합][피부 타입별][시너지·궁합] + ScanTabs 밑줄 패턴** (사용자 지정 반영, 세션 확정) |
| Q5 디자인 부채    | **백로그 분리** — 높음 1건만 이번에(완료), 나머지는 `design-debt.md`                    |

추가 확정(2026-08-20, 자리 비움 전 일괄):

| 항목          | 확정                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB 적용       | 003·004 를 터널로 **서버에 바로 적용** (추가만, 파괴 없음)                                                                                        |
| AI 실호출     | **필요한 만큼** (재검증 포함 약 10회 안팎 상한)                                                                                                   |
| 커밋          | **스텝마다 분할 커밋**, push 는 사용자가 직접                                                                                                     |
| 성분알림 구멍 | **이번에 같이 고침** — "주의 없음(빈 배열)"도 저장해 재시도를 1회로 끝냄. 단 기존 주의사항을 빈 배열로 덮는 것은 계속 거부(데이터 손실 가드 유지) |

## 변경 대상 파일

| 파일                                            | 작업 요약                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `db/migrations/003_concern_cache.sql`           | `skin_profiles.concern_ingredients JSON NULL` (Q1-A)                            |
| `db/migrations/004_shelf_reports.sql`           | `shelf_reports` 테이블 (Q2-A)                                                   |
| `src/app/api/ai/concern/route.ts`               | AI 호출 전 캐시 조회, 성공 후 저장                                              |
| `src/app/api/profile/route.ts`                  | wonder 변경 시 `concern_ingredients = NULL` 리셋                                |
| `src/lib/prompts/interactions.ts`               | 신규 — 시너지·충돌·타입별 주의·추가 추천 프롬프트(정본). warnings.ts 8규칙 골격 |
| `src/app/api/ai/report/route.ts`                | 신규 — 선반 서버측 읽기 → 지문 → 캐시 or AI → 저장. concern 골격                |
| `src/lib/shelfFingerprint.ts`                   | 신규 — 정렬 `(product_id, ingredients)` SHA-256                                 |
| `src/api/ai.ts`                                 | `fetchShelfReport` 래퍼(raw 반환)                                               |
| `src/lib/data.ts`                               | `useShelfReport`(AI_SWR_OPTIONS 계열)                                           |
| `src/app/scan/components/ReportSection.tsx`     | 하위 탭 3분할, 시너지·타입별 뷰                                                 |
| `src/app/scan/components/ReportTabs.*`          | 신규 — ScanTabs 패턴 하위 세그먼트                                              |
| `src/app/scan/components/IngredientChip.*`      | 신규 — DESIGN.md 칩 스펙 첫 구현                                                |
| `src/app/concern/components/ConcernSection.tsx` | 헤딩 "{wonder}에 도움이 되는 성분" (완료 2026-08-20)                            |
| `src/components/DataState/DataState.module.css` | 높음 위반 1건 수정(호버 색 짝)                                                  |
| `.env.example`                                  | 변경 없음(새 키 없음)                                                           |

## 구현 순서

- **Step 0** — 헤딩 문구 교체 + DataState 다크 호버 수정. _(계획서 커밋과 함께 완료)_
- **Step 1** — 003 마이그레이션 + concern 캐시 읽기/쓰기 + profile 리셋.
  검증: 같은 wonder 2회 호출 시 2회째가 즉시(수백 ms) 반환되는지, wonder 변경 후
  재생성되는지 API 직접 호출로 확인(AI 1회만 태움).
- **Step 2** — `interactions.ts` 프롬프트 + `/api/ai/report` + 004 + 지문.
  **`ai-contract-check` 필수**(새 프롬프트 = 새 계약). `ai-contract-prober` 로 실호출 검증.
- **Step 3** — 리포트 하위 탭 UI(ReportTabs·타입별·시너지 뷰·IngredientChip).
  로딩(수십 초 최초 생성)은 경과초 카운터, 캐시 히트는 즉시.
- **Step 4** — 시너지 탭의 추가 추천 성분 → `IngredientProducts` 연결.
- **Step 5** — `design-debt.md` 작성(감사 결과 옮김, 이번에 안 고친 것 명시).

## 검증

- `npm run check` + `npm run build` (신규 라우트 → `next typegen` 선행 필수)
- `ai-contract-check`: `interactions.ts` 출력 스키마 ↔ 라우트 좁히기 ↔ 화면 타입 대조
- `ai-contract-prober`: `/api/ai/report` 실호출 — 빈 선반(400인지 빈 결과인지 계약 확정),
  1제품(쌍 없음 → 빈 배열 정상), 다제품(쌍 생성) 3조합 병렬
- 캐시 동작: 선반 불변 재호출 → AI 미호출(응답 시간으로 판정), 제품 추가/삭제 → 재생성
- `browser-prober`: 리포트 3탭 390px/768px, 하위 탭이 상단 ScanTabs·하단 BottomNav 와
  시각적으로 3층 겹치는 문제가 없는지 실측
- DB 정지 상태에서 에러 문구(+서버 메시지) 표시 — 빈 상태로 위장되면 실패

## 비범위 (Out of Scope)

- **성분 사전 단독 화면**(성분 하나를 어디서든 눌러 상세 보기) — 이번엔 리포트·고민 탭
  안의 문맥 표시까지만. 다음 단계 후보.
- 피부 타입 프로필 필드(Q3-B), 성분 쌍 공유 지식 테이블(Q2-B) — 후속 확장으로 명시.
- DESIGN.md 보통·낮음 위반 일괄 정리 — `design-debt.md` 백로그로 분리.
- 의학적 진단·처방 — 기존 원칙 유지. 새 프롬프트에도 진단 금지 규칙 + 화면 고지 문구.

## 진행 상태

- [x] 조사 — 완료 2026-08-20. 워크플로 2기(DESIGN.md 감사 · 데이터 근거) + refuter 3기
      (핵심 단정 검증). 오케스트레이션 실동작 확인을 겸했다.
- [x] Step 0 — 완료 2026-08-20. 헤딩 wonder 삽입 + DataState 다크 호버 수정.
- [ ] Step 1 부터 5 — Q1 부터 Q5 확정 대기.
