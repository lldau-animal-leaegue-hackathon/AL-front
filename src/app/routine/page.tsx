import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { RoutinePlanner } from "./components/RoutinePlanner";
import { WeekStrip } from "./components/WeekStrip";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "루틴",
};

// 주간 스트립이 "오늘"을 표시한다. 정적 프리렌더하면 빌드 시점 날짜가 박히므로
// 요청마다 렌더한다.
export const dynamic = "force-dynamic";

export default function RoutinePage() {
  return (
    <>
      <TopAppBar userName="Glow" />

      <main className={styles.main}>
        <WeekStrip />
        <RoutinePlanner />
      </main>
    </>
  );
}
