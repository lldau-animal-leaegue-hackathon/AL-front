"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/api/client";
import { Icon } from "@/components/Icon";
import { appendRun, saveRoutines, useRoutines } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import type { Routine, RoutineStep } from "@/types/skincare";

import { conditionLabel } from "../condition";
import { TIME_ICON, TIME_LABEL, totalMinutes } from "../routineTime";
import styles from "./RoutineCard.module.css";

/** 서버가 준 실패 사유를 우선 보여 준다 — "형식이 올바르지 않습니다" 같은 안내가 훨씬 유용하다. */
function saveErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: unknown } | null;
    if (typeof body?.message === "string") return body.message;
  }
  return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

/**
 * 목록의 루틴 한 개.
 * 펼치기는 <details>에 맡긴다 — 열림 상태까지 state로 들 필요가 없다.
 *
 * `done` 은 **수행 기록에서 파생된 값**이다(Step 7). 예전의 로컬 state 토글 버튼은
 * 새로고침하면 풀리는 가짜 상태라 없앴다. 지금의 "완료" 버튼은 다르다 —
 * **실제 수행 기록(appendRun)을 남기므로** 주간 달성률과 항상 일치한다
 * (사용자 피드백 2026-08-20: 단계 화면을 거치지 않고도 완료 처리하고 싶다).
 *
 * 단계 편집(순서 변경·삭제)도 여기서 한다 — 단계 하나 빼자고 AI 재생성(90초)을
 * 돌릴 이유가 없다(사용자 피드백). 저장은 초안을 모아 한 번에 PUT 한다.
 */
