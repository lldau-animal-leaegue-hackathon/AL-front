"use client";

import { useCallback, useState } from "react";

import { extractIngredients } from "@/api/ai";
import { ApiError } from "@/api/client";
import { fileToDataUrl, resizeToThumbnail } from "@/lib/imageResize";
import { addProduct, listProducts } from "@/lib/storage/products";
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
 * 제품 등록 — 성분 추출(AI) → 저장(localStorage) 한 흐름.
 * AGENTS.md 컨벤션대로 폼 검증·fetch·비즈니스 로직을 화면에서 떼어 둔다.
 */
export function useProductRegister() {
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Product | null>(null);
  const [shelfCount, setShelfCount] = useState(0);

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
      const product = addProduct({
        productName: raw.product_name || productName,
        capacity: input.capacity.trim() || undefined,
        productCompany: input.productCompany.trim() || undefined,
        thumbnail,
        category: raw.category,
        ingredients: raw.ingredients,
      });

      if (!product) {
        // addProduct 가 null 이면 저장 실패 — 대개 용량 초과다.
        // 성공한 척하면 사용자는 저장된 줄 안다.
        setStatus("error");
        setError(
          "저장 공간이 부족해 제품을 담지 못했어요. 등록된 제품을 정리한 뒤 다시 시도해 주세요.",
        );
        return;
      }

      setSaved(product);
      setShelfCount(listProducts().length);
      setStatus("done");
    } catch (cause: unknown) {
      setStatus("error");

      if (cause instanceof ApiError) {
        const body = cause.body as { message?: string } | null;
        setError(body?.message ?? `성분을 분석하지 못했어요 (${cause.status})`);
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

  return { status, error, saved, shelfCount, register, reset };
}
