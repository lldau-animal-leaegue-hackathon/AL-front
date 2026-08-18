/**
 * 루틴 (임시 시드 데이터).
 * 사용자가 진단 결과에 따라 여러 루틴을 뽑아 두는 구조라, 루틴을 배열로 들고 있다.
 * 백엔드가 생기면 이 파일만 API 호출로 교체한다.
 */

export type RoutineStep = {
  id: string;
  productName: string;
  /** 단계 분류 칩 — "클렌징", "토너" 등 */
  category: string;
  /** 대표 성분 칩 */
  ingredient: string;
  /** 목록 카드에 쓰는 한 줄 요약 */
  tip: string;
  /** 수행 화면에 쓰는 제품 설명 */
  description: string;
  /** 수행 화면의 전문가 팁 */
  expertTip: string;
  /** 순서대로 체크하는 사용법 */
  howTo: readonly string[];
  /** 예상 소요 시간(분) */
  minutes: number;
  /** 타이머 기본값(초) */
  timerSeconds: number;
  /** Material Symbols 아이콘 이름 */
  icon: string;
};

/** 단계는 여러 루틴이 공유한다 — 같은 제품이면 같은 객체를 재사용한다. */
const STEP = {
  cleansingOil: {
    id: "cleansing-oil",
    productName: "클렌징 오일",
    category: "1차 세안",
    ingredient: "호호바 오일",
    tip: "마른 피부에 마사지한 뒤 미온수로 헹궈 주세요.",
    description:
      "선크림과 메이크업은 물로 지워지지 않습니다. 기름으로 먼저 녹여내는 단계입니다.",
    expertTip:
      "반드시 마른 손, 마른 얼굴에서 시작하세요. 물이 섞이면 유화가 먼저 일어나 세정력이 떨어집니다.",
    howTo: [
      "마른 얼굴에 2~3펌프를 올립니다.",
      "60초간 부드럽게 굴리며 녹여냅니다.",
      "미온수를 조금씩 섞어 유화한 뒤 헹굽니다.",
    ],
    minutes: 2,
    timerSeconds: 60,
    icon: "water_drop",
  },
  foamCleanser: {
    id: "foam-cleanser",
    productName: "퓨리파잉 폼 클렌저",
    category: "클렌징",
    ingredient: "아미노산 계면활성제",
    tip: "촉촉한 피부에 원을 그리며 부드럽게 발라 주세요.",
    description:
      "밤새 쌓인 노폐물을 씻어내되, 피부가 원래 가진 수분 장벽은 지켜 주세요.",
    expertTip:
      "아래에서 위로 원을 그리며 60초간 마사지하세요. 미세 순환이 좋아지고 피지가 충분히 녹아 나옵니다.",
    howTo: [
      "미온수로 얼굴과 목을 적십니다.",
      "젖은 손에 한 펌프를 덜어 풍성하게 거품을 냅니다.",
      "깨끗이 헹군 뒤 마른 수건으로 가볍게 눌러 물기를 닦습니다.",
    ],
    minutes: 1,
    timerSeconds: 30,
    icon: "water_drop",
  },
  mildCleanser: {
    id: "mild-cleanser",
    productName: "저자극 폼 클렌저",
    category: "2차 세안",
    ingredient: "아미노산 계면활성제",
    tip: "거품을 충분히 낸 뒤 30초 안에 마무리하세요.",
    description:
      "오일과 남은 잔여물을 씻어내 다음 단계가 흡수될 자리를 만듭니다.",
    expertTip:
      "30초를 넘기지 마세요. 오래 문지를수록 필요한 피지까지 씻겨 나갑니다.",
    howTo: [
      "젖은 손에 한 펌프를 덜어 거품을 냅니다.",
      "T존부터 30초 안에 짧게 세안합니다.",
      "미온수로 충분히 헹굽니다.",
    ],
    minutes: 1,
    timerSeconds: 30,
    icon: "bubble_chart",
  },
  toner: {
    id: "toner",
    productName: "약산성 진정 토너",
    category: "토너",
    ingredient: "판테놀",
    tip: "화장솜 없이 손바닥으로 눌러 흡수시켜 주세요.",
    description:
      "세안 후 흐트러진 pH를 되돌리고, 다음 단계가 잘 스며들 바탕을 만듭니다.",
    expertTip:
      "세안 후 30초 안에 바르세요. 피부가 마르기 전에 발라야 수분이 갇힙니다.",
    howTo: [
      "손바닥에 500원 동전 크기만큼 덜어냅니다.",
      "얼굴 안쪽에서 바깥쪽으로 펴 바릅니다.",
      "손바닥 온기로 3~4회 눌러 흡수시킵니다.",
    ],
    minutes: 1,
    timerSeconds: 20,
    icon: "opacity",
  },
  vitaminC: {
    id: "vitamin-c",
    productName: "비타민 C 세럼",
    category: "세럼",
    ingredient: "L-아스코르빈산 15%",
    tip: "가볍게 두드려 흡수시키고 1분 정도 기다려 주세요.",
    description:
      "낮 동안의 자외선·미세먼지로 생기는 산화 스트레스를 막아 주는 단계입니다.",
    expertTip:
      "문지르지 말고 두드리세요. 고농도 비타민 C는 마찰에 자극이 될 수 있습니다.",
    howTo: [
      "3~4방울을 손끝에 덜어냅니다.",
      "이마·양볼·턱에 나눠 올립니다.",
      "두드려 흡수시키고 1분간 기다립니다.",
    ],
    minutes: 2,
    timerSeconds: 60,
    icon: "flare",
  },
  cicaAmpoule: {
    id: "cica-ampoule",
    productName: "시카 진정 앰플",
    category: "앰플",
    ingredient: "센텔라아시아티카 5%",
    tip: "붉어진 부위에 한 겹 더 올려 주세요.",
    description:
      "호르몬 변화로 예민해진 피부의 붉은기를 가라앉히는 단계입니다. 기능성 성분 대신 진정에만 집중합니다.",
    expertTip:
      "생리 기간엔 새로운 제품을 시도하지 마세요. 평소 잘 맞던 진정 제품만 쓰는 편이 안전합니다.",
    howTo: [
      "3~4방울을 덜어 손바닥에 폅니다.",
      "얼굴 전체에 감싸듯 눌러 흡수시킵니다.",
      "붉어진 부위에만 한 겹 더 올립니다.",
    ],
    minutes: 2,
    timerSeconds: 60,
    icon: "spa",
  },
  retinol: {
    id: "retinol",
    productName: "레티놀 앰플",
    category: "앰플",
    ingredient: "레티놀 0.1%",
    tip: "눈가는 피하고, 주 2회부터 시작하세요.",
    description:
      "밤에만 쓰는 단계입니다. 레티놀은 빛에 약하고 낮에 쓰면 자극이 커집니다.",
    expertTip:
      "처음이라면 주 2회로 시작해 4주에 걸쳐 늘리세요. 붉어짐이나 각질이 생기면 빈도를 줄입니다. AHA·비타민 C와 같은 날 쓰지 마세요.",
    howTo: [
      "완전히 마른 피부에 2방울을 덜어냅니다.",
      "눈가와 입가를 피해 얇게 펴 바릅니다.",
      "5분 기다린 뒤 다음 단계로 넘어갑니다.",
    ],
    minutes: 5,
    timerSeconds: 300,
    icon: "nightlight",
  },
  hydrationMask: {
    id: "hydration-mask",
    productName: "수분 충전 시트마스크",
    category: "마스크",
    ingredient: "저분자 히알루론산",
    tip: "15분만 올리고 마르기 전에 떼어 주세요.",
    description:
      "한 주 동안 빠진 수분을 몰아서 채우는 단계입니다. 매일 하는 것보다 주 1~2회가 낫습니다.",
    expertTip:
      "시트가 마르면 오히려 피부 수분을 뺏어 갑니다. 20분을 넘기지 마세요.",
    howTo: [
      "토너 단계 뒤에 시트를 얼굴에 밀착시킵니다.",
      "15분간 그대로 둡니다.",
      "떼어낸 뒤 남은 에센스를 두드려 흡수시킵니다.",
    ],
    minutes: 15,
    timerSeconds: 900,
    icon: "self_care",
  },
  barrierCream: {
    id: "barrier-cream",
    productName: "배리어 크림",
    category: "크림",
    ingredient: "세라마이드",
    tip: "아래에서 위로 쓸어 올리며 마사지해 주세요.",
    description:
      "앞 단계의 수분을 가두고 하루 동안 장벽이 무너지지 않게 합니다.",
    expertTip:
      "건조한 부위에만 한 겹 더 올리세요. 전체에 두껍게 바르면 T존이 답답해집니다.",
    howTo: [
      "완두콩 크기만큼 덜어냅니다.",
      "얼굴 전체에 얇게 펴 바릅니다.",
      "건조한 부위에만 한 겹 더 올립니다.",
    ],
    minutes: 1,
    timerSeconds: 30,
    icon: "shield",
  },
  nightCream: {
    id: "night-cream",
    productName: "나이트 리페어 크림",
    category: "크림",
    ingredient: "펩타이드",
    tip: "자기 전 도톰하게 발라 수분을 가둬 주세요.",
    description:
      "자는 동안 진행되는 회복을 돕고, 앞 단계의 성분이 날아가지 않게 덮습니다.",
    expertTip:
      "레티놀을 쓴 날엔 한 겹 더 올리세요. 건조함이 자극으로 이어지는 걸 막아 줍니다.",
    howTo: [
      "체리 크기만큼 덜어냅니다.",
      "얼굴과 목에 도톰하게 펴 바릅니다.",
      "손바닥으로 감싸 흡수시킵니다.",
    ],
    minutes: 1,
    timerSeconds: 30,
    icon: "bedtime",
  },
  sunscreen: {
    id: "sunscreen",
    productName: "에어리 선크림 SPF50+",
    category: "선케어",
    ingredient: "무기자차 필터",
    tip: "외출 15분 전, 충분한 양을 발라 주세요.",
    description:
      "앞의 모든 단계를 지키는 마지막 방어선입니다. 이 단계를 빠뜨리면 나머지가 무의미해집니다.",
    expertTip:
      "권장량은 얼굴 기준 검지 두 마디 분량입니다. 대부분 이보다 적게 발라 표시된 차단 지수가 안 나옵니다.",
    howTo: [
      "검지 두 마디 분량을 덜어냅니다.",
      "얼굴 전체에 문지르지 말고 펴 바릅니다.",
      "목과 귀 뒤까지 이어서 바릅니다.",
    ],
    minutes: 1,
    timerSeconds: 30,
    icon: "wb_sunny",
  },
} satisfies Record<string, RoutineStep>;

