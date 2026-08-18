import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { RoutineList } from "./components/RoutineList";
import { WeekStrip } from "./components/WeekStrip";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "루틴",
};

// 주간 스트립이 "오늘"을 표시한다. 정적 프리렌더하면 빌드 시점 날짜가 박히므로
// 요청마다 렌더한다.
export const dynamic = "force-dynamic";

/**
 * 루틴 목록.
 *
 * 루틴 자체는 localStorage 에 있어 `RoutineList` 만 클라이언트다 —
 * `"use client"` 를 페이지가 아니라 한 단계 아래 leaf 에 둔다.
 */
export default function RoutinePage() {
  return (
    <>
      <TopAppBar userName="Glow" />

      <main className={styles.main}>
        <WeekStrip />
        <RoutineList />
      </main>
    </>
  );
}
