"use client";

import { Icon } from "@/components/Icon";
import { PROFILE_KEY } from "@/lib/storage/routines";
import { useStored } from "@/lib/storage/useStored";
import type { SkinProfile } from "@/types/skincare";

import card from "../../(home)/components/card.module.css";
import { EmptyState } from "./EmptyState";
import styles from "./SkinProfileSection.module.css";

const NO_PROFILE: SkinProfile | null = null;

/**
 * 피부 프로필 — 루틴 생성 때 입력한 `wonder`(피부 고민)·`usableTime`(가용 시간).
 *
 * 이 두 값은 루틴을 한 번이라도 만들어야 생긴다(`saveSkinProfile` 은 루틴 생성
 * 성공 시에만 호출된다). 그래서 `null` 은 "아직 루틴을 만든 적 없음"과 같다 —
 * 실패가 아니라 첫 사용자의 기본 상태다.
 */
export function SkinProfileSection() {
  const { ready, value: profile } = useStored<SkinProfile | null>(
    PROFILE_KEY,
    NO_PROFILE,
  );

  // 서버 렌더 단계에서는 저장소를 모른다. "없음"으로 단정하면 빈 상태가
  // 한 번 깜빡였다가 사라진다.
  if (!ready) return null;

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
