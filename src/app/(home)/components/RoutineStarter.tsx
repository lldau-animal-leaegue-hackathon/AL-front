"use client";

import { useEffect, useState } from "react";

import card from "./card.module.css";
import styles from "./RoutineStarter.module.css";

/**
 * 현재 시각.
 *
 * 홈에서 유일하게 클라이언트가 필요한 조각이라 이 컴포넌트만 분리했다
 * (서버에서 시각을 렌더하면 하이드레이션 시점과 어긋난다).
 *
 * ⚠️ 예전에는 여기 "모닝 루틴 시작하기" 버튼이 있었는데 **삭제된 시드 루틴 id
 * (`/routine/daily-am/1`)로 하드코딩**돼 있어, 누르면 "이 단계를 찾을 수 없어요"가 떴다.
 * 링크만 고치는 대신 버튼을 뺐다 — 바로 아래 `NextStepCard` 가 저장된 루틴에서
 * 시간대에 맞는 것을 골라 "시작하기 / 이어서 하기"를 이미 더 정확하게 제공한다.
 * 시작 버튼이 둘이면 어느 것을 눌러야 하는지 헷갈리고, 서로 다른 루틴으로 갈 수도 있다.
 */
export function RoutineStarter() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={`${card.card} ${styles.section}`}>
      <div className={styles.clock}>
        {/* 마운트 전에는 자리만 잡아둔다 — 서버/클라이언트 시각 불일치 방지 */}
        <div className={styles.time}>{now ?? "--:--"}</div>
        <p className={`${card.label} ${styles.caption}`}>현재 시각</p>
      </div>
    </section>
  );
}
