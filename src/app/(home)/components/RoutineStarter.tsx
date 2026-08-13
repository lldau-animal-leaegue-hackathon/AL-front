"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";

import card from "./card.module.css";
import styles from "./RoutineStarter.module.css";

/**
 * 현재 시각 + 루틴 시작 버튼.
 * 홈에서 유일하게 클라이언트가 필요한 조각이라 이 컴포넌트만 분리했다
 * (서버에서 시각을 렌더하면 하이드레이션 시점과 어긋난다).
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

      <Link href="/routine/am/1" className={styles.cta}>
        <Icon name="wb_sunny" />
        <span>모닝 루틴 시작하기</span>
      </Link>
    </section>
  );
}
