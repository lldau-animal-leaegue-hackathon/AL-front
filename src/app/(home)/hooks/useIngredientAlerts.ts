"use client";

import { useEffect, useRef, useState } from "react";

import { fetchWarnings } from "@/api/ai";
import { ApiError } from "@/api/client";
import { setProductWarnings, useProducts } from "@/lib/data";
import type { Product } from "@/types/skincare";

export type IngredientAlertItem = {
  id: string;
  productName: string;
  warning: string;
};

export type IngredientAlertsState =
  | { kind: "checking" }
  | { kind: "error"; retry: () => void }
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
  const { ready, value: products, error, retry } = useProducts();
  const [generating, setGenerating] = useState(false);
  // 생성 루프는 한 번만 시작한다 — setProductWarnings 가 성공할 때마다 SWR 캐시가
  // 갱신돼 products 참조가 바뀌는데, 그걸 effect 의존성에 넣으면 진행 중인 루프가
  // 스스로를 취소시킨다. 최신 목록은 ref 로만 들여다본다.
  const startedRef = useRef(false);
  const productsRef = useRef(products);
  productsRef.current = products;

  useEffect(() => {
    if (!ready || error || startedRef.current) return;

    const pending = productsRef.current.filter(
      (product) => product.warnings === undefined,
    );
    if (pending.length === 0) return;
    startedRef.current = true;

    let cancelled = false;

    async function run() {
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
          } catch (err: unknown) {
            // 이 제품만 건너뛴다 — 하나 실패했다고 나머지 순차 처리를 막지 않는다.
            // warnings 는 undefined 로 남아 다음 방문 때 다시 시도된다.
            console.warn(
              `[useIngredientAlerts] "${product.productName}" 주의사항 생성 실패`,
              err instanceof ApiError ? err.body : err,
            );
            continue;
          }
        }

        if (cancelled) return;

        // 서버는 빈 배열을 400 으로 거부한다(기존 주의사항이 실수로 지워지는 것을 막는
        // 가드). AI 가 빈 배열을 준 경우엔 저장을 건너뛴다 — warnings 는 undefined 로
        // 남아 다음 방문 때 다시 시도된다.
        if (warning.length === 0) continue;

        try {
          await setProductWarnings({ id: product.id, warnings: warning });
        } catch (err: unknown) {
          console.warn(
            `[useIngredientAlerts] "${product.productName}" 주의사항 저장 실패`,
            err instanceof ApiError ? err.body : err,
          );
        }
      }

      if (!cancelled) setGenerating(false);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productsRef 로 최신값을 읽는다
  }, [ready, error]);

  if (!ready) return { kind: "checking" };
  if (error) return { kind: "error", retry };
  if (generating) return { kind: "checking" };
  if (products.length === 0) return { kind: "no-products" };

  const alerts = toAlerts(products);
  if (alerts.length === 0) return { kind: "no-warnings" };

  return { kind: "ready", alerts };
}
