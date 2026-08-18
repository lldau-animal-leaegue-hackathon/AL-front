"use client";

import { useEffect, useState } from "react";

import { fetchWarnings } from "@/api/ai";
import { ApiError } from "@/api/client";
import { listProducts, updateProduct } from "@/lib/storage/products";
import type { Product } from "@/types/skincare";

export type IngredientAlertItem = {
  id: string;
  productName: string;
  warning: string;
};

export type IngredientAlertsState =
  | { kind: "checking" }
  | { kind: "no-products" }
  | { kind: "no-warnings" }
  | { kind: "ready"; alerts: IngredientAlertItem[] };

/**
 * 프롬프트 규칙 6 — ingredients 가 비어 있으면(또는 정보가 부족하면) AI 도 이 문구 하나만
 * 반환하도록 못박혀 있다. 결과가 이미 결정돼 있으므로, 그 경우엔 34초짜리 호출(과
 * `claude -p` 프로세스 하나)을 아끼고 같은 문구를 로컬에서 채운다.
 */
const NO_INGREDIENTS_WARNING =
  "성분 정보가 부족하여 구체적인 주의사항을 제공하기 어렵습니다";

function toAlerts(products: Product[]): IngredientAlertItem[] {
  return products.flatMap((product) =>
    (product.warnings ?? []).map((warning, index) => ({
      id: `${product.id}-${index}`,
      productName: product.productName,
      warning,
    })),
  );
}

/**
 * 등록 제품의 "제품 사용 주의사항"(`Product.warnings`)을 지연 생성하고 취합한다.
 *
 * 등록 시점엔 만들지 않는다 — 호출 1회에 약 34초 걸려 등록 UX를 막기 때문이다
 * (그래서 `Product.warnings` 가 optional 이다). 이 화면에 들어올 때 아직 warnings 가
 * 없는 제품을 찾아 **한 번에 하나씩 순차로** 채운다 — 동시에 쏘면 `claude -p` 프로세스가
 * 그만큼 뜬다.
 */
export function useIngredientAlerts(): IngredientAlertsState {
  // null = 아직 localStorage 를 읽기 전(SSR 첫 렌더 포함)
  const [products, setProducts] = useState<Product[] | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // localStorage 는 브라우저 전용 — useEffect 안에서만 접근한다(SSR ReferenceError 방지).
      const list = listProducts();
      const pending = list.filter((product) => product.warnings === undefined);

      setProducts(list);
      if (pending.length === 0) return;
      setGenerating(true);

      for (const product of pending) {
        if (cancelled) return;

        let warning: string[];
        if (product.ingredients.length === 0) {
          // 결과가 이미 정해져 있는 경우라 호출을 생략한다(위 주석 참고).
          warning = [NO_INGREDIENTS_WARNING];
        } else {
          try {
            const raw = await fetchWarnings({
              productName: product.productName,
              category: product.category,
              ingredients: product.ingredients,
            });
            warning = raw.warning;
          } catch (error: unknown) {
            // 이 제품만 건너뛴다 — 하나 실패했다고 나머지 순차 처리를 막지 않는다.
            // warnings 는 undefined 로 남아 다음 방문 때 다시 시도된다.
            console.warn(
              `[useIngredientAlerts] "${product.productName}" 주의사항 생성 실패`,
              error instanceof ApiError ? error.body : error,
            );
            continue;
          }
        }

        if (cancelled) return;

        if (!updateProduct(product.id, { warnings: warning })) {
          // 대개 localStorage 용량 초과 — 조용히 넘기지 않는다(성공한 척 금지).
          console.warn(
            `[useIngredientAlerts] "${product.productName}" 주의사항 저장 실패`,
          );
        }
        setProducts((prev) =>
          prev
            ? prev.map((item) =>
                item.id === product.id ? { ...item, warnings: warning } : item,
              )
            : prev,
        );
      }

      if (!cancelled) setGenerating(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (products === null || generating) return { kind: "checking" };
  if (products.length === 0) return { kind: "no-products" };

  const alerts = toAlerts(products);
  if (alerts.length === 0) return { kind: "no-warnings" };

  return { kind: "ready", alerts };
}
