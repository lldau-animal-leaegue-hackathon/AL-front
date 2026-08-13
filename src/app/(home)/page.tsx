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
  summary: "수분 상태가 아주 좋아요. 오늘 저녁엔 장벽 회복에 집중해 보세요.",
  weeklyDelta: 5,
};

const NEXT_STEP = {
  productName: "히알루론산 세럼",
  instruction: "촉촉한 피부에 2~3방울 발라 수분을 가둬 주세요.",
  tags: ["수분"],
  step: 2,
  totalSteps: 4,
};

const ALERTS: readonly IngredientAlert[] = [
  {
    kind: "warning",
    title: "변성 알코올",
    detail:
      "최근 스캔한 '매트 선크림'에 들어 있어요. 건조함을 유발할 수 있습니다.",
  },
  {
    kind: "conflict",
    title: "레티놀 + AHA",
    detail: "나이트 루틴에서 충돌이 감지됐어요. 함께 사용하지 마세요.",
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
