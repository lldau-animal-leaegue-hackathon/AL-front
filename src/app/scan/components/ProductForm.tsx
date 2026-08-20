"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/Icon";

import { useProductRegister } from "../hooks/useProductRegister";
import { CameraCapture, type CaptureMode } from "./CameraCapture";
import styles from "./ProductForm.module.css";
import { ProductSearchModal } from "./ProductSearchModal";

/** 검색 결과에서 고른 제품을 폼에 채워 넣을 때 쓴다 */
export type ProductPrefill = {
  productName: string;
  productCompany: string;
};

/**
 * 폼 버튼의 진행 문구.
 *
 * **AI 내부 단계는 알 수 없다** — 한 번의 호출이고 진척도를 돌려주지 않는다.
 * 그래서 우리가 실제로 아는 것만 말한다: **지금 무엇을 하는 중인지**와 **얼마나 지났는지**.
 *
 * 이 자리는 **후보 검색(웹)** 구간만 담당한다. 성분 추출은 모달이 이어받는다.
 * 35초 기준은 실측값이다(검색 18~37초). 그 선을 넘으면 멈춘 게 아닌지 의심하기 시작한다.
 */
function progressLabel(elapsed: number): string {
  return elapsed >= 35 ? "거의 다 됐어요" : "제품 찾는 중";
}

/** 성분표 유무에 따라 버튼이 실제로 할 일을 말한다(사용자 피드백 2026-08-20: "AI"를 명시). */
function submitLabel(hasLabelFile: boolean): string {
  return hasLabelFile ? "AI 성분 읽기" : "AI 성분 검색";
}

/**
 * `prefill` 은 **초기값으로만** 쓴다.
 * 검색에서 제품을 고르면 부모가 `key` 를 바꿔 이 컴포넌트를 리마운트한다 —
 * effect 로 setState 를 호출해 prop 을 state 에 동기화하는 것보다 단순하고,
 * 같은 카드를 다시 눌러도 폼이 확실히 초기화된다.
 */
