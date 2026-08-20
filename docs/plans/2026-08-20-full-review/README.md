# 전면 검토 결과 — 논리 오류 · 의도 대조 · 추가/개선 후보 (2026-08-20)

> 대상: `main` — 프로덕션 배포 상태의 전체 코드베이스(화면 6도메인 · API 라우트 15 · lib · 인프라).
> **기준 커밋: `f415cfb`** (모든 파일:라인 번호는 이 시점 기준 — 코드가 진행됐다면 심볼명으로 재탐색할 것).
> 방법: ① 도메인 파인더 8 fan-out(전량 정독) → dedup → 발견별 적대 검증(반박 스탠스, 재현 시나리오 필수, 전원 Fable 5)
> ② 세션 확정 의도 27개 주장을 refuter 6개로 대조 ③ browser-prober 실측(dev 서버 재사용) ④ 제품/운영 스카우트 2.
> 통계: 원시 36 → **확정 32**(major 8 · minor 24) / 반박 4 · 의도 대조 27주장 중 **불일치 6** · 제안 25.
> 사전 제외(의도된 결정 — 수정 세션도 건드리지 말 것): API raw 반환 정책 / TS5.9·ESLint9 핀 / Tailwind 미사용 /
> CSP 미설정(v1) / BACKEND_ORIGIN rewrite 잔존 / routine·search 캐시 제외 / warnings 전역 직렬 큐 /
> shelfFingerprint 방식 / 과도기 storage 공존 / 테스트 러너 없음 / ~/.claude 볼륨 마운트 / design-debt.md 기존 항목.
> 관련: [배포 계획](../2026-08-20-deploy-youtine/README.md) · [성분 지식](../2026-08-20-ingredient-knowledge/README.md) · [디자인 부채](../2026-08-20-ingredient-knowledge/design-debt.md)

## 이어받는 세션을 위한 작업 규칙

- **커밋은 사용자가 명시 요청할 때만.** 수정 묶음이 끝나면 커밋 메시지 후보 + 테스트 가이드만 제시. push 는 사용자가 직접.
- M4(warnings 재큐잉)·M9(성분 매칭) 수정 전 `ai-contract-check` 로 프롬프트 출력 필드 재확인. 리팩토링성 수정 후 `refactor-equivalence-check`.
- **테스트 러너 없음** — 검증은 ①`npm run check` ②`npm run build` ③dev 서버 수동 확인(3000 은 사용자 것 — 죽이지 말 것) ④DevTools 네트워크 탭.
- 수동 검증 진입 경로: M1·m18=스캔 등록(사진) / M2·M3=localStorage 시드 후 첫 진입 / M4=홈 성분알림 / M5·M6=스캔 탭 전환+뒤로가기 / M7=루틴 완료 화면 / M8=CI(연속 푸시) / M9=고민 탭 사전 → 칩 클릭 → "이 성분이 든 내 제품".
- **결정 필요(사용자에게 물어볼 것)**: 아래 "결정 필요 사항" 절. 나머지는 결정 없이 착수 가능.
- 수정 완료 시 체크박스 갱신 + 커밋 해시를 항목 옆에 기록.

## 의도 대조표 (세션 확정 결정 vs 실제 코드)

| 축                                                                                                                     | 판정        | 비고                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI DB-first 5건 (concern 캐시·리포트 지문·warnings 큐·ingredients 카탈로그·routine/search 제외)                        | ✅ 5/5      | 캐시 조회가 전부 429 가드보다 먼저 실행됨을 코드로 확인                                                                                                                |
| 스캔 탭 UX 5건 (탭 동일 너비·카드 공유·분석하기 버튼 조건·리포트 정리·모달 스크림)                                     | ✅ 4 + ⚠️ 1 | B4: [제품→성분→설명] 순서는 종합 탭만. 타입별·시너지 탭은 [성분→제품→설명] 역순 → **결정 Q2**                                                                          |
| 홈·고민 5건 (성분알림 DB만·wonder 삽입·캐시 재사용·사전·하드코딩 없음)                                                 | ✅ 4 + ⚠️ 1 | C1: useProducts 포커스 재검증이 기본값(켜짐) — AI 를 안 태워 실해 없음, 취향 문제                                                                                      |
| 루틴 5건 (초 단위·타이머 정리·이름 미소실·기록 반영·중복 제출 차단)                                                    | ✅ 3 + ❌ 2 | D3: using_product↔제품 정규화 매칭 **미구현**(주석만, m27) / D4: 저장 실패 무표시 → M7 로 승격                                                                         |
| 성분 지식 4건 (시드 100건 정확·화면 연결·리포트 근거)                                                                  | ✅ 3 + ❌ 1 | E3: 성분→제품 매칭 누수 → **M9**                                                                                                                                       |
| 저장소 이전·사진·인증 6건 (멱등·서버 정본·al_uid 5라우트 스코프)                                                       | ✅ 5 + ⚠️ 1 | F2: 이미지 onError 폴백 부재(m26). 루틴 dedup TOCTOU 는 적대 검증에서 기각(반박 부기 참조)                                                                             |
| 실측 (탭 83px 균등·카드 164×240 균등·스크림 rgb(0 0 0/0.72)+blur12px·스크롤 락 잠금/해제·분석하기 버튼 헤더 우단 일치) | ✅          | "신규 브라우저에 남의 데이터" 의혹은 **오탐** — al_uid 가 HttpOnly 라 document.cookie 에 안 보였을 뿐, 프로버 브라우저가 과거 세션 쿠키를 보유. products 스코프는 정상 |

