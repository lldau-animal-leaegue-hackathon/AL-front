"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { addProduct } from "@/lib/data";
import { stepIcon } from "@/lib/stepIcon";
import type { Product } from "@/types/skincare";

// 검색 결과 모달(`ProductSearchModal`)과 같은 껍데기를 쓴다 — 한 파일을 함께 import 한다.
import styles from "./productModal.module.css";

/**
 * 인기 제품 상세 — **이미 저장된 값만 보여 준다.**
 *
 * 공유 카탈로그(`products`)에서 온 제품이라 성분·이미지가 이미 DB 에 있다.
 * 그래서 여는 데 AI 호출이 없고 **즉시** 뜬다. 스캔 탭의 검색 모달과 다른 점이 이것이다
 * (그쪽은 아직 저장 전이라 성분을 그때 읽는다).
 *
 * ⚠️ 여기 오는 `product.thumbnail` 은 **항상 비어 있다.** 인기 제품 조회가 개인 사진을
 * 가져오지 않기 때문이다(`/api/products/popular` 참조). 이미지는 `product.image` 뿐이다.
 */
export function PopularProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc 로 닫기 — 오버레이라 브라우저 뒤로가기가 닫아 주지 않는다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function handleAdd() {
    setSaving(true);
    setError(null);
    try {
      /*
       * 이미 카탈로그에 있는 제품이라 성분을 다시 읽지 않는다 — 저장된 값을 그대로 담는다.
       * 서버의 UPSERT 가 (name, brand) 로 같은 행을 찾아 내 선반에만 연결한다.
       */
      await addProduct({
        productName: product.productName,
        productCompany: product.productCompany,
        category: product.category,
        ingredients: product.ingredients,
      });
      setSaved(true);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "선반에 담지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={product.productName}
    >
      <div className={styles.sheet}>
        <div className={styles.bar}>
          <p className={styles.title}>제품 정보</p>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={saving}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.head}>
            <span className={styles.thumb}>
              {product.image ? (
                <Image
                  src={product.image}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className={styles.thumbImg}
                />
              ) : (
                <Icon name={stepIcon(product.category)} filled />
              )}
            </span>

            <div className={styles.headText}>
              <p className={styles.name}>{product.productName}</p>
              <span className={styles.chip}>{product.category}</span>
              {product.productCompany && (
                <p className={styles.meta}>{product.productCompany}</p>
              )}
            </div>
          </div>

          <h3 className={styles.sectionTitle}>
            성분
            {product.ingredients.length > 0 && (
              <span className={styles.count}>
                {product.ingredients.length}개
              </span>
            )}
          </h3>

          {/* 빈 배열은 "아직 성분을 못 찾은 제품"이다. 지어내지 않았다는 뜻이라 그대로 알린다. */}
          {product.ingredients.length === 0 ? (
            <p className={styles.empty}>
              아직 성분 정보가 없어요. 담은 뒤 성분표 사진을 올리면 채워집니다.
            </p>
          ) : (
            <ul className={styles.ingredients}>
              {product.ingredients.map((ingredient) => (
                <li key={ingredient} className={styles.ingredient}>
                  {ingredient}
                </li>
              ))}
            </ul>
          )}

          {/* 주의사항은 지연 생성이라 아직 없을 수 있다. 있을 때만 보여 준다. */}
          {product.warnings && product.warnings.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>주의사항</h3>
              <ul className={styles.warnings}>
                {product.warnings.map((warning) => (
                  <li key={warning} className={styles.warning}>
                    <Icon name="warning" size="sm" />
                    {warning}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.footer}>
          {error && (
            <p className={styles.error} role="alert">
              <Icon name="error" size="sm" />
              {error}
            </p>
          )}

          <button
            type="button"
            className={styles.submit}
            onClick={saved ? onClose : handleAdd}
            disabled={saving}
          >
            {saving ? (
              <>
                <Icon name="progress_activity" className={styles.spinner} />
                담는 중…
              </>
            ) : saved ? (
              <>
                <Icon name="check_circle" filled />
                선반에 담았어요
              </>
            ) : (
              <>
                <Icon name="add_circle" filled />
                선반에 추가하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
