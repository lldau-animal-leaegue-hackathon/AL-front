"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/Icon";

import { useProductRegister } from "../hooks/useProductRegister";
import styles from "./ProductForm.module.css";

/** 검색 결과에서 고른 제품을 폼에 채워 넣을 때 쓴다 */
export type ProductPrefill = {
  productName: string;
  productCompany: string;
};

/**
 * `prefill` 은 **초기값으로만** 쓴다.
 * 검색에서 제품을 고르면 부모가 `key` 를 바꿔 이 컴포넌트를 리마운트한다 —
 * effect 로 setState 를 호출해 prop 을 state 에 동기화하는 것보다 단순하고,
 * 같은 카드를 다시 눌러도 폼이 확실히 초기화된다.
 */
export function ProductForm({ prefill }: { prefill: ProductPrefill | null }) {
  const nameId = useId();
  const capacityId = useId();
  const companyId = useId();
  const photoId = useId();

  const [productName, setProductName] = useState(prefill?.productName ?? "");
  const [capacity, setCapacity] = useState("");
  const [productCompany, setProductCompany] = useState(
    prefill?.productCompany ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { status, error, saved, shelfCount, register, reset } =
    useProductRegister();
  const working = status === "working";

  /*
   * 분석이 오래 걸린다 — 실측으로 사진이 있으면 약 14초, 이름만이면 2분까지 갔다.
   * 스피너만 돌면 멈춘 줄 알기 때문에 경과 시간을 같이 보여준다.
   * (effect 본문에서 setState 를 직접 부르지 않도록 시작 시각을 지역 변수로 잡는다.)
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!working) return;
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [working]);

  function clearForm() {
    setProductName("");
    setCapacity("");
    setProductCompany("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await register({ productName, capacity, productCompany, file });
  }

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.heading}>제품 등록</h2>
        <p className={styles.lead}>
          제품 이름만 있어도 등록됩니다. 성분표 사진을 함께 올리면 성분을 훨씬
          정확하게 읽어요.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nameId}>
            제품 이름 <span className={styles.required}>필수</span>
          </label>
          <input
            id={nameId}
            className={styles.input}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예: 어성초 77 수딩 토너"
            required
            disabled={working}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={capacityId}>
              용량 (mL)
            </label>
            <input
              id={capacityId}
              className={styles.input}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="150"
              inputMode="numeric"
              disabled={working}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={companyId}>
              제조사
            </label>
            <input
              id={companyId}
              className={styles.input}
              value={productCompany}
              onChange={(e) => setProductCompany(e.target.value)}
              placeholder="아누아"
              disabled={working}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={photoId}>
            성분표 사진
          </label>
          <input
            id={photoId}
            ref={fileInputRef}
            className={styles.file}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={working}
          />
          {file && <p className={styles.fileName}>{file.name}</p>}
        </div>

        <button className={styles.submit} type="submit" disabled={working}>
          {working ? (
            <>
              <Icon name="progress_activity" className={styles.spinner} />
              성분 분석 중… {elapsed}초
            </>
          ) : (
            <>
              <Icon name="add_circle" filled />
              선반에 담기
            </>
          )}
        </button>

        {/* 사진 없이 이름만으로 추론할 때 특히 오래 걸린다 — 더 빠른 길을 알려 준다 */}
        {working && !file && elapsed >= 15 && (
          <p className={styles.hint}>
            이름만으로 찾는 중이라 1~2분 걸릴 수 있어요. 다음엔 성분표 사진을
            올리면 훨씬 빠릅니다.
          </p>
        )}
      </form>

      {status === "error" && error && (
        <p className={styles.error} role="alert">
          <Icon name="error" size="sm" />
          {error}
        </p>
      )}

      {status === "done" && saved && (
        <div className={styles.result} role="status">
          <p className={styles.resultTitle}>
            <Icon name="check_circle" filled size="sm" />
            선반에 담았어요 · 총 {shelfCount}개
          </p>

          <p className={styles.resultName}>
            {saved.productName}
            <span className={styles.chip}>{saved.category}</span>
          </p>

          {/*
            빈 배열은 실패가 아니라 정상 응답이다 — 프롬프트가 "확신 없으면 []" 를 요구한다.
            성분을 지어내지 않았다는 뜻이므로 그대로 알리고 다음 행동을 제안한다.
          */}
          {saved.ingredients.length === 0 ? (
            <p className={styles.emptyIngredients}>
              성분 정보를 찾지 못했어요. 성분표 사진을 올리면 정확히 읽을 수
              있습니다.
            </p>
          ) : (
            <ul className={styles.ingredients}>
              {saved.ingredients.map((ingredient) => (
                <li key={ingredient} className={styles.ingredient}>
                  {ingredient}
                </li>
              ))}
            </ul>
          )}

          <button type="button" className={styles.another} onClick={clearForm}>
            다른 제품 등록하기
          </button>
        </div>
      )}
    </section>
  );
}
