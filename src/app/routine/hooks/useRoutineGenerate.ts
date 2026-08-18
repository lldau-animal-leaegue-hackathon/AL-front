"use client";

import { useCallback, useState } from "react";

import { generateRoutine, type RoutineStepResponse } from "@/api/ai";
import { ApiError } from "@/api/client";
import { newId } from "@/lib/storage/local";
import { listProducts } from "@/lib/storage/products";
import { saveRoutines, saveSkinProfile } from "@/lib/storage/routines";
import type { Routine, RoutineStep, RoutineTime } from "@/types/skincare";

import { TIME_LABEL, totalMinutes } from "../routineTime";

export type GenerateStatus = "idle" | "working" | "done" | "error";

export type GenerateInput = {
  /** 피부 고민 (프롬프트 `wonder`) */
  wonder: string;
  usableTime: { morning: string; evening: string };
};

/**
 * 응답 단계(snake_case) → 프론트 모델(camelCase).
 *
 * `id` 는 LLM 출력에 없다 — 수행 기록(`RoutineRun.completedStepIds`)이 단계를 가리키려면
 * 필요하므로 저장 시점에 만든다. 배열 인덱스를 쓰지 않는 이유는 나중에 루틴을
 * 재생성하면 같은 인덱스가 다른 단계를 뜻하게 되기 때문이다.
 */
function toStep(raw: RoutineStepResponse): RoutineStep {
  return {
    id: newId(),
    routineName: raw.routine_name,
    estimatedTime: raw.estimated_time,
    usingProduct: raw.using_product,
    howToUse: raw.how_to_use,
    tips: raw.tips,
    warning: raw.warning,
  };
}

/**
 * 프롬프트는 `{ morning, evening }` **1벌**을 주는데 저장 모델은 time 당 `Routine` 1개다.
 * 그래서 한 번의 응답을 `Routine` 2개로 펼친다.
 *
 * `name`·`summary`·`condition` 은 **LLM 출력에 없다.** 프롬프트에 새 필드를 요구하지 않고
 * (프롬프트 무수정 원칙) 생성 시점에 만든다:
 *  - `name`   : 시간대 고정 문구
 *  - `summary`: 단계 수·소요 시간에서 **파생**한다. 지어낸 문구가 아니라 실제 값이다.
 *  - `condition`: 이번 범위는 "평소" 1벌뿐이다. 생리 기간 등 조건 루틴은 같은 프롬프트를
 *    `wonder` 에 조건을 붙여 재호출하면 확장되므로 모델만 호환되게 둔다.
 */
function toRoutine(raws: RoutineStepResponse[], time: RoutineTime): Routine {
  const steps = raws.map(toStep);
  const minutes = totalMinutes(steps);

  return {
    id: newId(),
    name: `${TIME_LABEL[time]} 루틴`,
    condition: "평소",
    time,
    summary:
      minutes === null
        ? `${steps.length}단계`
        : `${steps.length}단계 · 약 ${minutes}분`,
    steps,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 루틴 생성 — AI 호출 → 저장(localStorage) 한 흐름.
 *
 * ⚠️ 실측 약 90초 걸린다. 화면은 반드시 진행 표시를 해야 한다.
 */
export function useRoutineGenerate() {
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Routine[]>([]);

  const generate = useCallback(async (input: GenerateInput) => {
    const wonder = input.wonder.trim();
    if (!wonder) {
      setStatus("error");
      setError("피부 고민을 입력해 주세요.");
      return;
    }

    // 제품이 없으면 서버도 400 을 준다. 왕복하기 전에 여기서 막고 다음 행동을 안내한다.
    const products = listProducts();
    if (products.length === 0) {
      setStatus("error");
      setError("등록된 제품이 없어요. 먼저 내 선반에 제품을 담아 주세요.");
      return;
    }

    setStatus("working");
    setError(null);
    setSaved([]);

    try {
      const raw = await generateRoutine({
        wonder,
        usableTime: input.usableTime,
        // 프롬프트 입력에 필요한 3개만 보낸다 — 썸네일까지 실으면 프롬프트가 불필요하게 커진다.
        products: products.map((product) => ({
          productName: product.productName,
          category: product.category,
          ingredients: product.ingredients,
        })),
      });

      // 한쪽이 비는 경우가 있다(제품이 적으면 저녁만 나오기도 한다).
      // 빈 시간대는 루틴을 만들지 않는다 — 단계 0개짜리 카드는 사용자에게 의미가 없다.
      const routines: Routine[] = [];
      if (raw.morning.length > 0) routines.push(toRoutine(raw.morning, "am"));
      if (raw.evening.length > 0) routines.push(toRoutine(raw.evening, "pm"));

      if (routines.length === 0) {
        setStatus("error");
        setError("AI 가 루틴을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      // 저장 실패(대개 용량 초과)를 성공한 척하면 사용자는 저장된 줄 안다.
      if (!saveRoutines(routines)) {
        setStatus("error");
        setError(
          "저장 공간이 부족해 루틴을 담지 못했어요. 등록된 제품을 정리한 뒤 다시 시도해 주세요.",
        );
        return;
      }
      // 피부 프로필은 실패해도 루틴 자체는 살아 있다 — 막지 않고 로그만 남긴다.
      if (!saveSkinProfile({ wonder, usableTime: input.usableTime })) {
        console.warn("[useRoutineGenerate] 피부 프로필 저장 실패");
      }

      setSaved(routines);
      setStatus("done");
    } catch (cause: unknown) {
      setStatus("error");

      if (cause instanceof ApiError) {
        const body = cause.body as { message?: string } | null;
        setError(body?.message ?? `루틴을 만들지 못했어요 (${cause.status})`);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "알 수 없는 오류가 발생했어요.",
      );
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setSaved([]);
  }, []);

  return { status, error, saved, generate, reset };
}
