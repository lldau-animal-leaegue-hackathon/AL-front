import styles from "./Icon.module.css";

type Props = {
  /** Material Symbols 아이콘 이름 (예: "home", "wb_sunny") */
  name: string;
  /** 채워진(FILL 1) 아이콘으로 그린다 — 주로 활성 탭 표시용 */
  filled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Material Symbols 아이콘.
 * 폰트는 layout.tsx에서 CDN으로 불러오고, 여기서는 전역 클래스만 붙인다.
 * (전역 클래스라 CSS Module 스코프를 타지 않으므로 문자열로 직접 조합한다.)
 */
export function Icon({ name, filled, size = "md", className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={[
        "material-symbols-outlined",
        styles.icon,
        styles[size],
        filled ? styles.filled : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {name}
    </span>
  );
}