## 🔴 Major (9) — 데이터 손실 · 프라이버시 · 프로덕션 잠금

- [ ] **M1. 실패·타임아웃 경로에서 세션 트랜스크립트(제품 사진 base64) 정리 누락** — `src/lib/claude/runner.ts:184`
      spawn 실패(signal/exit≠0)·봉투 파싱 실패가 전부 정리 코드(196행) 이전에 throw → `~/.claude/projects/*/{session}.jsonl` 에 성분표 사진 사본 잔존. 타임아웃 경로는 session_id 자체를 못 얻어 사후 삭제 불가. 주석의 의도("실패한 호출도 지운다")를 is_error 경로만 충족.
      → 수정: 세션 ID 를 사전 생성해 `--session-id` 로 지정하고 정리를 try/finally 로 이동 — 어떤 실패 경로든 ID 를 알고 지울 수 있다.
- [ ] **M2. 이관 상한 초과·검증 탈락분이 조용히 버려진 뒤 로컬 원본 삭제 — 복구 불가 손실** — `src/app/MigrateLocalData.tsx:72` + `api/migrate/route.ts:69`
      서버가 products 200건/runs 1000건 초과분과 검증 탈락 항목을 `slice`/`continue` 로 버려도 ok:true → 클라이언트가 migrated 카운트 대조 없이 로컬 4키 전부 삭제. 이름 256자 초과 1건만으로도 발동.
      → 수정: 응답의 migrated 카운트를 로컬 건수와 대조해 전량 일치할 때만 삭제(불일치 시 로컬 유지 + console.warn).
- [ ] **M3. 이관 성공 후 SWR 무효화 없음 — 이관된 데이터가 화면에 안 보임** — `src/app/MigrateLocalData.tsx:72`
      마이그레이션 성공 후 mutate 0건 → 레거시 사용자 첫 실행마다 "제품이 없어요" 빈 화면(재포커스 전까지). data.ts 계층 불변식("쓰기 후 mutate")을 이 경로만 위반.
      → 수정: 성공 블록에서 KEYS.products/routines/runs/profile mutate.
- [ ] **M4. warnings 작업 유실 시 재시도 경로 전무 — 홈이 영구 "분석 중"** — `src/lib/ai/warningsQueue.ts:108`
      큐는 인메모리(재시작·배포로 소실), 재큐잉은 동일 (name,brand) 재등록뿐. NULL 고착 시 홈 IngredientAlerts 가 "N개 제품을 분석하고 있어요"를 영원히 표시하고 안전 정보(주의사항)가 영영 미생성.
      → 수정: GET /api/products 응답 시 `warnings IS NULL` 행을 재큐잉(idempotent — 큐의 Set 이 중복 방지 이미 보유). 부트 스윕보다 코드가 짧다.
- [ ] **M5. 카메라 오버레이 + 뒤로가기 = 스트림이 산 채로 숨겨져 카메라 계속 켜짐** — `src/app/scan/components/ProductForm.tsx:126`
      탭 패널이 hidden 으로만 감춰져 CameraCapture 가 마운트 유지 → track.stop() 미실행. 모바일은 닫을 수단 전무(표시등 켜진 채). 프라이버시 직결.
      → 수정: ProductForm 이 active 여부를 받아 hidden 전환 시 setCameraMode(null).
