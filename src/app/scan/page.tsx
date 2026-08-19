import type { Metadata } from "next";

import { PageHeader } from "@/components/PageHeader/PageHeader";

import { ReportSection } from "./components/ReportSection";
import { ScanWorkspace } from "./components/ScanWorkspace";
import { ShelfSection } from "./components/ShelfSection";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "내 선반",
};

/**
 * 제품 등록과 그 결과를 한 탭에 둔다(Step 6).
 *
 * 선반·리포트는 예전에 프로필 탭에 있었다. 담는 곳과 담긴 것을 갈라 놓으면
 * 방금 등록한 제품이 어디로 갔는지 확인하러 탭을 옮겨야 한다.
 */
export default function ScanPage() {
  return (
    <>
      <PageHeader title="내 선반" />

      <main className={styles.main}>
        {/*
          id 는 선반·리포트의 "제품 추가"·"대체 제품 찾기"가 가리키는 앵커다.
          `ScanWorkspace` 는 프래그먼트라 id 를 받을 자리가 없어 여기서 감싼다 —
          감싸면 폼·검색이 .main 의 flex 자식에서 빠지므로 간격을 여기서 다시 준다.
        */}
        <div id="add" className={styles.addBlock}>
          <ScanWorkspace />
        </div>

        <section>
          <h2 className={styles.sectionTitle}>내 선반</h2>
          <div className={styles.sectionBody}>
            <ShelfSection />
          </div>
        </section>

        {/* 리포트는 데이터에 따라 배지·부제가 바뀌어 제목까지 컴포넌트가 갖는다. */}
        <section>
          <ReportSection />
        </section>
      </main>
    </>
  );
}