export function RoutineCard({
  routine,
  done,
}: {
  routine: Routine;
  done: boolean;
}) {
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  /**
   * 편집 초안. `null` = 보기 모드다 — `editing` 플래그를 따로 들면 둘이 어긋난다.
   * 변경을 여기 모아 뒀다가 저장 버튼으로만 반영한다(실수로 지운 단계를 취소로 되돌릴 수 있어야 한다).
   */
  const [draft, setDraft] = useState<RoutineStep[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /*
   * PUT /api/routines 는 **condition 단위 교체**라, 이 카드 하나만 보내면 같은 조건의
   * 짝(아침/저녁)이 지워진다. 형제를 모으려고 목록을 다시 구독한다 —
   * SWR 키가 `/routines` 로 같아 추가 요청은 나가지 않는다.
   */
  const routinesRes = useRoutines();

  const steps = draft ?? routine.steps;
  const minutes = totalMinutes(steps);

  /** 러너 완주(RoutineDone)와 같은 규칙 — 전 단계를 완료로 기록한다. */
  async function markDone() {
    setMarking(true);
    setMarkError(false);
    try {
      const now = new Date().toISOString();
      await appendRun({
        routineId: routine.id,
        startedAt: now,
        finishedAt: now,
        completedStepIds: routine.steps.map((step) => step.id),
      });
      // 성공하면 runs 캐시 갱신으로 done prop 이 바뀌어 버튼이 사라진다.
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  }

  /** 자리 맞바꾸기. 범위를 벗어나면 그대로 둔다(버튼은 어차피 disabled 다). */
  function moveStep(index: number, delta: number) {
    setDraft((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStep(index: number) {
    // 단계 0개 루틴은 의미가 없다 — 마지막 1개는 남긴다(버튼도 disabled).
    setDraft((current) =>
      current && current.length > 1
        ? current.filter((_, i) => i !== index)
        : current,
    );
  }

  async function saveDraft() {
    if (!draft) return;

    /*
     * 목록을 못 읽은 상태에서 저장하면 형제 루틴을 빠뜨린 채 조건을 교체한다 = 데이터 손실.
     * 내 루틴이 목록에 없는 경우(캐시가 낡음)도 같은 이유로 막는다.
     */
    const siblings = routinesRes.value.filter(
      (item) => item.condition === routine.condition,
    );
    if (
      !routinesRes.ready ||
      routinesRes.error ||
      !siblings.some((item) => item.id === routine.id)
    ) {
      setSaveError("루틴 목록을 불러오지 못해 저장할 수 없어요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // 같은 조건의 루틴을 **전부** 보낸다. 편집한 것만 단계가 바뀐다.
      await saveRoutines(
        siblings.map((item) => ({
          name: item.name,
          condition: item.condition,
          time: item.time,
          summary: item.summary,
          steps: item.id === routine.id ? draft : item.steps,
        })),
      );
      // 저장에 성공하면 서버가 새 id 를 발급하므로 이 카드는 통째로 다시 마운트된다
      // (RoutineList 의 key = routine.id). 초안 정리는 그 전에 끝내 둔다.
      setDraft(null);
    } catch (error) {
      // 실패하면 초안을 유지한다 — 여기서 비우면 편집 내용이 조용히 사라진다.
      setSaveError(saveErrorText(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li>
      <details className={`${styles.card} ${done ? styles.cardDone : ""}`}>
        <summary className={styles.summary}>
          <span className={styles.badge} aria-hidden="true">
            <Icon name={done ? "check" : TIME_ICON[routine.time]} filled />
          </span>

          <span className={styles.info}>
            <span className={styles.titleRow}>
              <h3 className={styles.name}>{routine.name}</h3>
              <span className={styles.chip}>
                {conditionLabel(routine.condition)}
              </span>
            </span>
            <span className={styles.meta}>
              {/* 편집 중에는 초안 기준으로 센다 — 저장 전에 결과를 미리 보여 준다 */}
              {TIME_LABEL[routine.time]} · {steps.length}단계
              {/* LLM 이 estimated_time 을 안 준 경우 "약 0분"은 거짓말이라 아예 생략한다 */}
              {minutes !== null && ` · 약 ${minutes}분`}
              {done && " · 오늘 완료"}
            </span>
          </span>

          <Icon name="expand_more" className={styles.chevron} />
        </summary>

        <p className={styles.desc}>{routine.summary}</p>

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.id} className={styles.step}>
              <span className={styles.order}>{index + 1}</span>
              {/* 출력에 아이콘 필드가 없어 단계명에서 파생한다(폴백 있음) */}
              <Icon
                name={stepIcon(step.routineName)}
                size="sm"
                className={styles.stepIcon}
              />
              <span className={styles.stepName}>{step.routineName}</span>

              {draft ? (
                /*
                  편집 컨트롤. 드래그 대신 버튼인 이유는 터치와 키보드가 같은 조작을
                  쓰기 때문이다. 행은 step.id 로 keyed 라 순서를 바꿔도 DOM 노드가
                  따라 움직여 포커스가 유지된다(맨 위/아래로 가면 disabled 라 풀린다).
                */
                <span className={styles.stepEdit}>
                  <button
                    type="button"
                    className={styles.stepButton}
                    aria-label={`${step.routineName} 위로`}
                    disabled={index === 0 || saving}
                    onClick={() => moveStep(index, -1)}
                  >
                    <Icon name="arrow_upward" size="sm" />
                  </button>
                  <button
                    type="button"
                    className={styles.stepButton}
                    aria-label={`${step.routineName} 아래로`}
                    disabled={index === steps.length - 1 || saving}
                    onClick={() => moveStep(index, 1)}
                  >
                    <Icon name="arrow_downward" size="sm" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.stepButton} ${styles.stepRemove}`}
                    aria-label={`${step.routineName} 삭제`}
                    disabled={steps.length === 1 || saving}
                    onClick={() => removeStep(index)}
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </span>
              ) : (
                /*
                  using_product 는 id 가 아니라 이름 문자열이다. 저장된 제품과 매칭되지
                  않아도 이름은 보여 준다. 비어 있으면 칩 자체를 생략한다.
                */
                step.usingProduct.length > 0 && (
                  <span className={styles.stepCategory}>
                    {step.usingProduct.join(" + ")}
                  </span>
                )
              )}
            </li>
          ))}
        </ol>

        {draft ? (
          <>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.start}
                onClick={saveDraft}
                disabled={saving}
              >
                <Icon name="check" filled />
                {saving ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                className={styles.markDone}
                onClick={() => {
                  setDraft(null);
                  setSaveError(null);
                }}
                disabled={saving}
              >
                취소
              </button>
            </div>
            {/*
              저장은 조건 단위 교체라 루틴 id 가 새로 발급된다 → 그 주 달성률·오늘 완료
              표시가 "다시 만들기" 때와 똑같이 초기화된다. 미리 알려 준다.
            */}
            <p className={styles.editHint}>
              저장하면 이 루틴의 완료 기록 표시가 초기화돼요.
            </p>
          </>
        ) : (
          <div className={styles.actions}>
            <Link
              href={`/routine/${routine.id}/1` as Route}
              className={styles.start}
            >
              <Icon name="play_arrow" filled />
              {done ? "다시 하기" : "시작하기"}
            </Link>

            {/* 이미 오늘 완료면 기록할 게 없다 — 버튼을 숨긴다. */}
            {!done && (
              <button
                type="button"
                className={styles.markDone}
                onClick={markDone}
                disabled={marking}
              >
                <Icon name="check" size="sm" />
                {marking ? "기록 중…" : "완료"}
              </button>
            )}

            {/* 단계를 빼거나 순서만 바꾸려고 AI 재생성(90초)을 돌릴 이유가 없다 */}
            <button
              type="button"
              className={styles.markDone}
              aria-label={`${routine.name} 단계 편집`}
              onClick={() => {
                setSaveError(null);
                setDraft(routine.steps);
              }}
            >
              <Icon name="edit" size="sm" />
              편집
            </button>
          </div>
        )}

        {markError && (
          <p className={styles.markError} role="alert">
            완료를 기록하지 못했어요.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
        )}

        {saveError && (
          <p className={styles.markError} role="alert">
            {saveError}
          </p>
        )}
      </details>
    </li>
  );
}
