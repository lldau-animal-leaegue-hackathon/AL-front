/**
 * 스킨케어 도메인 공유 타입 — 이 파일이 정본이다.
 *
 * ⚠️ `src/app/routine/routines.ts` 에도 같은 이름의 `RoutineStep`·`Routine` 이 있으나
 *    그쪽은 **시드 데이터 전용 레거시**이며 Step 6(루틴 수행 실데이터화)에서 제거된다.
 *    새 코드는 반드시 여기(`@/types/skincare`)에서 import 한다.
 *
 * 프롬프트 출력은 snake_case, 프론트 모델은 camelCase 다.
 * `src/api/` 는 raw 응답을 그대로 반환하고 변환은 훅/컴포넌트에서 한다(AGENTS.md 컨벤션).
 * 필드 대응은 `ai-contract-check` 스킬의 출력 스키마 실측표를 따른다.
 */

/** 등록된 제품 — "제품 성분 추출" 프롬프트의 입력과 출력을 합친 것 */
export type Product = {
  id: string;

  /** 사용자 입력 (필수) */
  productName: string;
  /** 사용자 입력 (선택) — mL 단위 문자열. "150" 처럼 숫자만 오기도 한다 */
  capacity?: string;
  /** 사용자 입력 (선택) */
  productCompany?: string;
  /**
   * 긴 변 256px JPEG data URL. 원본은 저장하지 않는다(Q7).
   * AI 에는 원본을 보내고 여기엔 축소본만 남긴다 — localStorage 5MB 한계 때문.
   */
  thumbnail?: string;

  /** AI 추출 결과 — 자유 문자열이다. 열거형으로 좁히지 말 것 */
  category: string;
  /**
   * AI 추출 결과.
   * **빈 배열이 정상 응답이다** — 프롬프트 규칙 2가 "확신이 없으면 []" 를 요구한다.
   * 실패로 처리하면 설계 의도를 위배한다.
   */
  ingredients: string[];

  /** "제품 사용 주의 사항" 프롬프트 결과. 지연 생성이라 optional (최대 6개) */
  warnings?: string[];

  /** ISO 8601 */
  createdAt: string;
};

/** 아침/저녁. 프롬프트의 morning/evening 을 이 값으로 매핑한다 */
export type RoutineTime = "am" | "pm";

/** 루틴의 한 단계 — "스킨케어 루틴 작성" 프롬프트 출력 배열의 원소 1개 */
export type RoutineStep = {
  id: string;

  /** 단계 이름 겸 분류. 프롬프트 `routine_name` (예: "클렌징", "토너") */
  routineName: string;
  /** **초 단위** 정수. 프롬프트 `estimated_time` — 분이 아니다 */
  estimatedTime: number;
  /**
   * 이 단계에 쓰는 제품 **이름** 배열. 프롬프트 `using_product`.
   * ⚠️ id 가 아니라 이름 문자열이라 `Product` 매칭은 정규화 후 해야 하고,
   *    LLM 이 이름을 조금 바꿔 쓰면 못 찾는다. 못 찾아도 이름은 표시할 것.
   */
  usingProduct: string[];
  /** 순서대로 수행하는 사용법. 프롬프트 `how_to_use` (Q5 로 배열 확정) */
  howToUse: string[];
  /** 프롬프트 `tips` */
  tips: string[];
  /** 프롬프트 `warning` — 단수형 키인데 값이 배열이다(명세 그대로) */
  warning: string[];
};

/**
 * 저장된 루틴 1벌.
 * 래퍼 구조는 db9eaed(팀원 작업)에서 확정됐다 — 조건별로 여러 벌을 들 수 있다.
 * 프롬프트 1회 호출은 `{ morning, evening }` 을 주므로 **Routine 2개**로 펼쳐 저장한다.
 */
export type Routine = {
  id: string;
  /** 카드 제목. LLM 출력에 없어 생성 시점에 만든다 */
  name: string;
  /** 언제 쓰는 루틴인지 — 카드 칩. 예: "평소", "생리 기간" */
  condition: string;
  time: RoutineTime;
  /** 한 줄 설명. LLM 출력에 없어 생성 시점에 만든다 */
  summary: string;
  steps: RoutineStep[];
  /** ISO 8601. 시드 루틴에는 없을 수 있다 */
  createdAt?: string;
};

/**
 * 루틴 생성 입력 — 재생성 프리필과 프로필 "피부 프로필" 표시에 함께 쓴다.
 * 루틴 여러 벌이 같은 입력에서 나오므로 루틴에 중복 저장하지 않고 따로 둔다.
 */
export type SkinProfile = {
  /** 피부 고민 (프롬프트 `wonder`) */
  wonder: string;
  /** 투자 가능 시간 (프롬프트 `usable_time`) */
  usableTime: { morning: string; evening: string };
  /** ISO 8601 */
  updatedAt: string;
};

/** 루틴 수행 기록 1회 — Q10 의 주간 달성률이 이 기록에서 계산된다 */
export type RoutineRun = {
  id: string;
  routineId: string;
  /** ISO 8601 */
  startedAt: string;
  /** ISO 8601 */
  finishedAt: string;
  /** 완료 처리한 단계의 `RoutineStep.id` 목록 */
  completedStepIds: string[];
};
