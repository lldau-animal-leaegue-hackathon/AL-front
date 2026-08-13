import Link from "next/link";

import { Icon } from "@/components/Icon";

import styles from "./ScanCard.module.css";

/** 성분 스캔 진입 카드. 실제 카메라 OCR 화면(/testCamera)으로 보낸다. */
export function ScanCard() {
  return (
    <section className={styles.section}>
      <div className={styles.body}>
        <div className={styles.badge}>
          <Icon name="center_focus_strong" filled />
        </div>
        <h3 className={styles.heading}>제품 성분 스캔</h3>
        <p className={styles.description}>
          성분과 조합 궁합을 바로 분석해 드려요.
        </p>
      </div>

      <Link href="/scan" className={styles.cta}>
        <span>스캔 시작</span>
        <Icon name="arrow_forward" size="sm" />
      </Link>
    </section>
  );
}
