"use client";

import { useState } from "react";

import { ProductForm, type ProductPrefill } from "./ProductForm";
import { ProductSearch } from "./ProductSearch";

/**
 * 등록 폼과 검색을 잇는 클라이언트 경계.
 *
 * 검색 결과에는 **성분 정보가 없다** — 그래서 카드를 고르면 바로 저장하지 않고
 * 등록 폼을 채운다. 저장은 언제나 AI 성분 추출을 거친다(Q4).
 *
 * 이 조각만 클라이언트다. 페이지(`page.tsx`)와 `PageHeader` 는 서버 컴포넌트로 남는다.
 */
export function ScanWorkspace() {
  const [prefill, setPrefill] = useState<ProductPrefill | null>(null);
  // 카드를 고를 때마다 증가시켜 ProductForm 을 리마운트한다.
  // prop → state 동기화를 effect 로 하지 않기 위한 장치다(같은 카드를 다시 눌러도 초기화된다).
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <ProductForm key={formKey} prefill={prefill} />
      <ProductSearch
        onSelect={(product) => {
          setPrefill({
            productName: product.name,
            productCompany: product.brand,
          });
          setFormKey((key) => key + 1);
        }}
      />
    </>
  );
}
