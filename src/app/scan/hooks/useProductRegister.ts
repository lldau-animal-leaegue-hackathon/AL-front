"use client";

import { useCallback, useState } from "react";

import { extractIngredients } from "@/api/ai";
import { ApiError } from "@/api/client";
import { addProduct, useProducts } from "@/lib/data";
import { fileToDataUrl, resizeToThumbnail } from "@/lib/imageResize";
import type { Product } from "@/types/skincare";

export type RegisterInput = {
  productName: string;
  capacity: string;
  productCompany: string;
  /** 성분표 사진. 없으면 이름·회사만으로 추론한다(확신 없으면 빈 배열이 온다). */
  file: File | null;
};

export type RegisterStatus = "idle" | "working" | "done" | "error";

/**
 * 제품 등록 — 성분 추출(AI) → 저장(서버) 한 흐름.
 * AGENTS.md 컨벤션대로 폼 검증·fetch·비즈니스 로직을 화면에서 떼어 둔다.
 */
export function useProductRegister() {
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product | null>(null);
  // 등록 성공 시 addProduct 가 캐시를 mutate 하므로 여기서는 개수만 읽는다.
  const products = useProducts();

  const register = useCallback(async (input: RegisterInput) => {
    const productName = input.productName.trim();
    if (!productName) {
      setStatus("error");
      setError("제품 이름을 입력해 주세요.");
      return;
    }

    setStatus("working");
    setError(null);
    setSaved(null);

    try {
      // AI 에는 원본, 저장에는 썸네일 — 같은 파일에서 두 벌을 만든다(Q7).
      let original: string | undefined;
      let thumbnail: string | undefined;
      if (input.file) {
        [original, thumbnail] = await Promise.all([
          fileToDataUrl(input.file),
          resizeToThumbnail(input.file),
        ]);
      }

      const raw = await extractIngredients({
        productName,
        capacity: input.capacity.trim() || undefined,
        productCompany: input.productCompany.trim() || undefined,
        productImg: original,
      });

      // raw 는 snake_case 다. 여기(화면 계층)에서 프론트 모델로 옮긴다.
      // capacity 는 서버 컬럼이 없어 저장 대상에서 뺀다(AI 프롬프트에는 그대로 넘긴다).
      const product = await addProduct({
        productName: raw.product_name || productName,
        productCompany: input.productCompany.trim() || undefined,
        thumbnail,
        category: raw.category,
        ingredients: raw.ingredients,
        ingredientSource: input.file ? "photo" : "manual",
      });

      setSaved(product);
      setStatus("done");
    } catch (cause: unknown) {
      // AI 호출 실패든 저장 실패든 같은 에러 경로로 흘려보낸다 —
      // 입력이 날아가는 자리라 실패를 반드시 화면에 알려야 한다.
      setStatus("error");

      if (cause instanceof ApiError) {
        const body = cause.body as { message?: string } | null;
        setError(body?.message ?? `요청을 처리하지 못했어요 (${cause.status})`);
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
    setSaved(null);
  }, []);

  return {
    status,
    error,
    saved,
    shelfCount: products.value.length,
    register,
    reset,
  };
}
