# DESIGN.md 준수 부채 백로그

2026-08-20 전수 감사(워크플로, CSS Module 전 파일 ↔ DESIGN.md 대조) 결과 중
**이번 계획에서 고치지 않기로 한 것**(Q5 결정: 백로그 분리)을 옮겨 둔다.
착수 시 이 문서를 계획서 삼아 도메인별로 분할 커밋한다.

이미 고친 것: ~~다크에서 DataState 재시도 버튼 호버 시 글자 소실(높음)~~ — Step 0.
새 UI(IngredientChip)는 처음부터 칩 스펙대로 구현했다.

## 보통 — 눈에 보이는 스펙 불일치

- [ ] **칩 4종 통일** — DESIGN.md:154 "pill · Warm Sand 20% · Deep Navy" 인데
      구현이 전부 제각각(스펙 일치 0건):
      `ProductCard.chip`(radius-md·surface-variant 50%) /
      `RoutineCard.chip`(radius-md·secondary-container 40%) /
      `productModal.chip`(radius-full·secondary-container 100%) /
      `ProductForm.required`(radius-full·primary-fixed).
      → 새로 만든 `IngredientChip` 으로 수렴시키되, "성분 마커"가 아닌 것(카테고리
      칩·필수 표시)은 스펙 적용 대상인지 먼저 판정할 것.
- [ ] **임의 font-size 15곳+** — 타입 스케일(12/16/18/24/32/48) 밖 값
      (9·10·13·14·15px)이 산재. `font: var(--text-body-md)` 선언 뒤 `font-size` 로
      덮어 토큰을 무력화하는 패턴. → 13~15px 수요가 실재하므로 **스케일에
      `--text-body-sm` 급을 추가**하는 쪽이 현실적. DESIGN.md 개정과 같이 갈 것.
- [ ] **그림자 하드코딩 2건** — `BottomNav`·`StepActions` 의
      `box-shadow: … rgb(26 43 68 / 4%)` 리터럴이 다크 재정의(`--shadow-card`)를
      우회 → 다크에서 그 두 바만 그림자가 사실상 소멸.
- [ ] **모달 스펙 미달** — `productModal.sheet` 가 radius-lg(16px, 규정 xl=24px),
      패딩 12/20px(규정 32px).
- [ ] **루틴 카드 스펙 괴리** — 우상단 24px 아이콘(현재 좌측 40px 배지), 하단
      Sage 진행바 미구현. 수동 완료 버튼 제거는 문서화된 결정이므로 진행바를
      "오늘 완료" 표시와 연결할지 제품 판단 필요.

## 낮음 — 기록해 두는 수준

- [ ] `DataState` radius 리터럴(16px·999px) → 토큰으로
- [ ] `ProductSearch` 인풋 포커스 글로우 없음(ProductForm 은 있음 — 두 화면 갈라짐)
- [ ] `PageHeader` 가 deprecated 토큰(`--margin-mobile/-desktop`) 사용
- [ ] 본문 행간 1.5x/1.6x 혼재(globals `line-height: 1.6` vs 토큰 1.5x)
- [ ] `ProductForm` 파일 버튼·카메라 버튼이 DESIGN.md 버튼 2종 어디에도 없는 변형
- [ ] `CameraCapture` `#000` 리터럴(의도는 타당 — 근거 주석만 추가)
- [ ] `IngredientProducts` `@media 600px` — 브레이크포인트 단일 출처(480/768/1024/1280) 밖

## DESIGN.md 자체의 문제 (코드가 아니라 문서를 고칠 것)

- 내부 모순: 인풋 채움 `#F1F3F5` 가 팔레트에 없음(코드는 근사 토큰 사용 중) /
  칩 "pill-shaped (`rounded-xl`)" — pill(full)과 xl(24px)은 다른 값.
- 의도적 이탈 미반영: Inter→Pretendard(한글), 제목 clamp() 유동화, 여백
  clamp(16px…) — 셋 다 globals.css 주석에 근거가 있으나 DESIGN.md 는 미개정.
- 공백: 탭/세그먼트 컴포넌트 규정 없음(현재 정본은 ScanTabs 선례), 모션(시간·이징)
  절 없음, 다크 팔레트 없음(globals 가 M3 대응으로 도출).
