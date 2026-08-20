"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProductForm, type ProductPrefill } from "./ProductForm";
import { ProductSearch } from "./ProductSearch";
import type { ScanTab } from "./ScanTabs";

/**
 * 등록 폼과 검색을 잇는 클라이언트 경계.
 *
 * 검색 결과에는 **성분 정보가 없다** — 그래서 카드를 고르면 바로 저장하지 않고
 * 등록 폼을 채운다. 저장은 언제나 AI 성분 추출을 거친다(Q4).
 *
 * ⭐ **두 패널이 탭으로 갈렸어도 부모는 하나로 유지한다.** `onSelect` 는 이 컴포넌트가
 *    만드는 클로저라, 검색을 다른 컴포넌트로 떼어내면 카드를 눌러도 아무 일이 안
 *    일어난다(버튼은 눌리는 것처럼 보이는데 결과가 없다). 부모를 남기면 그 경로가
 *    생기지 않는다.
 *
 * prefill 을 URL 로 올리지 않는 이유: 같은 카드를 다시 누르면 URL 이 같아 내비게이션이
 * 통째로 스킵된다. `ProductForm` 은 prefill 을 **초기값으로만** 읽으므로 폼이 무반응이 된다.
 */
export function ScanWorkspace({ active }: { active: ScanTab }) {
  const router = useRouter();
  const [prefill, setPrefill] = useState<ProductPrefill | null>(null);
  // 카드를 고를 때마다 증가시켜 ProductForm 을 리마운트한다.
  // prop → state 동기화를 effect 로 하지 않기 위한 장치다(같은 카드를 다시 눌러도 초기화된다).
  const [formKey, setFormKey] = useState(0);
  // 폼이 검색·등록 진행 중인지. 진행 중에는 리마운트하면 안 된다(m11).
  const [formBusy, setFormBusy] = useState(false);

  return (
    <>
      {/* id 는 옛 `/scan#add` 북마크의 착지점이다. 기본 탭이라 그대로 보인다. */}
      <div id="add" hidden={active !== "add"}>
        <ProductForm
          key={formKey}
          prefill={prefill}
          active={active === "add"}
          onBusyChange={setFormBusy}
        />
      </div>

      <div hidden={active !== "popular"}>
        <ProductSearch
          active={active === "popular"}
          onSelect={(product) => {
            /*
             * 진행 중이면 리마운트하지 않는다 — 18~37초짜리 AI 검색이 통째로 날아가고,
             * 서버 동시 실행 가드는 여전히 점유돼 재검색이 429 로 막힌다(m11).
             * 탭만 옮겨 진행 중인 검색을 마저 보여 준다.
             */
            if (!formBusy) {
              setPrefill({
                productName: product.name,
                productCompany: product.brand,
              });
              setFormKey((key) => key + 1);
            }
            // 폼은 다른 탭에 있다. 데려가지 않으면 채워 놓고 안 보여 주는 꼴이 된다.
            router.push("/scan?tab=add");
          }}
        />
      </div>
    </>
  );
}
