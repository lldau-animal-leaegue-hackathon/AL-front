/**
 * 등록된 제품 저장소 (내 선반).
 * 루틴 생성의 입력이 되므로 이 목록이 비면 루틴을 만들 수 없다.
 */

import type { Product } from "@/types/skincare";

import { load, newId, save } from "./local";

const KEY = "products";

export function listProducts(): Product[] {
  return load<Product[]>(KEY, []);
}

export function getProduct(id: string): Product | undefined {
  return listProducts().find((product) => product.id === id);
}

/**
 * 제품을 추가한다. 저장에 실패하면(용량 초과 등) `null` 을 반환한다 —
 * 화면은 이때 "저장하지 못했어요"를 보여줘야 한다. 성공한 척하면 안 된다.
 */
export function addProduct(
  input: Omit<Product, "id" | "createdAt">,
): Product | null {
  const product: Product = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
  };

  return save(KEY, [...listProducts(), product]) ? product : null;
}

/** 일부 필드만 갱신한다. 주의사항(`warnings`)을 나중에 채울 때 쓴다. */
export function updateProduct(
  id: string,
  patch: Partial<Omit<Product, "id" | "createdAt">>,
): boolean {
  const products = listProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return false;

  const next = [...products];
  next[index] = { ...next[index], ...patch };
  return save(KEY, next);
}

export function removeProduct(id: string): boolean {
  const products = listProducts();
  const next = products.filter((product) => product.id !== id);
  // 없는 id 를 지우려 한 경우까지 저장을 태울 필요는 없다.
  if (next.length === products.length) return false;

  return save(KEY, next);
}
