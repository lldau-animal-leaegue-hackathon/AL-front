import styles from "./IngredientChip.module.css";

/**
 * 성분 마커 칩 — **DESIGN.md Components:Chips 스펙의 첫 구현**이다:
 * "pill-shaped markers for ingredients … Warm Sand background at 20% opacity
 *  with Deep Navy text."
 *
 * 기존 칩 4종(ProductCard·RoutineCard·productModal·ProductForm)은 전부 제각각이고
 * 스펙 일치가 0건이다(감사 2026-08-20). 그쪽 통일은 design-debt 백로그로 두고,
 * **새 화면(리포트 타입별·시너지)은 처음부터 스펙대로** 간다.
 */
export function IngredientChip({ name }: { name: string }) {
  return <span className={styles.chip}>{name}</span>;
}
