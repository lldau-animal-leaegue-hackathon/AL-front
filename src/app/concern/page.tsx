import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { ConcernSection } from "./components/ConcernSection";
import { RecordsSection } from "./components/RecordsSection";
import { ReportSection } from "./components/ReportSection";
import { ShelfSection } from "./components/ShelfSection";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "내 고민",
};

// 다른 화면(예: 홈)과 이름을 맞춘 자리표시자 — 이 앱에는 로그인/사용자 이름
// 저장소가 없다. 실제 계정 시스템이 붙기 전까지는 하드코딩이 맞다.
const USER_NAME = "Glow";

/**
 * "내 고민" 화면 — 예전 프로필 자리다(`/profile` → `/concern`, 2026-08-19).
 *
 * ⚠️ **아직 옮겨 오기만 한 상태다.** 계획대로면 여기는 고민 등록 → 성분 추천 →
 * 제품 추천 → 루틴 생성으로 이어지는 흐름이 들어오고, 지금 있는 선반·리포트는
 * 스캔 탭으로, 기록은 루틴 탭으로 나간다
 * ([계획서](../../../docs/plans/2026-08-19-concern-flow/README.md) Step 3~6).
 * 한 번에 옮기면 되돌릴 수 없어 경로 이동만 먼저 한다.
 *
 * 각 섹션 본문만 클라이언트로 내린다 — `"use client"` 는 `components/*` 각 leaf 에 있고,
 * 이 페이지와 섹션 제목은 서버 컴포넌트로 남는다.
 */
export default function ConcernPage() {
  return (
    <>
      <TopAppBar userName={USER_NAME} />

      <main className={styles.main}>
        {/*
          이 탭의 메인이다 — 고민을 적으면 도움이 되는 성분을 찾아 준다.
          제목을 컴포넌트가 직접 갖는다(입력 화면과 결과 화면의 제목이 다르다).
        */}
        <ConcernSection />

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
