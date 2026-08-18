import { IngredientAlerts } from "./components/IngredientAlerts";
import { NextStepCard } from "./components/NextStepCard";
import { RoutineStarter } from "./components/RoutineStarter";
import { ScanCard } from "./components/ScanCard";
import { SkinHealthCard } from "./components/SkinHealthCard";

import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

import styles from "./page.module.css";

// 백엔드 연동 전까지 쓰는 목업 데이터. API가 붙으면 이 블록만 걷어내면 된다.
const USER_NAME = "Glow";

export default function Home() {
  return (
    <>
      <TopAppBar userName={USER_NAME} />

      <main className={styles.main}>
        <div className={styles.full}>
          <RoutineStarter />
        </div>

        <div className={styles.wide}>
          <SkinHealthCard />
        </div>

        <div className={styles.narrow}>
          <ScanCard />
        </div>

        <div className={styles.wide}>
          <NextStepCard />
        </div>

        <div className={styles.narrow}>
          <IngredientAlerts />
        </div>
      </main>
    </>
  );
}
