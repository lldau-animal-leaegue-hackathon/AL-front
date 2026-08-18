"use client";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { useSkinProfile } from "@/lib/data";

import card from "../../(home)/components/card.module.css";
import { EmptyState } from "./EmptyState";
import styles from "./SkinProfileSection.module.css";

/**
 * 피부 프로필 — 루틴 생성 때 입력한 `wonder`(피부 고민)·`usableTime`(가용 시간).
 *
 * 이 두 값은 루틴을 한 번이라도 만들어야 생긴다(`saveSkinProfile` 은 루틴 생성
 * 성공 시에만 호출된다). 그래서 `null` 은 "아직 루틴을 만든 적 없음"과 같다 —
 * 실패가 아니라 첫 사용자의 기본 상태다.
 */
export function SkinProfileSection() {
  const { ready, value: profile, error, retry } = useSkinProfile();

  // 아직 서버 응답 전이다. "없음"으로 단정하면 빈 상태가 깜빡였다 사라진다.
  if (!ready) return <DataState loading label="피부 프로필" />;
  // ⚠️ error 를 안 보면 네트워크 실패가 "아직 루틴을 만든 적 없음"으로 위장된다.
  if (error)
    return <DataState error onRetry={retry} label="피부 프로필" />;

  if (!profile) {
    return (
      <EmptyState
        icon="face_retouching_natural"
        title="아직 피부 프로필이 없어요"
        text="루틴을 만들면 그때 입력한 피부 고민과 가용 시간이 여기 표시돼요."
        ctaHref="/routine/new"
        ctaLabel="루틴 만들기"
      />
    );
  }

  return (
    <div className={styles.grid}>
      <div className={`${card.card} ${styles.card}`}>
        <Icon name="healing" className={styles.cornerIcon} />
        <h3 className={`${card.label} ${styles.overline}`}>피부 고민</h3>
        <p className={styles.wonder}>{profile.wonder}</p>
      </div>

      <div className={`${card.card} ${styles.card} ${styles.timeCard}`}>
        <Icon name="schedule" className={styles.cornerIcon} />
        <h3 className={`${card.label} ${styles.overline}`}>가용 시간</h3>
        <ul className={styles.timeList}>
          <li className={`${card.label} ${styles.timeTag}`}>
            아침 {profile.usableTime.morning}
          </li>
          <li className={`${card.label} ${styles.timeTag}`}>
            저녁 {profile.usableTime.evening}
          </li>
        </ul>
      </div>
    </div>
  );
}
