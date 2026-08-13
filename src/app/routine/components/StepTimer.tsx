"use client";

import { useEffect, useState } from "react";

import styles from "./StepTimer.module.css";

function format(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** 단계별 권장 시간 타이머. 누르면 시작/일시정지, 다 끝나면 눌러서 초기화한다. */
export function StepTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const finished = left === 0;
  const label = finished
    ? "완료"
    : running
      ? "일시정지"
      : left === seconds
        ? "시작"
        : "계속";

  return (
    <button
      type="button"
      className={`${styles.timer} ${running ? styles.running : ""} ${finished ? styles.finished : ""}`}
      onClick={() => (finished ? setLeft(seconds) : setRunning((p) => !p))}
      aria-label={`타이머 ${label}`}
    >
      <span className={styles.time}>{format(left)}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