- [ ] **M6. 모달이 hidden 패널 뒤에 남으면 body 스크롤 락 미해제 — 페이지 전체 잠김** — `src/app/scan/components/ProductSearchModal.tsx:55` (+PopularProductModal 동일)
      검색 모달 표시 중 뒤로가기 → 모달이 invisible 인 채 마운트 유지 → overflow:hidden 잔존, 4탭 전부 스크롤 불가. 모바일은 새로고침뿐.
      → 수정: M5 와 동일 패턴(active 연동으로 모달 상태 해제) 또는 락을 "실제로 보이는 동안"으로 좁힘.
- [ ] **M7. 기록 저장 실패 후 다른 루틴 시작 시 수행 기록 영구 유실** — `src/app/routine/components/RoutineDone.tsx:66` + `history.ts:26`
      실패해도 성공 UI 표시(콘솔만) → 단일 슬롯 RunStart 를 다음 루틴의 markRunStart 가 덮어씀 → 아침 실패 → 저녁 수행이라는 일상 시나리오에서 확정 유실. 주간 달성률 소급 누락.
      → 수정: 실패 시 완료 화면에 재시도 배너 + markRunStart 가 미소비 표시 발견 시 덮어쓰기 전에 먼저 전송.
- [ ] **M8. CI cancel-in-progress 가 시크릿 스캔을 통째로 건너뜀 — 연속 푸시 시 첫 범위 영영 미스캔** — `.github/workflows/ci.yml:12`
      push A(시크릿 포함) 직후 push B → A 의 실행이 취소(중립 상태, 경보 0) → B 는 after_A..after_B 만 스캔. 오늘 실측으로도 main 직접 push 3건이 5.5분 내 연속 — 재현 조건이 상시 존재. 훅 미설치 사용자의 최후 방어선이 조용히 무력화.
      → 수정: secret-scan 잡을 별도 concurrency 그룹으로 분리(또는 cancel-in-progress 해제).
- [ ] **M9. 성분→제품 매칭 누수 — 복합 표기 성분은 "이 성분이 든 내 제품"이 항상 빈 결과** — `src/app/api/products/by-ingredient/route.ts:31`
      지식 조회는 별칭 정규화(sameIngredient)를 쓰는데 이 라우트만 원시 `JSON_SEARCH LIKE`. 시드의 복합 표기 6종(`비타민씨(아스코빅애씨드)` 등)은 제품이 있어도 "아직 카탈로그에 없어요". 사전 → 상세 모달 흐름에서 결정적 재현.
      → 수정: 라우트에서 ingredientNames 별칭 확장 후 각 표기로 OR 검색(지식 라우트와 같은 규율).

## 🟡 Minor (28)

