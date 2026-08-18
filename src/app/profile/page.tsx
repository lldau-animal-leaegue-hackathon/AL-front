import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { RecordsSection } from "./components/RecordsSection";
import { ReportSection } from "./components/ReportSection";
import { ShelfSection } from "./components/ShelfSection";
import { SkinProfileSection } from "./components/SkinProfileSection";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "프로필",
};

// 다른 화면(예: 홈)과 이름을 맞춘 자리표시자 — 이 앱에는 로그인/사용자 이름
// 저장소가 없다. 실제 계정 시스템이 붙기 전까지는 하드코딩이 맞다.
const USER_NAME = "Glow";

/**
 * 프로필 화면.
 *
 * 모든 섹션이 localStorage 데이터를 보여주므로 각 섹션 본문만 클라이언트로
 * 내린다 — `"use client"` 는 `components/*` 각 leaf 에 있고, 이 페이지와 섹션
 * 제목은 서버 컴포넌트로 남는다.
 */
export default function ProfilePage() {
  return (
    <>
      <TopAppBar userName={USER_NAME} />

      <main className={styles.main}>
        <section>
          <h2 className={styles.sectionTitle}>피부 프로필</h2>
          <div className={styles.sectionBody}>
            <SkinProfileSection />
          </div>
        </section>

        {/* 리포트는 데이터에 따라 배지·부제가 바뀌어 제목까지 컴포넌트가 갖는다. */}
        <section>
          <ReportSection />
        </section>

        <section>
          <h2 className={styles.sectionTitle}>내 선반</h2>
          <div className={styles.sectionBody}>
            <ShelfSection />
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>기록</h2>
          <div className={styles.sectionBody}>
            <RecordsSection />
          </div>
        </section>
      </main>
    </>
  );
}
