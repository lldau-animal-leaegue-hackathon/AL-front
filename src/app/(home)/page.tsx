import {
  IngredientAlerts,
  type IngredientAlert,
} from "./components/IngredientAlerts";
import { NextStepCard } from "./components/NextStepCard";
import { RoutineStarter } from "./components/RoutineStarter";
import { ScanCard } from "./components/ScanCard";
import { SkinHealthCard } from "./components/SkinHealthCard";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import styles from "./page.module.css";

// 백엔드 연동 전까지 쓰는 목업 데이터. API가 붙으면 이 블록만 걷어내면 된다.
const USER_NAME = "Glow";

const SKIN_HEALTH = {
  score: 82,
  summary:
    "Your hydration levels are optimal. Consider focusing on barrier repair this evening.",
  weeklyDelta: 5,
};

const NEXT_STEP = {
  productName: "Hyaluronic Acid Serum",
  instruction: "Apply 2-3 drops to damp skin for maximum hydration retention.",
  tags: ["Hydration"],
  step: 2,
  totalSteps: 4,
};

const ALERTS: readonly IngredientAlert[] = [
  {
    kind: "warning",
    title: "Alcohol Denat.",
    detail: "Found in recently scanned 'Matte Sunscreen'. May cause dryness.",
  },
  {
    kind: "conflict",
    title: "Retinol + AHA",
    detail: "Conflict detected in Evening Routine. Avoid using together.",
  },
];

export default function Home() {
  return (
    <>
      <TopAppBar userName={USER_NAME} />

      <main className={styles.main}>
        <div className={styles.full}>
          <RoutineStarter />
        </div>

        <div className={styles.wide}>
          <SkinHealthCard {...SKIN_HEALTH} />
        </div>

        <div className={styles.narrow}>
          <ScanCard />
        </div>

        <div className={styles.wide}>
          <NextStepCard {...NEXT_STEP} />
        </div>

        <div className={styles.narrow}>
          <IngredientAlerts alerts={ALERTS} />
        </div>
      </main>
    </>
  );
}
