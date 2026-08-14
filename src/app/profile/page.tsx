import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/Icon";
import { TopAppBar } from "@/components/TopAppBar/TopAppBar";

// 홈 벤토 카드와 같은 모양이라 카드 스타일 모듈을 그대로 가져다 쓴다.
import card from "../(home)/components/card.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "프로필",
};

// 백엔드 연동 전까지 쓰는 목업 데이터. API가 붙으면 이 블록만 걷어내면 된다.
const USER_NAME = "Glow";

const SKIN = {
  baseType: "복합성",
  baseDetail:
    "T존은 유분이 많고 볼은 건조해요. 무거운 유분 없이 수분 균형을 잡아 주세요.",
  concern: "민감성",
  concernTags: ["홍조 잦음", "향료 민감"],
};

const SHELF = [
  {
    id: "1",
    name: "약산성 진정 클렌저",
    category: "클렌징",
    note: "세라마이드 · 히알루론산",
    icon: "soap",
    tone: "sand",
  },
  {
    id: "2",
    name: "배리어 리스토어 크림",
    category: "크림",
    note: "스쿠알란",
    icon: "spa",
    tone: "sage",
  },
  {
    id: "3",
    name: "바이탈리티 나이트 앰플",
    category: "세럼",
    note: "주의 성분 포함",
    icon: "science",
    tone: "neutral",
    flagged: true,
  },
] as const;

export default function ProfilePage() {
  return (
    <>
      <TopAppBar userName={USER_NAME} />

      <main className={styles.main}>
        <section>
          <h2 className={styles.sectionTitle}>피부 프로필</h2>

          <div className={styles.profileGrid}>
            <div className={`${card.card} ${styles.summaryCard}`}>
              <Icon
                name="face_retouching_natural"
                className={styles.cornerIcon}
              />
              <h3 className={`${card.label} ${styles.overline}`}>기본 타입</h3>
              <p className={styles.summaryValue}>{SKIN.baseType}</p>
              <p className={styles.summaryDetail}>{SKIN.baseDetail}</p>
            </div>

            <div
              className={`${card.card} ${styles.summaryCard} ${styles.concernCard}`}
            >
              <Icon name="healing" className={styles.cornerIcon} />
              <h3 className={`${card.label} ${styles.overline}`}>주요 고민</h3>
              <p className={styles.summaryValue}>{SKIN.concern}</p>
              <ul className={styles.tagList}>
                {SKIN.concernTags.map((tag) => (
                  <li key={tag} className={`${card.label} ${styles.tag}`}>
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={`${card.card} ${styles.report}`}>
          <div className={styles.reportHeader}>
            <span className={styles.reportBadge}>
              <Icon name="science" />
            </span>
            <div>
              <h2 className={card.cardTitle}>AI 분석 리포트</h2>
              <p className={`${card.label} ${styles.reportSubtitle}`}>
                복합성 · 민감성 프로필 기준 성분 적합도
              </p>
            </div>
          </div>

          <div className={styles.insight}>
            <h3 className={styles.insightTitle}>나이아신아마이드 적합</h3>
            <p className={styles.insightBody}>
              현재 루틴에 나이아신아마이드 5% 제품이 두 개 있어요. 민감도를
              자극하지 않으면서 T존 유분을 잡기에 적절한 양입니다.
            </p>
          </div>

          <div className={styles.alert}>
            <Icon name="warning" className={styles.alertIcon} />
            <div>
              <h3 className={styles.alertTitle}>자극 우려 성분</h3>
              <p className={styles.insightBody}>
                최근 추가한 나이트 크림에서 <strong>리모넨</strong>,{" "}
                <strong>리날룰</strong>이 발견됐어요. 민감성 피부에는 트러블을
                유발할 수 있는 향료 성분입니다.
              </p>
              <Link href="/scan" className={`${card.label} ${styles.alertCta}`}>
                대체 제품 찾기
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.shelfHeader}>
            <h2 className={styles.sectionTitle}>내 선반</h2>
            <button type="button" className={`${card.label} ${styles.viewAll}`}>
              전체 보기
              <Icon name="chevron_right" size="sm" />
            </button>
          </div>

          <ul className={styles.shelfGrid}>
            {SHELF.map((item) => (
              <li
                key={item.id}
                className={`${card.card} ${styles.shelfItem} ${
                  "flagged" in item ? styles.flagged : ""
                }`}
              >
                {"flagged" in item && (
                  <Icon
                    name="warning"
                    size="sm"
                    filled
                    className={styles.flag}
                  />
                )}
                <span className={styles.thumb}>
                  <Icon name={item.icon} />
                </span>
                <span
                  className={`${card.label} ${styles.chip} ${styles[item.tone]}`}
                >
                  {item.category}
                </span>
                <h3 className={styles.shelfName}>{item.name}</h3>
                <p
                  className={`${styles.shelfNote} ${
                    "flagged" in item ? styles.shelfNoteAlert : ""
                  }`}
                >
                  {item.note}
                </p>
              </li>
            ))}

            <li>
              <Link href="/scan" className={styles.addCard}>
                <span className={styles.addIcon}>
                  <Icon name="add" />
                </span>
                <span className={styles.shelfName}>제품 추가</span>
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
