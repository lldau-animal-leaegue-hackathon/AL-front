import styles from "./IngredientChip.module.css";

/**
 * 성분 마커 칩 — **DESIGN.md Components:Chips 스펙의 첫 구현**이다:
 * "pill-shaped markers for ingredients … Warm Sand background at 20% opacity
 *  with Deep Navy text."
 *
 * 기존 칩 4종(ProductCard·RoutineCard·productModal·ProductForm)은 전부 제각각이고
 * 스펙 일치가 0건이다(감사 2026-08-20). 그쪽 통일은 design-debt 백로그로 두고,
 * 새 화면(리포트·성분 사전)은 처음부터 스펙대로 간다.
 *
 * `scan/` 에서 이리로 옮겼다(2026-08-20) — 성분 상세 모달·고민 사전도 쓰게 되면서
 * 한 라우트 전용이 아니게 됐다.
 *
 * `onSelect` 가 있으면 버튼이 된다(누르면 성분 상세). 없으면 표시 전용 span 이다 —
 * 이미 버튼인 줄 안(suggestionHead 등)에서는 **중첩 버튼이 되므로 넘기지 말 것**.
 */
export function IngredientChip({
  name,
  onSelect,
}: {
  name: string;
  onSelect?: () => void;
}) {
  if (!onSelect) return <span className={styles.chip}>{name}</span>;

  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.clickable}`}
      onClick={onSelect}
    >
      {name}
    </button>
  );
}
