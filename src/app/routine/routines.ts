/**
 * 루틴 단계 (임시 시드 데이터).
 * 백엔드가 생기면 이 파일만 API 호출로 교체한다.
 */

export type RoutineStep = {
  id: string;
  productName: string;
  /** 대표 성분 칩 */
  ingredient: string;
  /** 사용법 한 줄 */
  tip: string;
  /** Material Symbols 아이콘 이름 */
  icon: string;
};

export type Slot = "am" | "pm";

export const ROUTINES: Record<Slot, readonly RoutineStep[]> = {
  am: [
    {
      id: "am-1",
      productName: "Gentle Cleanser",
      ingredient: "Hyaluronic Acid",
      tip: "Apply to damp skin in circular motions.",
      icon: "water_drop",
    },
    {
      id: "am-2",
      productName: "Vitamin C Serum",
      ingredient: "L-Ascorbic 15%",
      tip: "Pat gently; let absorb for 1 min.",
      icon: "flare",
    },
    {
      id: "am-3",
      productName: "Barrier Cream",
      ingredient: "Ceramides",
      tip: "Massage in upward strokes.",
      icon: "shield",
    },
  ],
  pm: [
    {
      id: "pm-1",
      productName: "Cleansing Oil",
      ingredient: "Jojoba Oil",
      tip: "Massage on dry skin, then rinse with lukewarm water.",
      icon: "water_drop",
    },
    {
      id: "pm-2",
      productName: "Retinol Ampoule",
      ingredient: "Retinol 0.1%",
      tip: "Avoid the eye area. Start twice a week.",
      icon: "nightlight",
    },
    {
      id: "pm-3",
      productName: "Night Repair Cream",
      ingredient: "Peptides",
      tip: "Seal in with a thick layer before bed.",
      icon: "bedtime",
    },
  ],
};
