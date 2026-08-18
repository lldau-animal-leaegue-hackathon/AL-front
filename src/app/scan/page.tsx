import type { Metadata } from "next";

import { PageHeader } from "./components/PageHeader";
import { ScanWorkspace } from "./components/ScanWorkspace";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "내 선반에 추가",
};

export default function ScanPage() {
  return (
    <>
      <PageHeader title="내 선반에 추가" />

      <main className={styles.main}>
        <ScanWorkspace />
      </main>
    </>
  );
}