export type Routine = {
  id: string;
  name: string;
  /** 언제 쓰는 루틴인지 — 카드 칩 */
  condition: string;
  /** 아침/저녁 — 아이콘과 라벨을 여기서 파생시킨다 */
  time: "am" | "pm";
  /** 이 루틴을 왜 뽑았는지 한 줄 */
  summary: string;
  steps: readonly RoutineStep[];
};

export const TIME_LABEL: Record<Routine["time"], string> = {
  am: "아침",
  pm: "저녁",
};

export const TIME_ICON: Record<Routine["time"], string> = {
  am: "light_mode",
  pm: "dark_mode",
};

export const ROUTINES: readonly Routine[] = [
  {
    id: "daily-am",
    name: "평소 아침 루틴",
    condition: "평소",
    time: "am",
    summary: "하루를 여는 기본 루틴. 항산화와 자외선 차단에 집중합니다.",
    steps: [
      STEP.foamCleanser,
      STEP.toner,
      STEP.vitaminC,
      STEP.barrierCream,
      STEP.sunscreen,
    ],
  },
  {
    id: "daily-pm",
    name: "평소 저녁 루틴",
    condition: "평소",
    time: "pm",
    summary: "하루치 노폐물을 지우고 자는 동안의 회복을 돕습니다.",
    steps: [
      STEP.cleansingOil,
      STEP.mildCleanser,
      STEP.toner,
      STEP.retinol,
      STEP.nightCream,
    ],
  },
  {
    id: "period-am",
    name: "생리 아침 루틴",
    condition: "생리 기간",
    time: "am",
    summary:
      "예민해진 피부를 위해 비타민 C를 빼고 진정 단계로 바꾼 아침 루틴입니다.",
    steps: [
      STEP.foamCleanser,
      STEP.toner,
      STEP.cicaAmpoule,
      STEP.barrierCream,
      STEP.sunscreen,
    ],
  },
  {
    id: "period-pm",
    name: "생리 저녁 루틴",
    condition: "생리 기간",
    time: "pm",
    summary: "레티놀을 쉬고 장벽 회복에만 집중하는 저녁 루틴입니다.",
    steps: [
      STEP.cleansingOil,
      STEP.mildCleanser,
      STEP.toner,
      STEP.cicaAmpoule,
      STEP.nightCream,
    ],
  },
  {
    id: "weekend-pm",
    name: "주말 수분 충전 루틴",
    condition: "주 1~2회",
    time: "pm",
    summary: "시간이 있는 날, 시트마스크로 한 주치 수분을 몰아서 채웁니다.",
    steps: [
      STEP.cleansingOil,
      STEP.mildCleanser,
      STEP.toner,
      STEP.hydrationMask,
      STEP.nightCream,
    ],
  },
];

export function findRoutine(id: string): Routine | undefined {
  return ROUTINES.find((routine) => routine.id === id);
}

/** 카드·헤더에 쓰는 총 소요 시간(분) */
export function totalMinutes(routine: Routine): number {
  return routine.steps.reduce((sum, step) => sum + step.minutes, 0);
}
