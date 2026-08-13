import Link from "next/link";

import { Icon } from "@/components/Icon";

import styles from "./ScannerCta.module.css";

/** 검색으로 못 찾은 제품을 카메라 OCR로 넘기는 진입점. */
export function ScannerCta() {
  return (
    <section className={styles.section}>
      {/* 목업의 블러 장식 원 — 순수 장식이라 스크린리더에서 감춘다 */}
      <div
        className={`${styles.blob} ${styles.blobPrimary}`}
        aria-hidden="true"
      />
      <div
        className={`${styles.blob} ${styles.blobSecondary}`}
        aria-hidden="true"
      />

      <div className={styles.copy}>
        <h3 className={styles.heading}>찾는 제품이 없나요?</h3>
        <p className={styles.description}>
          용기를 촬영하면 성분을 바로 분석해서 선반에 담아 드려요.
        </p>
      </div>

      <Link href="/testCamera" className={styles.cta}>
        <Icon name="photo_camera" filled />
        <span>카메라 열기</span>
      </Link>
    </section>
  );
}
