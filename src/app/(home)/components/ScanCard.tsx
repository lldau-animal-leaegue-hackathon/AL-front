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
        <h3 className={styles.heading}>Scan Your Products</h3>
        <p className={styles.description}>
          Instantly analyze ingredients and compatibility.
        </p>
      </div>

      <Link href="/testCamera" className={styles.cta}>
        <span>Start Scan</span>
        <Icon name="arrow_forward" size="sm" />
      </Link>
    </section>
  );
}
