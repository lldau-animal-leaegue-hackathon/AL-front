import type { Route } from "next";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";

import { HowToList } from "../../components/HowToList";
import { RunHeader } from "../../components/RunHeader";
import { StepActions } from "../../components/StepActions";
import { StepTimer } from "../../components/StepTimer";
import { ROUTINES, SLOT_LABEL, isSlot } from "../../routines";
import styles from "./page.module.css";

/** 모든 단계를 미리 생성한다 — 개수가 적고 고정이라 정적 프리렌더가 이득이다. */
export function generateStaticParams() {
  return Object.entries(ROUTINES).flatMap(([slot, steps]) =>
    steps.map((_, index) => ({ slot, step: String(index + 1) })),
  );
}

export default async function RoutineStepPage({
  params,
}: PageProps<"/routine/[slot]/[step]">) {
  const { slot, step } = await params;

  if (!isSlot(slot)) notFound();

  const steps = ROUTINES[slot];
  const index = Number(step) - 1;
  // 범위를 벗어난 단계로 직접 들어오면 404 (URL을 손으로 고친 경우)
  if (!Number.isInteger(index) || index < 0 || index >= steps.length)
    notFound();

  const current = steps[index];
  const next = steps[index + 1];

  return (
    <>
      <RunHeader
        title={SLOT_LABEL[slot]}
        step={index + 1}
        total={steps.length}
      />

      <main className={styles.main}>
        <div className={styles.visual}>
          {/* 제품 사진 자리. 제품 데이터가 붙으면 이미지로 교체한다. */}
          <div className={styles.photo}>
            <Icon name={current.icon} filled className={styles.photoIcon} />
            <StepTimer seconds={current.timerSeconds} />
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.intro}>
            <p className={styles.meta}>
              <span className={styles.category}>{current.category}</span>
              <span className={styles.duration}>약 {current.minutes}분</span>
            </p>
            <h2 className={styles.product}>{current.productName}</h2>
            <p className={styles.description}>{current.description}</p>
          </div>

          <aside className={styles.expert}>
            <span className={styles.expertBadge} aria-hidden="true">
              <Icon name="spa" filled size="sm" />
            </span>
            <div>
              <p className={styles.expertLabel}>전문가 팁</p>
              <p className={styles.expertText}>{current.expertTip}</p>
            </div>
          </aside>

          {/* 단계가 바뀌면 체크 상태를 초기화한다 */}
          <HowToList key={current.id} items={current.howTo} />
        </div>
      </main>

      <StepActions
        nextHref={
          next
            ? (`/routine/${slot}/${index + 2}` as Route)
            : ("/routine" as Route)
        }
        nextLabel={next?.productName}
        prevHref={
          index > 0 ? (`/routine/${slot}/${index}` as Route) : undefined
        }
      />
    </>
  );
}