export function ProductForm({ prefill }: { prefill: ProductPrefill | null }) {
  const formId = useId();
  const nameId = useId();
  const capacityId = useId();
  const companyId = useId();
  const productPhotoId = useId();
  const labelPhotoId = useId();

  const [productName, setProductName] = useState(prefill?.productName ?? "");
  const [capacity, setCapacity] = useState("");
  const [productCompany, setProductCompany] = useState(
    prefill?.productCompany ?? "",
  );
  /** 썸네일용. 성분 추출에는 쓰지 않는다. */
  const [productFile, setProductFile] = useState<File | null>(null);
  /** 성분 추출용. 있으면 후보 검색을 건너뛴다. */
  const [labelFile, setLabelFile] = useState<File | null>(null);
  /** 어떤 촬영을 여는지. `null` 이면 닫혀 있다. */
  const [cameraMode, setCameraMode] = useState<CaptureMode | null>(null);

  const productInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const {
    phase,
    error,
    candidates,
    found,
    saved,
    shelfCount,
    search,
    selectCandidate,
    backToCandidates,
    confirm,
    dismiss,
    reset,
  } = useProductRegister();

  /** 폼 버튼이 도는 구간 — **후보 검색만**. 성분 추출부터는 모달이 이어받는다. */
  const searching = phase === "searching";
  /** 모달이 떠 있는 구간. 등록 완료(`done`)까지 모달에서 보여 준다. */
  const modalOpen =
    phase === "choosing" ||
    phase === "extracting" ||
    phase === "found" ||
    phase === "saving" ||
    phase === "done";
  const busy = searching || modalOpen;

  /*
   * 검색이 오래 걸린다 — 실측 18~37초.
   * 스피너만 돌면 멈춘 줄 알기 때문에 경과 시간을 같이 보여준다.
   * (effect 본문에서 setState 를 직접 부르지 않도록 시작 시각을 지역 변수로 잡는다.)
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!searching) return;
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [searching]);

  function clearForm() {
    setProductName("");
    setCapacity("");
    setProductCompany("");
    setProductFile(null);
    setLabelFile(null);
    if (productInputRef.current) productInputRef.current.value = "";
    if (labelInputRef.current) labelInputRef.current.value = "";
    reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await search({
      productName,
      capacity,
      productCompany,
      productFile,
      labelFile,
    });
  }

  return (
    <section className={styles.section}>
      {cameraMode && (
        <CameraCapture
          mode={cameraMode}
          onCapture={(captured) => {
            if (cameraMode === "product") {
              setProductFile(captured);
              // 파일 인풋과 상태가 어긋나지 않게 비운다 — 표시는 fileName 이 담당한다.
              if (productInputRef.current) productInputRef.current.value = "";
            } else {
              setLabelFile(captured);
              if (labelInputRef.current) labelInputRef.current.value = "";
            }
            setCameraMode(null);
          }}
          onClose={() => setCameraMode(null)}
        />
      )}

      {/*
        후보 선택 → 성분 확인 → 등록 → 완료가 모두 이 모달 안에서 일어난다.
        저장 실패 시에도 모달은 열려 있다 — 닫으면 1분 넘게 걸린 결과가 통째로 날아간다.
      */}
      {modalOpen && (
        <ProductSearchModal
          phase={phase}
          candidates={candidates}
          result={found}
          saved={saved}
          shelfCount={shelfCount}
          error={error}
          onSelect={selectCandidate}
          onBack={backToCandidates}
          onConfirm={confirm}
          onRegisterAnother={clearForm}
          onClose={phase === "done" ? clearForm : dismiss}
          onRetakeLabel={() => {
            /*
             * 성분을 못 찾았을 때의 다음 행동 — 모달을 닫고 바로 성분표 촬영으로 보낸다.
             * ⚠️ 고른 후보의 정체성(이름·제조사)을 폼에 되채운 뒤 닫는다 —
             * 안 하면 재제출이 사용자가 처음 친 부분 문자열("토너")로 회귀한다(재검토 N1).
             */
            if (found) {
              setProductName(found.productName);
              if (found.productCompany) setProductCompany(found.productCompany);
            }
            dismiss();
            setCameraMode("label");
          }}
        />
      )}

      <div className={styles.intro}>
        <h2 className={styles.heading}>제품 등록</h2>
        <p className={styles.lead}>
          제품 이름만 있어도 찾을 수 있어요.
          <br />
          사진은 없어도 됩니다.
        </p>
      </div>

      <form id={formId} className={styles.form} onSubmit={handleSubmit}>
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
            disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
            />
          </div>
        </div>

        {/* 두 사진은 쓰임이 다르다. 라벨만으로는 헷갈려서 한 줄씩 설명을 붙인다. */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={productPhotoId}>
            제품 사진
          </label>
          <p className={styles.fieldHint}>
            선반에서 제품을 알아보는 데 쓰여요. 성분은 읽지 않아요.
          </p>
          <div className={styles.photoRow}>
            <input
              id={productPhotoId}
              ref={productInputRef}
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <button
              type="button"
              className={styles.camera}
              onClick={() => setCameraMode("product")}
              disabled={busy}
            >
              <Icon name="photo_camera" filled size="sm" />
              촬영
            </button>
          </div>
          {productFile && <p className={styles.fileName}>{productFile.name}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={labelPhotoId}>
            성분표 사진
          </label>
          <p className={styles.fieldHint}>
            올리면 검색을 건너뛰고 성분표를 그대로 읽어요.
          </p>
          <div className={styles.photoRow}>
            <input
              id={labelPhotoId}
              ref={labelInputRef}
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <button
              type="button"
              className={styles.camera}
              onClick={() => setCameraMode("label")}
              disabled={busy}
            >
              <Icon name="photo_camera" filled size="sm" />
              촬영
            </button>
          </div>
          {labelFile && <p className={styles.fileName}>{labelFile.name}</p>}
        </div>

        {/* 15초를 넘기면 왜 오래 걸리는지와 빠른 길을 알려 준다 — 진행 문구 자체는 버튼이 맡는다. */}
        {searching && elapsed >= 15 && (
          <p className={styles.hint}>
            실제 판매 중인 제품을 찾고 있어요. 성분표 사진을 올리면 검색을
            건너뛰고 바로 읽을 수 있습니다.
          </p>
        )}

        {/*
          마지막에 누르는 버튼이라는 것이 읽히도록 **폼 맨 아래 전폭**으로 둔다
          (사용자 피드백 2026-08-20 — 상단에 있으니 제출 버튼처럼 안 보였다).
        */}
        <button className={styles.submit} type="submit" disabled={busy}>
          {searching ? (
            <>
              <Icon name="progress_activity" className={styles.spinner} />
              {progressLabel(elapsed)}… {elapsed}초
            </>
          ) : (
            <>
              <Icon name={labelFile ? "document_scanner" : "search"} filled />
              {submitLabel(Boolean(labelFile))}
            </>
          )}
        </button>
      </form>

      {/* 검색 실패. 성분 추출·저장 실패는 모달 안에서 보여 준다(그쪽이 결과를 들고 있다). */}
      {phase === "idle" && error && (
        <p className={styles.error} role="alert">
          <Icon name="error" size="sm" />
          {error}
        </p>
      )}
    </section>
  );
}