| #   | 위치                                        | 요약                                                                                                                     |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| m1  | `api/profile/route.ts:56`                   | usableTime 상한 초과가 400 대신 빈 문자열 저장(기존 값 덮어씀) → `?? ""` 를 400 반환으로                                 |
| m2  | `api/routines/route.ts:150`                 | 불량 step 조용히 탈락 저장(루틴 레벨의 400 원칙과 모순) → step 탈락도 400 으로                                           |
| m3  | `api/runs/route.ts:48`                      | routineId 길이 미검증 → 37자 이상이 400 아닌 503. migrate 처럼 `text(id, 36)`                                            |
| m4  | `lib/storage/history.ts:28`                 | markRunStart 가 save() 실패 무시 → 프라이빗 모드에서 기록 통째 누락. 실패 시 경고 표시                                   |
| m5  | `api/routines.ts:5`                         | 주석 "통째 교체" ↔ 실제 condition 단위 교체 — 계약 문서 수정                                                             |
| m6  | `concern/ConcernSection.tsx:57`             | 실패 시 서버 한글 메시지 대신 "API 400" 원문 노출 → body.message 추출(data.ts 규약)                                      |
| m7  | `lib/achievement.ts:87`                     | 주간 델타가 부분 주 vs 완결 주 비교 → 주 초반 내내 거짓 "86%p 하락". 경과 일수로 정규화                                  |
| m8  | `concern/ConcernSection.tsx:39`             | 마운트 자동 AI 호출이 진행 중 루틴 생성과 충돌 → 탭 진입만으로 429 카드                                                  |
| m9  | `concern/ConcernDictionary.tsx:49`          | button 안에 h2 — 콘텐츠 모델 위반. 헤딩을 버튼 밖으로                                                                    |
| m10 | `lib/data.ts:305`                           | 등록 후 KEYS.popular 미무효화 + 패널 상시 마운트 → 인기 탭 stale. addProduct 에서 mutate                                 |
| m11 | `scan/ScanWorkspace.tsx:45`                 | 검색 중 인기 카드 선택 → formKey 리마운트로 진행 중 검색 소실 + 가드 점유로 429                                          |
| m12 | `scan/useProductRegister.ts:119`            | 갤러리 원본 무축소 전송 → 6MB 초과 413, HEIF 400. 카메라 경로의 리사이즈 재사용                                          |
| m13 | `routine/StepTimer.tsx:18`                  | 틱 카운트 타이머 — 백그라운드 탭·화면 꺼짐에서 실시간과 어긋남. 시작 시각 기준 파생으로                                  |
| m14 | `routine/WeekStrip.tsx:54`                  | 주 프레임 Asia/Seoul vs 완료 판정 로컬 TZ 혼용 — 해외 기기에서 체크 어긋남                                               |
| m15 | `routine/RoutineRunner.tsx:109`             | estimatedTime 0 단계가 "약 1분" 날조 + 타이머 죽은 버튼                                                                  |
| m16 | `IngredientDetailModal.tsx:53`              | 이 모달만 Escape 닫기·포커스 이동 없음(다른 모달 3종과 어긋남)                                                           |
| m17 | `app/layout.tsx:8`                          | metadata 가 "Animal League" — 프로덕션 탭 제목·OG·검색 색인 전부. **결정 Q1 과 연동**                                    |
| m18 | `TopAppBar.tsx:16`                          | 알림 버튼이 핸들러 없는 죽은 요소(3페이지 노출) — 제거 또는 disabled+주석                                                |
| m19 | `Dockerfile:28`                             | standalone 미사용 — 이미지 수백 MB 비대 + npm ci 2회. `output:"standalone"` 전환                                         |
| m20 | `.githooks/pre-commit:35`                   | $files 빈 경우 pathspec 없는 diff 폴백 → 훅이 자기 자신 차단·공백 파일명 미스캔                                          |
| m21 | `deploy.yml:20`                             | Deploy 가 CI 와 병렬 독립 — 스캔·린트 실패해도 배포됨. CI 성공 게이트 필요                                               |
| m22 | `deploy.yml:73`                             | 배포 후 헬스체크·실패 알림 0 — 부팅 실패가 초록불(P19 와 함께 해결)                                                      |
| m23 | `docker-compose.yml:57`                     | initdb 에 001 만 — 새 볼륨이 4단계 낡은 스키마로 기동(P18 과 함께 해결)                                                  |
| m24 | `Dockerfile:25`                             | claude CLI 버전 미고정 + 캐시 의존 — 캐시 축출 순간 통제 없이 버전 점프. 버전 핀                                         |
| m25 | `TopAppBar.module.css` (실측)               | fixed left:240px+width:1200px = 1440px 전제 → 1280×800 에서 우측 160px(알림 버튼 포함) 화면 밖. max-width+right 기준으로 |
| m26 | `scan/ProductCard.tsx:51` (의도 F2)         | 이미지 onError 폴백 부재(레포 전체 0건) — 깨진 값이면 브라우저 기본 깨진 아이콘                                          |
| m27 | `types/skincare.ts:64` (의도 D3)            | using_product↔제품 정규화 매칭이 주석만 있고 미구현 — 4개 렌더 지점 전부 원문 문자열만 표시(썸네일·상세 연결 없음)       |
| m28 | `scan/ProductSearchModal.tsx:209` (의도 F2) | 저장 전 미리보기는 화해 CDN 원본 URL 직접 로드(임베딩 전) — 정책 일반화 시 예외 지점                                     |

## 반박 4건 부기 (기각됐지만 기록)

- 이관 동시성 TOCTOU(루틴 중복) ×2 — ensureUser 의 `INSERT … ON DUPLICATE KEY UPDATE` 가 users PK 에 X 락을 잡아 두 번째 트랜잭션이 COUNT 전에 블록됨 → 재현 불가.
- migrate 본문 크기 가드의 chunked 우회 — 메커니즘 자체는 사실(content-length 부재 시 가드 스킵)이나 악의적 입력 전제 + 항목 slice 가 DB 피해를 제한해 기각. 방어를 올리려면 스트림 단계 제한 필요.
- data.ts 죽은 코드 3계열(setProductWarnings·clearRoutines·fetchWarnings — 호출처 0건) — 버그 아님, 컨벤션(정리 대상). M4 수정 시 fetchWarnings 계열은 되살리지 말고 삭제할 것.

