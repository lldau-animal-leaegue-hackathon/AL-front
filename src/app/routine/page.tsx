import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { RoutinePlanner } from "./components/RoutinePlanner";
import { WeekStrip } from "./components/WeekStrip";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Routine",
};

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
