"use client";

import { useState } from "react";

import { DataState } from "@/components/DataState/DataState";
import { Icon } from "@/components/Icon";
import { IngredientChip } from "@/components/IngredientChip/IngredientChip";
import { IngredientDetailModal } from "@/components/IngredientDetail/IngredientDetailModal";
import { useConcernKnowledge } from "@/lib/data";

import styles from "./ConcernDictionary.module.css";

/**
 * 고민별 성분 사전 — 자주 찾는 고민 8종의 도움 성분을 **AI 없이 즉시** 보여준다.
 *
 * 위의 자유 입력(AI, 10~30초)과 역할이 다르다: 여기는 공유 지식 테이블
 * (`ingredient_effects`)을 읽는 0원짜리 경로다. 내 고민이 흔한 고민이면 기다릴
 * 필요가 없고, 성분을 누르면 상세(시너지·충돌·타입별 주의·제품)로 이어진다.
 *
 * 목록은 **펼쳐야 불러온다** — 사전을 안 보는 사용자에게는 요청도 없다.
 */
export function ConcernDictionary() {
  const [open, setOpen] = useState(false);
  const knowledge = useConcernKnowledge(open);
  /** 펼친 시나리오. 하나만 연다 — 여러 개를 열면 목록이 길어져 비교가 어렵다. */
  const [scenario, setScenario] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const scenarios = knowledge.value?.scenarios ?? [];
  const current = scenarios.find((s) => s.scenario === scenario);

  return (
    <section className={styles.card}>
      {detail && (
        <IngredientDetailModal
          key={detail}
          name={detail}
          onClose={() => setDetail(null)}
        />
      )}

      <button
        type="button"
        className={styles.head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.headText}>
          <h2 className={styles.heading}>고민별 성분 사전</h2>
          <span className={styles.lead}>
            자주 찾는 고민의 성분을 기다림 없이 바로 볼 수 있어요.
          </span>
        </span>
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className={styles.chevron}
        />
      </button>

      {open && (
        <>
          {!knowledge.ready ? (
            <DataState loading label="성분 사전" />
          ) : knowledge.error ? (
            <DataState
              error
              onRetry={knowledge.retry}
              label="성분 사전"
              message={knowledge.errorMessage}
            />
          ) : (
            <>
              <div className={styles.scenarios}>
                {scenarios.map((item) => (
                  <button
                    key={item.scenario}
                    type="button"
                    className={
                      item.scenario === scenario
                        ? `${styles.scenario} ${styles.scenarioActive}`
                        : styles.scenario
                    }
                    aria-pressed={item.scenario === scenario}
                    onClick={() =>
                      setScenario(
                        item.scenario === scenario ? null : item.scenario,
                      )
                    }
                  >
                    {item.scenario}
                  </button>
                ))}
              </div>

              {current && (
                <ul className={styles.list}>
                  {current.ingredients.map((item) => (
                    <li key={item.name} className={styles.item}>
                      <p>
                        {/* 누르면 성분 상세(시너지·충돌·타입별 주의·제품)로 */}
                        <IngredientChip
                          name={item.name}
                          onSelect={() => setDetail(item.name)}
                        />
                      </p>
                      <p className={styles.desc}>{item.description}</p>
                      {item.caution && (
                        <p className={styles.caution}>
                          <Icon name="info" size="sm" />
                          {item.caution}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className={styles.disclaimer}>
                일반적인 정보이며 의학적 조언이 아닙니다.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