## 개선 제안 25 (스카우트 산출 — 착수는 사용자 선택)

**제품 (P1~P14)** — 임팩트/노력: P1 브랜딩+manifest 홈화면 설치 [high/S] · P2 온보딩 체크리스트(빈 선반 깔때기 수리) [high/S] · P3 선반에서 빼기 버튼(API 완성·UI 0건) [high/S] · P6 완료 시 피부 컨디션 1탭 기록(비전 "상태 추적" 첫 조각, 006 마이그레이션) [high/M] · P4 이어서 하기 실제 재개 [medium/S] · P5 타이머 종료 진동/비프 [medium/S] · P7 상황별 루틴 프리셋(생리기간·환절기 — 모델·저장 완성, 입구만 부재) [medium/S] · P8 streak [medium/S] · P10 성분 검색 입구 [medium/S] · P12 단계 건너뛰기(달성률 정직화) [medium/M] · P13 개봉일·PAO 알림 [medium/M] · P9 실측 소요 시간 표시 [low/S] · P11 완료 공유(Web Share) [low/S] · P14 "Glow" 인사 정리 [low/S]

**운영 (P15~P25)** — P15 DB 백업 전무(mariadb-dump 크론+호스트 밖 보관) [high/S] · P16 롤백 절차(workflow_dispatch+재태그) [high/S] · P17 mariadb:latest → 11.3.2 핀(compose 주석의 조건이 충족됨) [high/S] · P20 deploy.sh 에 image prune(디스크 91%) [high/S] · P18 마이그레이션 002~005 자동 적용(이미지에 싣기) [high/M] · P21 알림 3종(uptime 핑·디스크 크론·deploy 실패 웹훅) [high/M] · P19 앱 HEALTHCHECK [medium/S] · P22 Hub 단일 의존 완화(prev 태그) [medium/S] · P24 시크릿 로테이션 런북 [medium/S] · P23 compose/deploy.sh 드리프트 감지 [medium/M] · P25 복원 리허설 정례화 [low/S]

상세(rationale·구현 스케치)는 워크플로 산출 원문 참조 — 착수 결정된 항목은 이 문서에 개별 절로 옮겨 적을 것.

## 결정 필요 사항

- **Q1. 서비스명 통일** — metadata "Animal League" / SideNav "Dermis" / 사용자 명명 "youtine" 세 가지가 공존. 어느 이름으로 통일? (m17·P1 선행 조건)
- **Q2. 리포트 하위탭 순서** — "피부 타입별"·"시너지" 탭이 [성분→제품→설명] 역순. 종합 탭처럼 [제품→성분→설명]으로 맞출지, 현행 유지할지.
- **Q3. 분석 실패 배너 색** — `.generateError` 는 빨간 배경 유지 중(본문 alert 와 다른 용도). 유지 여부.
- **Q4. 홈 useProducts 포커스 재검증** — 기본값(켜짐) 유지 or AI_SWR 처럼 끄기(DB 재조회일 뿐이라 실해 없음 — 취향).
- **Q5. Major 수정 착수 범위** — M1~M9 일괄 vs 데이터 손실군(M2·M3·M7)부터.

## 권장 수정 순서

1. **데이터 손실군: M2 → M3 → M7 → m4** — 사용자 데이터가 실제로 사라지는 경로. 수정도 각각 작다(카운트 대조·mutate 4줄·재시도 배너).
2. **프라이버시·잠금군: M5 → M6 → M1** — 카메라 상시 점등·페이지 잠금은 체감 최악, M1 은 서버 디스크의 사진 사본.
3. **정합성군: M4 → M9 → m10 → m11** — 홈 영구 "분석 중"과 빈 제품 목록 등 "앱이 이상하다"로 보이는 것들.
4. **CI/배포군: M8 → m21 → m19 → m24 (+P17·P20 은 결정 후)** — 시크릿 스캔 구멍이 우선.
5. Minor 나머지는 화면 단위로 묶어 처리(루틴군 m13~~m15, 접근성군 m9·m16·m18, 입력 검증군 m1~~m3).

## 진행 상태

- [x] 리뷰 실행 + 적대 검증 + 의도 대조 + 실측 (2026-08-20). 워크플로 46 에이전트(파인더 8·스카우트 2·검증 36) + refuter 6 + prober 1.
- [ ] 수정 착수 — 사용자 결정 대기 (Q5).
