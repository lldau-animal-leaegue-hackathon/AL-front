# 스킨케어 코어 플로우 구현 — 제품 등록 · 루틴 생성 · 루틴 수행 · 기록

> 📌 **설계 문서(2026-08-18)** — 노션 기획서를 코드에 반영하기 위한 전체 설계.
> **Q1–Q10 전부 확정됐다(2026-08-18). 미결 없음 — Step 0부터 끝까지 착수 가능하다.**
> 확정 내용은 [결정 확정](#결정-확정-2026-08-18) 참조.
>
> 📐 **반응형 설계는 [responsive.md](./responsive.md)로 분리했다.**
> 실측 결과 **데스크톱에 4방향 네비게이션이 없다(R1).** Step 3에 들어가기 전에 먼저 고쳐야
> 신규 화면이 같은 결함을 복제하지 않는다.
>
> ~~🚧 작업 경계(2026-08-18) — 루틴 도메인은 다른 팀원이 담당한다.~~
> **해제(2026-08-18): 사용자가 루틴을 위임받았다.** `feature/routine`(`db9eaed`)을 main·taeyeop에
> 머지 완료. 루틴 포함 전 범위 작업 가능. **Step 5·6·7 보류 해제.**
> 재검토 결과는 [머지 재검토](#머지-재검토-db9eaed-2026-08-18) 절 참조 — **라우트·데이터 모델이 바뀌었다.**

## Context

노션 기획서(스킨케어 루틴 앱)를 코드에 반영해야 한다. 현재 레포는 **UI 껍데기는 상당히 완성돼 있으나
AI 호출이 단 한 줄도 없고, 모든 데이터가 하드코딩 시드 상수**다. 기획의 본질인
"AI가 성분을 추출하고 → 루틴을 생성하고 → 단계별로 안내한다"가 통째로 비어 있다.

### 현재 코드 실측 (2026-08-18, `e8568a9` 기준)

| 라우트                                         | 상태                                                                                     | 데이터 출처                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `/` (home)                                     | TopAppBar + RoutineStarter + SkinHealthCard + ScanCard + NextStepCard + IngredientAlerts | 전부 `page.tsx` 내 하드코딩 상수                  |
| `/scan`                                        | PageHeader + ProductSearch + ScannerCta                                                  | `scan/products.ts` 시드 24종                      |
| `/routine`                                     | WeekStrip + RoutineCard 목록 _(db9eaed: AM/PM 토글 → 조건별 루틴 카드)_                  | `routine/routines.ts` 시드 — 루틴 5개 × 단계      |
| `/routine/[routineId]/[step]` _(db9eaed 개명)_ | RunHeader + StepTimer + 전문가팁 + HowToList + StepActions                               | 동일 시드, `generateStaticParams`로 정적 프리렌더 |
| `/profile`                                     | 피부 프로필 + AI 분석 리포트 + 내 선반                                                   | 전부 하드코딩 상수                                |
| `/testCamera`                                  | tesseract.js OCR                                                                         | —                                                 |

인프라는 이미 있다: [`src/api/client.ts`](../../../src/api/client.ts)(fetch 래퍼 + `ApiError`),
[`src/lib/env.ts`](../../../src/lib/env.ts)(`publicEnv`/`serverEnv` 분리),
[`src/components/BottomNav`](../../../src/components/BottomNav/BottomNav.tsx)(몰입 화면에서 탭바 숨김).

### ⚠️ 백엔드 도메인 불일치

`AGENTS.md`가 가리키는 백엔드 `animal-league-04-back`은
**계정/인증 · 점수(학교별 집계) · 상점 · 채팅 · 확성기 · SSE** 도메인이다.
스킨케어 제품·루틴·기록을 담을 테이블이 **없다.**

AGENTS.md의 해당 줄에 이미 `_이 목록은 백엔드 구조에서 유추한 것이다. 실제 기획과 다르면 이 줄을 고칠 것._`
이라고 적혀 있다. → **Step 0에서 AGENTS.md를 갱신한다.**

**스킬 대응 완료(2026-08-18)**: `backend-dto-check` → **`ai-contract-check`로 교체**했다.
이 프로젝트의 계약 원본은 백엔드 Java 클래스가 아니라 **프롬프트 출력 스키마**이고,
LLM은 계약을 보장하지 않으므로 런타임 검증까지 요구한다. 백엔드 실측 지식은 그 스킬의 부록에 보존했다.

### 기획서 ↔ 현재 데이터 모델 갭

`routines.ts`의 `RoutineStep`과 "스킨케어 루틴 작성" 프롬프트 출력이 **구조적으로 다르다.**
필드명만 바꾸면 되는 수준이 아니라 카디널리티(단수↔복수)가 어긋난다.

| 현재 `RoutineStep`         | 프롬프트 출력             | 갭                                                 |
| -------------------------- | ------------------------- | -------------------------------------------------- |
| `productName: string`      | `using_product: string[]` | **단수 → 복수.** 이중 세안 등 한 단계 2제품 대응   |
| `category: string`         | (없음)                    | `routine_name`이 단계명 역할을 겸함                |
| `ingredient: string`       | (없음)                    | 등록 제품에서 파생해야 함                          |
| `tip: string`              | `tips: string[]`          | 단수 → 복수                                        |
| `description: string`      | (없음)                    | 대응 필드 없음 — 제거                              |
| `expertTip: string`        | `tips: string[]`          | `tip`과 중복. 하나로 합침                          |
| `howTo: readonly string[]` | `how_to_use`              | Q5에서 프롬프트를 `string[]`로 수정 확정 → 갭 해소 |
| `minutes` + `timerSeconds` | `estimated_time: int`(초) | **이원화 → 단일.** 초로 통일, 분은 파생            |
| `icon: string`             | (없음)                    | 단계명 → 아이콘 매핑 테이블 필요                   |
| (없음)                     | `warning: string[]`       | **신규 UI 필요**                                   |

관련 문서: [clova-ocr plan](../2026-08-13-clova-ocr/README.md) — Q3 결정으로 **폐기 대상**.

---

## ~~작업 경계 (2026-08-18)~~ → 해제됨 + 머지 재검토

~~루틴 도메인은 다른 팀원이 담당한다. `src/app/routine/**` 를 건드리지 않는다.~~
**해제(2026-08-18): 사용자가 루틴을 위임받았고, 팀원의 `feature/routine` 브랜치를
main·taeyeop에 fast-forward 머지했다(`e8568a9` → `db9eaed`).** 전 범위 작업 가능.
(경계 절의 원문은 git 이력 `db9eaed` 이전 문서 참조 — 재논의 방지를 위해 취소선으로만 남긴다.)

## 머지 재검토 (db9eaed, 2026-08-18)

팀원 커밋 1개(`db9eaed feat: 여러 루틴 가능하게 수정`, 15파일 +864/−605)를 정독한 결과.
**이 절이 이하 본문의 낡은 서술을 덮어쓴다** — 본문과 어긋나면 이 절이 맞다.

### 무엇이 바뀌었나

| 변경                                                                                                 | 계획서 영향                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 라우트 `[slot]` → **`[routineId]`**                                                                  | "라우트는 am/pm 유지" 전제 **무효.** 수행 URL은 `/routine/daily-am/1` 형태                              |
| **`Routine` 래퍼 모델 신설** — `{ id, name, condition, time: "am"\|"pm", summary, steps }`           | 아래 "새 갭" 참조. `Slot` 단독 타입 대신 `Routine.time`이 am/pm을 담는다                                |
| `RoutineStep`은 **기존 모양 그대로** (productName 단수, tip+expertTip, minutes+timerSeconds)         | 기획서↔모델 갭 테이블 **여전히 유효**                                                                   |
| `IMMERSIVE` → `/^\/routine\/[^/]+\//` 로 일반화                                                      | 팀원이 이미 고쳤다. SideNav는 **이 새 정규식을** 공유하면 된다                                          |
| `RoutinePlanner`·`RoutineStepCard` 삭제 → **`RoutineCard`** 신설 (`<details>` 펼침, AM/PM 토글 제거) | 변경 대상 파일 표의 RoutinePlanner 행 무효                                                              |
| **생리 기간·주말 루틴이 시드로 등장** (`condition: "평소"/"생리 기간"/"주 1~2회"`)                   | 비범위였던 "생리 주기 루틴"이 **모델 차원에서 이미 존재**                                               |
| 홈 `RoutineStarter` 링크 → `/routine/daily-am/1` 하드코딩                                            | Step 9에서 저장된 루틴 기반으로 교체할 때 함께 처리                                                     |
| `presentation/SERVICE.md`·IR 덱 초안 추가                                                            | **서비스 정의 문서.** 네이버 API 폐기 근거를 독립적으로 재확인("신규 발급 막힘") — Q-ponytail 결정 강화 |

### ⭐ 새 갭 — 프롬프트는 1벌, 모델은 여러 벌

"스킨케어 루틴 작성" 프롬프트는 **아침/저녁 1벌**(`{ morning, evening }`)을 만들지만,
팀원 모델은 **조건별 여러 `Routine`**이다. Step 5 구현 시 매핑 규칙:

- 프롬프트 출력 1회 = `Routine` 2개 생성 — `{ time: "am" }` + `{ time: "pm" }`, `condition: "평소"`.
- `name`·`summary`는 LLM 출력에 없다 → 생성 입력(`wonder`)에서 파생하거나 고정 문구
  ("아침 루틴" 등). **LLM에 새 필드를 요구하지 않는다**(프롬프트 무수정).
- 생리 기간 등 조건 루틴은 **같은 프롬프트를 `wonder`에 조건을 붙여 재호출**하면 자연 확장된다.
  이번 범위에서는 구현하지 않고 모델만 호환되게 둔다.

### 검증 메모

- 머지 직후 기준 커밋: **`db9eaed`** (이하 본문의 `e8568a9` 라인 번호는 루틴 파일에 한해 밀렸을 수 있다).
- `generateStaticParams`는 여전히 시드 기반 정적 프리렌더 — Step 6에서 제거하는 계획 그대로 유효.
- `RoutineCard`의 완료 상태는 로컬 state(새로고침하면 풀림, 주석으로 명시됨) — Step 7에서
  `RoutineRun` 기록으로 교체하는 계획과 정확히 맞물린다.

---

## 결정 확정 (2026-08-18)

사용자 답변으로 확정된 사항. 재논의하지 않는다.

### Q1. 저장소 → **브라우저 localStorage**

`src/lib/storage/`를 인터페이스로 두고 localStorage 구현체를 넣는다. 백엔드가 생기면 구현체만 교체.

- 백엔드 담당자 블로킹 없이 전체 플로우가 즉시 돈다.
- ⚠️ localStorage는 **브라우저 전용**이다. 서버 컴포넌트에서 못 읽는다 → "서버/클라이언트 경계" 참조.

### Q2. AI 호출 → **서버의 헤드리스 Claude** (Claude API 직접 호출 안 함)

프론트는 **항상 같은 오리진 `/api/ai/*`(Next Route Handler)만 호출**한다.

```
클라이언트 컴포넌트
  → src/api/ai.ts (api.post 래퍼)
    → POST /api/ai/{ingredients,routine,warnings}   ← Next Route Handler (서버 전용)
      → src/lib/claude/runner.ts                     ← claude -p 프로세스 spawn
```

파일 기반 라우트가 `next.config.ts`의 `rewrites`보다 **먼저** 평가되므로
`BACKEND_ORIGIN`과 충돌하지 않는다([next.config.ts:56](../../../next.config.ts) 주석 참조).

### Q3. 이미지 처리 → **멀티모달 Claude** (별도 OCR 엔진 없음)

`tesseract.js` 제거, [clova-ocr plan](../2026-08-13-clova-ocr/README.md) 폐기.
CLOVA/GCP 콘솔 셋업 불필요. 곡면 용기 왜곡은 멀티모달 모델이 tesseract보다 훨씬 잘 견딘다
(clova-ocr plan이 지적한 실패 원인이 사라진다).

> ⚠️ **정정** — 초기 설계에서 "base64를 JSON body로 직결"로 적었으나, Q8에서 확정된
> WatchList 방식은 **base64를 넘기지 않는다.** 이미지를 **서버 임시 파일로 저장하고
> 프롬프트에 그 경로를 넣어 `--allowedTools Read`로 읽게** 한다. 아래 Q8 참조.

### Q4. 기존 검색 → **등록 폼 + 검색 병행**

`/scan`에 등록 폼을 추가하되 `ProductSearch`·`products.ts`를 유지한다.
검색으로 고른 제품도 **결국 등록 폼을 거쳐** AI 성분 추출을 태운다(검색 결과에 성분 정보가 없으므로).

### Q5. `how_to_use` → **프롬프트를 `string[]`로 수정**

노션 기획서의 "스킨케어 루틴 작성" 프롬프트 출력 스키마를 다음과 같이 고친다:

```diff
-  "how_to_use": string,   // 화장품 사용 방법
+  "how_to_use": string[], // 화장품 사용 방법 — 순서대로 수행할 단계별 문장
```

규칙 절에도 한 줄 추가한다: `how_to_use는 사용자가 순서대로 따라 할 수 있는 동작 단위로 나눠 배열로 작성하세요.`

- 기존 [`HowToList`](../../../src/app/routine/components/HowToList.tsx)(순서대로 체크하는 체크리스트)를 그대로 재사용.
- **노션 기획서도 함께 갱신해야 한다** — 코드와 기획서가 갈라지면 다음 세션이 혼란스럽다.

### Q6. 루틴 이미지 → **제품 썸네일 우선, 없으면 아이콘 폴백**

Q7에서 썸네일을 저장하기로 했으므로 실제 제품 사진을 쓸 수 있다.
`using_product[0]`에 해당하는 `Product.thumbnail`이 있으면 사진, 없으면 단계명 → 아이콘 매핑
(`src/lib/stepIcon.ts`). 현재 `/routine/[routineId]/[step]`이 이미 아이콘 방식이다.

### Q7. 제품 사진 → **썸네일만 localStorage에 저장**

- AI에는 **원본**을 보낸다(성분표 글씨를 읽어야 하므로 해상도가 곧 정확도).
- 저장은 **긴 변 256px, JPEG q=0.7 (~15KB)**. 100개 넣어도 1.5MB로 5MB 한계에 여유가 있다.
- 축소 로직은 [`/testCamera`의 canvas 코드](../../../src/app/testCamera/page.tsx)를 재사용해
  `src/lib/imageResize.ts`로 분리한다.

### Q8. 헤드리스 Claude 연동 → **`C:\Work\WatchList`의 `backend/claude_runner.py` 패턴을 이식**

WatchList 코드를 직접 읽어 확인한 실측 패턴이다. Python → TypeScript로 옮긴다.

**호출 형태** ([claude_runner.py:30](file:///C:/Work/WatchList/backend/claude_runner.py))

```
claude -p <프롬프트> --output-format json [--allowedTools Read] [--append-system-prompt <시스템>]
```

**핵심 규칙 5가지 — 전부 이유가 있으니 하나도 빠뜨리지 말 것:**

1. **구독 인증 강제** — 자식 프로세스 env에서 `ANTHROPIC_API_KEY` · `ANTHROPIC_AUTH_TOKEN`을
   **제거**한다. 키가 있으면 Claude가 구독보다 API 키를 우선해 **별도 종량 과금**된다.
   "Claude API는 쓰지 않는다"는 결정을 코드 차원에서 강제하는 장치다.
2. **이미지는 파일 경로 + `Read` 도구** — base64가 아니다.
   프롬프트에 `Read 도구로 다음 이미지 파일을 읽으세요: {path}`를 넣고 `--allowedTools Read`를 준다
   ([vision.py:8](file:///C:/Work/WatchList/backend/vision.py)).
3. **세션 트랜스크립트 삭제** — 호출 후 `~/.claude/projects/*/{session_id}.jsonl`을 지운다.
   `Read`로 읽힌 **이미지 사본이 트랜스크립트에 남기 때문**이다. 제품 사진에도 그대로 적용된다.
4. **응답 봉투(envelope) 처리** — `--output-format json`의 stdout은
   `{ session_id, is_error, result }`. `is_error`면 throw, `result`가 빈 문자열이어도 throw.
   실제 모델 응답은 `result` **문자열 안에** 들어 있다.
5. **JSON 추출은 방어적으로** — `result`에서 첫 `{`부터 마지막 `}`까지 잘라 파싱한다.
   프롬프트가 "코드블록 금지"라고 해도 모델은 종종 펜스를 붙인다
   ([claude_runner.py:65](file:///C:/Work/WatchList/backend/claude_runner.py)).

**환경** — `CLAUDE_BIN` env로 실행 파일 경로를 덮어쓸 수 있게 한다(WatchList와 동일).
이 머신에서는 `C:\Users\xoduq\.local\bin\claude.exe`로 확인됐다 — **진짜 `.exe`라
Node `execFile`을 `shell: false`로 안전하게 쓸 수 있다**(`.cmd` shim이었다면 Windows에서
셸이 필요해 인젝션 위험이 생겼을 것이다).

**TypeScript 이식 시 추가로 필요한 것 (Python엔 없던 문제):**

- Route Handler에 **`export const runtime = "nodejs"` 명시.** 자식 프로세스를 띄우므로 Edge 런타임 불가.
- **프롬프트는 argv 대신 stdin으로 넘긴다.** WatchList는 argv를 쓰지만(`-p <prompt>`),
  루틴 생성 프롬프트는 등록 제품 전체 목록을 포함해 훨씬 길다. Windows `CreateProcess`
  커맨드라인 상한이 32,767자라 제품이 늘면 터진다. `claude -p`는 stdin 입력을 받으므로
  프롬프트를 stdin에 쓰는 편이 안전하다. **Step 2에서 실측 확인할 것.**
- **임시 파일 정리** — `os.tmpdir()`에 이미지를 쓰고 `finally`에서 반드시 `unlink`.
- **동시 호출** — 요청마다 프로세스가 하나씩 뜬다. 해커톤 규모에선 문제없지만
  루틴 생성은 수십 초가 걸리므로 UI에 진행 표시가 필요하다.
- **타임아웃** — WatchList 기준: 이미지 인식 300초, 일반 600초. 성분 추출 300초, 루틴 생성 600초로 시작.

### Q9. 기존 목업 카드 → **전부 유지**

`SkinHealthCard` · `NextStepCard` · `IngredientAlerts` · 프로필 "AI 분석 리포트" · "피부 프로필"을
모두 남긴다. 다만 **유지 = 실데이터로 채운다**는 뜻이므로 각각의 데이터 출처를 정해야 한다:

| 컴포넌트                | 실데이터 출처                                                                |
| ----------------------- | ---------------------------------------------------------------------------- |
| `RoutineStarter`        | 현재 시각(이미 동작) + 저장된 루틴의 시간대별 슬롯                           |
| `ScanCard`              | 링크만 — 변경 없음                                                           |
| `NextStepCard`          | 진행 중 루틴의 다음 단계 — `src/lib/storage/history.ts`의 진행 상태에서 파생 |
| `IngredientAlerts`      | 등록 제품의 `warnings[]`(주의사항 프롬프트) + 루틴 step의 `warning[]`        |
| 프로필 "피부 프로필"    | 루틴 생성 입력(피부 고민 `wonder`, 투자 시간)을 여기 저장·표시               |
| 프로필 "AI 분석 리포트" | 등록 제품 전체의 `ingredients` + `warnings`를 모아 요약                      |
| `SkinHealthCard`        | ⚠️ **산출 근거 없음 → Q10**                                                  |

---

### Q10. 피부 건강 점수 → **루틴 수행률 기반 + 카드 문구 변경**

`SkinHealthCard`는 유지하되(Q9), 점수를 **`RoutineRun` 기록에서 계산**한다.

```
점수 = 이번 주 완료 단계 수 ÷ 이번 주 예정 단계 수 × 100
주간 변화 = 이번 주 점수 − 지난주 점수
```

- **카드 문구를 바꾼다**: "피부 건강 점수" → **"이번 주 루틴 달성률"**.
  수행률을 "피부 건강"이라 부르면 이름과 내용이 어긋난다. 숫자의 의미를 정직하게 표시한다.
- `summary` 문구도 수행률 기준으로 다시 쓴다(현재 "수분 상태가 아주 좋아요"는 근거가 없다).
- 기록이 없는 첫 주에는 점수 대신 **빈 상태**("첫 루틴을 시작해 보세요")를 보여준다.
  0%로 표시하면 실패한 것처럼 보인다.
- 진짜 피부 점수는 측정 수단이 생겼을 때 별도로 도입한다.

### Q-ponytail. ponytail 리뷰 반영 범위 → **네이버 검색 삭제만**

`/ponytail-review` 결과 중 **확실한 죽은 코드만 반영**하고, 설계의 파일 구성은 원안을 유지한다.

- **삭제 확정**: `src/api/search.ts`(51줄) + `src/app/api/search/shop/route.ts`(70줄) = **121줄**.
  실측 결과 **호출처 0건**이고, `scan/products.ts:L5`가 이 API를 "신규로 등록할 수 없는 API로
  막혀 있다"고 스스로 기록해 두었다. 되살릴 경로가 없다.
  → `products.ts`의 해당 주석에서 "`src/api/search.ts`에 네이버 연동 코드가 남아 있으니 되살릴 수
  있다"는 문장도 함께 지운다(파일이 사라지므로 거짓 안내가 된다).
- **꼬리 정리(2026-08-18 추가 실측)** — 파일 2개만 지우면 **네이버 잔재가 두 군데 더 남는다**:
  - `src/lib/env.ts:37-43`의 `naverClientId`·`naverClientSecret` getter — 유일한 소비처가
    `route.ts:49-50`이므로 route와 함께 죽는다. 남겨두면 "어디서 쓰지?" 하고 뒤지게 만든다.
  - `.env.example`의 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` 키 2줄 + 설명 주석 — 남겨두면
    다음 사람이 채워야 하는 값인 줄 안다.
  - 근거: 네이버 개발자센터에서 쇼핑 검색이 **신규 등록 불가 API**라 Client ID를 새로 딸 수
    없다(`.env.example` 자체에 errorCode 024 사례가 기록돼 있었다). 시간이 지나면 풀리는
    문제가 아니므로 키 자리만 남겨둘 이유가 없다.
- **미반영(원안 유지)**: `storage/` 4파일, `parseJson.ts` 분리, Route Handler 3개,
  프롬프트 3파일, `routine/new` 하위 컴포넌트, `StepWarnings`, `stepIcon.ts`, `AppShell`.
  → 사용자 결정(2026-08-18). 재논의하지 않는다.
- ponytail 지적 자체는 타당했으므로 **기록만 남긴다** — 나중에 파일이 실제로 부담이 되면
  이 목록이 1순위 정리 대상이다. 특히 `storage/` 4파일은 "백엔드 생기면 구현체 교체"라는
  **speculative abstraction**이라는 지적이 정확했다.

---

## 아키텍처

### 데이터 모델 (`src/types/skincare.ts` 신규)

프롬프트 출력은 snake_case, 프론트 모델은 camelCase다.
AGENTS.md 컨벤션대로 **`src/api/`는 raw 응답을 그대로 반환**하고, 변환은 훅에서 한다.

```ts
/** 등록된 제품 — "제품 성분 추출" 프롬프트의 입력 + 출력을 합친 것 */
export type Product = {
  id: string;
  /** 사용자 입력 (필수) */
  productName: string;
  /** 사용자 입력 (선택) — mL 단위 */
  capacity?: string;
  /** 사용자 입력 (선택) */
  productCompany?: string;
  /** 긴 변 256px JPEG data URL — 원본은 저장하지 않는다 (Q7) */
  thumbnail?: string;
  /** AI 추출 결과 */
  category: string;
  ingredients: string[];
  /** "제품 사용 주의 사항" 프롬프트 결과 — 지연 생성이라 optional */
  warnings?: string[];
  createdAt: string; // ISO
};

/** 생성된 루틴의 한 단계 — "스킨케어 루틴 작성" 프롬프트 출력 1개 원소 */
export type RoutineStep = {
  id: string;
  routineName: string;
  /** 초 단위 (프롬프트의 estimated_time) */
  estimatedTime: number;
  /** 제품 이름 배열 — 이중 세안 등 한 단계 2제품 대응 */
  usingProduct: string[];
  /** Q5로 프롬프트를 배열로 고쳤다 — HowToList가 그대로 쓴다 */
  howToUse: string[];
  tips: string[];
  warning: string[];
};

export type Slot = "am" | "pm";

/** 저장된 루틴 1벌 */
export type Routine = {
  id: string;
  createdAt: string;
  /** 생성 입력 — 재생성 시 프리필 + 프로필 "피부 프로필" 표시용 */
  wonder: string;
  usableTime: { morning: string; evening: string };
  am: RoutineStep[]; // 프롬프트의 morning
  pm: RoutineStep[]; // 프롬프트의 evening
};

/** 루틴 수행 기록 */
export type RoutineRun = {
  id: string;
  routineId: string;
  slot: Slot;
  startedAt: string;
  finishedAt: string;
  completedStepIds: string[];
};
```

**슬롯 명명** _(db9eaed 머지로 갱신)_: 라우트는 이제 **`/routine/[routineId]/[step]`**이다
(`/routine/daily-am/1`). am/pm은 라우트가 아니라 **`Routine.time` 필드**가 담는다 —
프롬프트의 `morning`/`evening`을 `time: "am" | "pm"`으로 매핑한다.
`IMMERSIVE` 정규식은 팀원이 이미 `/^\/routine\/[^/]+\//`로 일반화해 뒀으므로
routineId가 무엇이든 수행 화면에서 탭바가 숨는다. `SLOT_LABEL`·`isSlot`은 사라졌고
`TIME_LABEL`·`TIME_ICON`이 그 역할을 한다.

### 저장소 계층 (`src/lib/storage/` 신규)

```
src/lib/storage/
  local.ts       공통 — JSON 직렬화, 스키마 버전 키, QuotaExceededError·사파리 프라이빗 방어
  products.ts    list / get / add / update / remove
  routines.ts    getCurrent / save / clear
  history.ts     list / append / 진행 중 상태
```

- **SSR 안전**: 모듈 최상단에서 `localStorage`를 만지면 서버 렌더 중 `ReferenceError`.
  반드시 함수 내부에서 접근하고, 호출부는 `useEffect`/이벤트 핸들러여야 한다.
- 스키마 버전 키(`al:v1:products`)를 둬서 모델이 바뀌어도 폭발하지 않게 한다.

### AI 계층

| 위치                                  | 역할                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/lib/claude/runner.ts`            | **WatchList `claude_runner.py` 이식** — spawn, env 정리, 봉투 파싱, 트랜스크립트 삭제 |
| `src/lib/claude/parseJson.ts`         | `result` 문자열에서 JSON 객체 추출(펜스·잡텍스트 무시)                                |
| `src/lib/prompts/ingredients.ts`      | "제품 성분 추출" 프롬프트 (서버 전용)                                                 |
| `src/lib/prompts/routine.ts`          | "스킨케어 루틴 작성" 프롬프트 — **Q5 반영본** (서버 전용)                             |
| `src/lib/prompts/warnings.ts`         | "제품 사용 주의 사항" 프롬프트 (서버 전용)                                            |
| `src/app/api/ai/ingredients/route.ts` | 이미지 임시 저장 → 프롬프트에 경로 삽입 → `allowedTools: ["Read"]`                    |
| `src/app/api/ai/routine/route.ts`     | 루틴 생성 (도구 불필요)                                                               |
| `src/app/api/ai/warnings/route.ts`    | 주의사항 (도구 불필요)                                                                |
| `src/api/ai.ts`                       | 클라이언트 래퍼. `api.post` 사용, **raw 응답 그대로 반환**                            |

### 서버/클라이언트 경계 — 이번 작업 최대 리스크

localStorage는 브라우저 전용이므로 **루틴 데이터를 읽는 모든 화면이 클라이언트가 된다.**
현재 `/routine/[routineId]/[step]`은 **서버 컴포넌트 + `generateStaticParams` 정적 프리렌더**다
(db9eaed에서도 시드 기반 정적 생성 유지 — [routineId]/[step]/page.tsx:14).
루틴이 사용자별 동적 데이터가 되는 순간 **정적 생성이 성립하지 않는다.**

대응:

1. `generateStaticParams` **제거**. 단계 수가 루틴마다 달라 미리 알 수 없다.
2. 페이지(`page.tsx`)는 서버 컴포넌트로 남기고 **껍데기만** 렌더한다.
   `RunHeader`(총 단계 수)·`StepActions`(다음 단계 이름)도 클라이언트 데이터가 필요하므로,
   수행 화면 본문을 감싸는 클라이언트 컴포넌트 `RoutineRunner`를 만들고 `page.tsx`는 `params`만 넘긴다.
   → `"use client"`를 페이지가 아니라 **한 단계 아래 leaf**에 둔다.
3. 404 처리 위치가 바뀐다. 서버에서 `notFound()`로 잡던 범위 초과 단계를 이제 클라이언트가 판정한다
   (서버는 루틴을 모른다). 잘못된 URL은 `/routine`으로 리다이렉트.
4. `/routine/page.tsx`의 `export const dynamic = "force-dynamic"`은 `WeekStrip`이 "오늘"을 그리기
   때문이라 **유지**한다.

---

## 변경 대상 파일

### 신규

| 파일 경로                                                | 작업 요약                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/types/skincare.ts`                                  | `Product` · `RoutineStep` · `Routine` · `RoutineRun` · `Slot`    |
| `src/lib/storage/local.ts`                               | localStorage 공통 — 직렬화, 버전 키, quota 예외 처리             |
| `src/lib/storage/products.ts`                            | 등록 제품 CRUD                                                   |
| `src/lib/storage/routines.ts`                            | 생성된 루틴 저장/조회                                            |
| `src/lib/storage/history.ts`                             | 수행 기록 append/list + 진행 중 상태                             |
| `src/lib/claude/runner.ts`                               | **WatchList 패턴 이식** — Q8의 규칙 5가지 전부                   |
| `src/lib/claude/parseJson.ts`                            | 펜스·잡텍스트 무시 JSON 추출                                     |
| `src/lib/prompts/{ingredients,routine,warnings}.ts`      | 프롬프트 3종 (서버 전용 — 클라이언트 import 금지)                |
| `src/app/api/ai/{ingredients,routine,warnings}/route.ts` | 엔드포인트 3종. `runtime = "nodejs"` 명시                        |
| `src/api/ai.ts`                                          | 클라이언트 래퍼 (raw 반환)                                       |
| `src/app/scan/components/ProductForm.tsx`                | 제품명/용량/회사/사진 등록 폼 (+ `.module.css`)                  |
| `src/app/scan/hooks/useProductRegister.ts`               | 폼 검증 + 성분 추출 호출 + 저장                                  |
| `src/app/scan/camera/page.tsx`                           | `/testCamera` 이관 — 촬영 → 폼으로 이미지 반환 (+ `.module.css`) |
| `src/app/routine/new/page.tsx`                           | 루틴 생성 화면 (+ `.module.css`)                                 |
| `src/app/routine/new/components/*`                       | 고민 입력 · 시간 입력 · 생성 결과 미리보기                       |
| `src/app/routine/hooks/useRoutineGenerate.ts`            | 루틴 생성 호출 + 저장                                            |
| `src/app/routine/components/RoutineRunner.tsx`           | 수행 화면 클라이언트 경계 (+ `.module.css`)                      |
| `src/app/routine/components/StepWarnings.tsx`            | `warning[]` 표시 UI (+ `.module.css`)                            |
| `src/app/routine/[routineId]/done/page.tsx`              | 루틴 종료 · 기록 저장 (+ `.module.css`)                          |
| `src/lib/imageResize.ts`                                 | canvas 축소·JPEG 인코딩 (Q7 — `/testCamera` 코드 재사용)         |
| `src/lib/stepIcon.ts`                                    | 단계명 → Material Symbols 아이콘 매핑 (Q6 폴백)                  |

### 수정

| 파일 경로                                        | 작업 요약                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`                                      | **도메인 설명 교체** — 점수/상점/채팅 → 스킨케어. 저장소·AI 경로 명시                                                                |
| `src/app/routine/routines.ts`                    | 시드 상수 제거. `SLOT_LABEL`·`isSlot`만 남기고 타입은 `src/types`로                                                                  |
| `src/app/routine/components/RoutineCard.tsx`     | _(db9eaed로 RoutinePlanner 대체)_ 저장된 루틴을 읽도록. 루틴 없으면 `/routine/new` 유도. 로컬 done state → `RoutineRun` 기록         |
| `src/app/routine/page.tsx`                       | `ROUTINES` 시드 직접 참조 제거 — 저장소에서 읽는 클라이언트 조각으로                                                                 |
| `src/app/routine/[routineId]/[step]/page.tsx`    | `generateStaticParams` 제거, `RoutineRunner`로 위임                                                                                  |
| `src/app/routine/components/StepActions.tsx`     | 마지막 단계 → `/routine/[routineId]/done`으로                                                                                        |
| `src/app/scan/page.tsx`                          | 등록 폼 + 검색 병행 배치 (Q4)                                                                                                        |
| `src/app/scan/components/ScannerCta.tsx`         | 링크 `/testCamera` → `/scan/camera`                                                                                                  |
| `src/app/scan/components/ProductCard.tsx`        | 검색 결과 선택 → 등록 폼 프리필                                                                                                      |
| `src/app/profile/page.tsx`                       | 목업 → 실데이터 (Q9 표 참조). 기록 섹션 추가                                                                                         |
| `src/app/(home)/page.tsx`                        | 하드코딩 상수 → 실데이터 (Q9 표 참조)                                                                                                |
| `src/app/(home)/components/SkinHealthCard.tsx`   | Q10 결정 반영. 문구 변경 가능성                                                                                                      |
| `src/app/(home)/components/NextStepCard.tsx`     | 진행 중 루틴에서 파생                                                                                                                |
| `src/app/(home)/components/IngredientAlerts.tsx` | 제품 `warnings[]` + step `warning[]`에서 파생                                                                                        |
| `src/lib/env.ts`                                 | `serverEnv`에 `claudeBin` 추가 (**`NEXT_PUBLIC_` 금지**) + **`naverClientId`/`naverClientSecret` getter 삭제**(Q-ponytail 꼬리 정리) |
| `.env.example`                                   | `CLAUDE_BIN` + "ANTHROPIC_API_KEY 두지 말 것" 경고 (WatchList 문구 참고) + **`NAVER_CLIENT_ID`/`SECRET` 키·주석 삭제**               |
| `package.json`                                   | `tesseract.js` 제거 (Q3)                                                                                                             |
| `docs/plans/2026-08-13-clova-ocr/README.md`      | 상단에 폐기 배너 추가 (삭제하지 않음 — 재논의 방지)                                                                                  |

### 삭제

| 파일 경로                          | 사유                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| `src/app/testCamera/`              | `/scan/camera`로 이관                                     |
| `src/api/search.ts`                | **죽은 코드 51줄.** 호출처 0건, 네이버 API 신규 등록 불가 |
| `src/app/api/search/shop/route.ts` | **죽은 코드 70줄.** 위와 같은 이유 (Q-ponytail 결정)      |

> Q9에서 "전부 유지"로 확정됐으므로 홈·프로필 컴포넌트 **삭제는 없다.**

---

## 구현 순서

각 Step은 독립 커밋 가능하고, 앞 Step만으로도 앱이 깨지지 않는다.

- **Step 0** — `AGENTS.md` 도메인 설명 교체 + 이 plan 링크. clova-ocr plan에 폐기 배너.
  노션 기획서의 `how_to_use` 스키마 갱신(Q5).
  **네이버 검색 죽은 코드 121줄 삭제**(Q-ponytail) + 꼬리 정리 — `env.ts`의 naver getter 2개,
  `.env.example`의 NAVER 키 2줄, `products.ts` 주석의 거짓 안내까지 **한 커밋으로** 지운다.
  _유일한 코드 변경은 삭제뿐이라 회귀 위험이 없다. 삭제 후 `npm run check`로 참조 0건 확인._
- **Step 1** — `src/types/skincare.ts` + `src/lib/storage/*`. **순수 추가, UI 변경 0.**
- **Step 2** — `src/lib/claude/*` + 프롬프트 3종 + Route Handler 3종 + `src/api/ai.ts`.
  _UI 없이 `curl`로 프롬프트 3종을 단독 검증할 수 있다._
  **먼저 확인할 것**: ① stdin 프롬프트 전달이 되는지 ② `--output-format json` 봉투 구조
  ③ `--allowedTools Read`로 이미지가 실제로 읽히는지 ④ 세션 트랜스크립트 삭제가 동작하는지.
- **Step 3** — `/scan` 등록 폼 → 성분 추출 → 저장. 카메라는 아직 기존 `/testCamera` 사용.
  _여기서 처음으로 "제품 등록" 플로우가 끝까지 돈다._
- **Step 4** — `/scan/camera` 이관, `src/lib/imageResize.ts` 분리, `tesseract.js` 제거,
  촬영 이미지 → 폼 연결(원본은 AI로, 썸네일은 저장).
- **Step 5** — `/routine/new` 루틴 생성 → 저장.
- **Step 6** — `/routine` + `/routine/[routineId]/[step]`를 저장된 루틴으로 구동.
  `ROUTINES` 시드 제거, `generateStaticParams` 제거, `RoutineRunner` 도입, `warning[]` UI 추가.
  _가장 위험한 단계 — 서버/클라이언트 경계가 바뀐다._
- **Step 7** — `/routine/[routineId]/done` 기록 저장 + `/profile` 기록·선반·피부 프로필 실데이터화.
- **Step 8** — 주의사항 프롬프트 연결 → 제품 `warnings[]` 채우기 → `IngredientAlerts` 실데이터화.
- **Step 9** — 홈 실데이터화 (`NextStepCard`, `SkinHealthCard`) + 프로필 AI 리포트. ⚠️ **Q10 선행 필요.**

---

## 검증

- `npm run check` 통과 (타입 + 린트 + 포맷)
  - ⚠️ **신규 라우트가 5개 이상 추가된다.** `typedRoutes`가 켜져 있어 `next typegen`이 먼저 돌아야
    `<Link href>`가 검증된다. 반드시 `npm run check` 경로로 (`tsc --noEmit` 단독 금지).
  - 기존 코드가 `as Route` 캐스팅으로 우회한 곳이 있다
    ([`RoutineCard.tsx:57`](../../../src/app/routine/components/RoutineCard.tsx),
    [`[step]/page.tsx:81`](../../../src/app/routine/[routineId]/[step]/page.tsx)) — 동적 경로라 불가피하나,
    신규 코드에서 캐스팅을 남발해 오타를 숨기지 않도록 주의.
- `npm run build` 통과
- **서버/클라이언트 경계**
  - `src/lib/prompts/*` · `src/lib/claude/*` · `serverEnv`가 클라이언트 컴포넌트로 import되지 않았는지 grep.
  - `npm run build` 후 `.next/static`에서 프롬프트 문자열·`CLAUDE_BIN` 경로가 **검색되지 않아야** 한다.
  - localStorage 접근이 모듈 최상단에 없는지 확인 (SSR `ReferenceError` 방지).
- **헤드리스 Claude 전용 검증**
  - 자식 프로세스에서 `ANTHROPIC_API_KEY`가 실제로 제거되는지 (제거 로그 확인).
  - 이미지 임시 파일이 요청 후 남지 않는지 (`os.tmpdir()` 확인).
  - `~/.claude/projects/*/{session_id}.jsonl`이 삭제되는지 — **제품 사진 사본이 남으면 안 된다.**
- **CSS Modules** — `refactor-equivalence-check` 스킬 2단계 기준.
  `styles.없는클래스`는 `tsc`를 통과하고 런타임에 조용히 사라진다. 공용 `card.module.css` 소비처 전수 확인.
- `ai-contract-check` — **Step 2·3·5·8에서 필수.** 프롬프트 출력 스키마 대조 + 런타임 검증 확인.
  (구 `backend-dto-check`는 대상 없음 — 저장소가 localStorage, 백엔드 호출 없음.)
- **수동 확인 (dev 서버)**
  1. `/scan` → 제품명만 입력하고 등록 → 성분이 채워지는지. Network에서 `POST /api/ai/ingredients` 확인.
  2. `/scan/camera` → 성분표 촬영 → 폼으로 돌아오는지. 카메라 권한 프롬프트가 뜨는지
     (`next.config.ts`의 `Permissions-Policy: camera=(self)` — `camera=()`면 허용해도 `NotAllowedError`).
  3. `/routine/new` → 고민·시간 입력 → 아침/저녁 루틴 생성.
     `estimated_time` 합이 입력한 시간을 넘지 않는지 (프롬프트 규칙 2 검증).
     `how_to_use`가 **배열**로 오는지 (Q5 검증).
  4. `/routine` → 생성된 루틴이 AM/PM 토글로 보이는지. **루틴이 없을 때 빈 상태**가 정상인지.
  5. `/routine/am/1` → 마지막 단계 → `/routine/am/done` → `/profile`에 기록이 남는지.
  6. 잘못된 URL(`/routine/am/99`, `/routine/xx/1`) 진입 시 처리.
  7. **localStorage 비운 상태**로 전 화면 진입 — 빈 배열에서 크래시하지 않는지.

---

## 비범위 (Out of Scope)

- **회원가입·로그인** — 원본 기획에서 명시적으로 `X`.
- **생리 주기별 루틴의 AI 생성** — 단, db9eaed로 **모델·시드에는 이미 존재**한다
  (`Routine.condition: "생리 기간"`). 이번 범위에서 AI 생성은 "평소" 1벌만 만들고,
  조건 루틴은 시드/수동으로 남긴다. AI 확장 경로는 [머지 재검토](#머지-재검토-db9eaed-2026-08-18)의
  "새 갭" 참조.
- **루틴 수정 기능** — 원본 기획에 "(추후 → 수정 기능 추가)"로 명시. 이번엔 생성/재생성만.
- **네이버 쇼핑 API 되살리기** — `src/api/search.ts` · `/api/search/shop`는 현행 유지.
  개발자센터에서 신규 등록이 막힌 상태라 우리가 풀 수 없다([products.ts 주석](../../../src/app/scan/products.ts)).
- **원기둥 용기 파노라마 스캔** — clova-ocr plan에서 이미 후순위로 지정됨.
- **성분 DB 매칭·성분별 상세 해설** — LLM 출력 텍스트를 그대로 쓴다.
- **기기 간 동기화** — localStorage 결정(Q1)의 필연적 결과.
- **헤드리스 Claude 호출 큐·동시성 제어** — 해커톤 규모에선 불필요. 부하가 문제되면 그때.

---

## 진행 상태

- [x] Step 0 — 완료 2026-08-18. 네이버 죽은 코드 삭제(`search.ts`+`route.ts` −121줄,
      `env.ts` getter 2개, `.env.example` 키 2줄, `products.ts` 거짓 주석), AGENTS.md 도메인
      스킨케어로 교체 + SSE 줄 정정, clova-ocr plan 폐기 배너, 팀원 `presentation/*.md` 포맷.
      검증: `npm run check` + `npm run build` 통과 — 빌드 라우트 표에서 `/api/search/shop` 소멸,
      `[routineId]` 25경로 정상. 커밋: 대기.
      **잔여**: 노션 기획서의 `how_to_use: string[]` 갱신(Q5)은 **사용자 작업** — 코드 쪽 정본은
      Step 2에서 `src/lib/prompts/routine.ts`로 들어간다.
- [ ] Step 1 — 타입 + 저장소 계층
- [ ] Step 2 — 헤드리스 Claude 러너 + 프롬프트 + Route Handler 3종
- [ ] Step 3 — 제품 등록 폼
- [ ] Step 4 — 카메라 이관 + tesseract 제거
- [ ] Step 5 — 루틴 생성 — ~~보류~~ **해제(2026-08-18, 위임).** 프롬프트 1벌 → `Routine` 2개 매핑
- [ ] Step 6 — 루틴 수행 실데이터화 — ~~보류~~ **해제(동상).** `[routineId]` 기준
- [ ] Step 7 — 기록 저장 + 프로필 — 전체 진행 (`/routine/[routineId]/done` 포함)
- [ ] Step 8 — 주의사항 연결 + IngredientAlerts
- [ ] Step 9 — 홈 실데이터화 (수행률 기반 달성률 카드)
