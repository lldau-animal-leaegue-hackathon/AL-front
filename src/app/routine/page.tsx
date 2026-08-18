import type { Metadata } from "next";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import { RoutineCard } from "./components/RoutineCard";
import { WeekStrip } from "./components/WeekStrip";
import { ROUTINES } from "./routines";
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

        <section>
          <h2 className={styles.heading}>내 루틴 {ROUTINES.length}개</h2>
          <p className={styles.lead}>
            피부 상태와 상황에 맞춰 만들어 둔 루틴이에요. 카드를 펼치면 단계를
            볼 수 있습니다.
          </p>

          <ul className={styles.list}>
            {ROUTINES.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
