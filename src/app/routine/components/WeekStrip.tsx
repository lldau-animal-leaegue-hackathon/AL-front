import { Icon } from "@/components/Icon";

import styles from "./WeekStrip.module.css";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type Day = { date: number; state: "done" | "today" | "upcoming" };

/**
 * 이번 주 월요일부터 7일. 오늘 이전은 완료로 본다(백엔드 붙기 전 임시 규칙).
 *
 * 서버 타임존이 UTC여도 사용자 기준 날짜가 맞도록 Asia/Seoul로 고정한다.
 * 클라이언트에서 계산하면 하이드레이션 시점과 어긋나므로 서버에서만 구한다.
 */
function buildWeek(): Day[] {
  const seoul = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  // getDay()는 일요일이 0이라 월요일 시작으로 보정한다
  const offsetToMonday = (seoul.getDay() + 6) % 7;

  return DAY_LABELS.map((_, index) => {
    const date = new Date(seoul);
    date.setDate(seoul.getDate() - offsetToMonday + index);
    return {
      date: date.getDate(),
      state:
        index < offsetToMonday
          ? "done"
          : index === offsetToMonday
            ? "today"
            : "upcoming",
    };
  });
}

export function WeekStrip() {
  const week = buildWeek();

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>This Week&apos;s Progress</h2>

      <ol className={styles.days}>
        {week.map((day, index) => (
          <li key={index} className={styles.day}>
            <span
              className={`${styles.label} ${day.state === "today" ? styles.labelToday : ""}`}
            >
              {DAY_LABELS[index]}
            </span>
            <span className={`${styles.marker} ${styles[day.state]}`}>
              {day.state === "done" ? <Icon name="check" size="sm" /> : day.date}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
