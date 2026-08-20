"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProductCandidate } from "@/api/ai";
import { Icon } from "@/components/Icon";
import { stepIcon } from "@/lib/stepIcon";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

import type { Product } from "@/types/skincare";

import type { RegisterPhase, SearchResult } from "../hooks/useProductRegister";
// 인기 제품 모달(`PopularProductModal`)과 같은 껍데기를 쓴다 — 한 파일을 함께 import 한다.
import styles from "./productModal.module.css";

/**
 * 검색 → 후보 선택 → 성분 확인 → 등록.
 *
 * 한 모달 안에서 단계가 바뀐다. 단계마다 별도 화면으로 나누지 않은 이유는
 * **뒤로 돌아갈 수 있어야** 하기 때문이다 — 후보 검색은 실측 18~37초라
 * 잘못 골랐다고 처음부터 다시 하게 만들면 안 된다.
 *
 * ⚠️ **배경을 눌러도 닫히지 않는다.** 실수로 닫으면 최대 1분 넘게 걸린 결과가 날아간다.
 * 나가는 길은 닫기 버튼과 Esc 뿐이고, 진행 중(추출·저장)에는 둘 다 막는다.
 */
export function ProductSearchModal({
  phase,
  candidates,
  result,
  saved,
  shelfCount,
  error,
  onSelect,
  onBack,
  onConfirm,
  onRegisterAnother,
  onClose,
  onRetakeLabel,
}: {
  phase: RegisterPhase;
  candidates: ProductCandidate[];
  result: SearchResult | null;
  saved: Product | null;
  shelfCount: number;
  error: string | null;
  onSelect: (candidate: ProductCandidate) => void;
  onBack: () => void;
  onConfirm: () => void;
  onRegisterAnother: () => void;
  onClose: () => void;
  /** 성분을 못 찾았을 때 — 모달을 닫고 성분표 촬영으로 보낸다. */
  onRetakeLabel: () => void;
}) {
  const busy = phase === "extracting" || phase === "saving";

  // 모달 뒤 화면이 스크롤되면 안 된다(사용자 요청 2026-08-20).
  useBodyScrollLock();

  // Esc 로 닫기 — 오버레이라 브라우저 뒤로가기가 닫아 주지 않는다(CameraCapture 와 같은 이유).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, busy]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={phase === "choosing" ? "제품 선택" : "검색 결과"}
    >
      <div className={styles.sheet}>
        <div className={styles.bar}>
          {/* 성분 화면에서는 후보로 돌아갈 수 있다. 후보가 없으면(사진 등록) 숨긴다. */}
          {phase === "found" && candidates.length > 0 ? (
            <button
              type="button"
              className={styles.back}
              onClick={onBack}
              aria-label="다른 제품 고르기"
            >
              <Icon name="arrow_back" />
            </button>
          ) : (
            <span className={styles.barSpacer} />
          )}

          <p className={styles.title}>
            {phase === "choosing"
              ? "어떤 제품인가요?"
              : phase === "done"
                ? "등록 완료"
                : "검색 결과"}
          </p>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.body}>
          {phase === "choosing" && (
            <CandidateList candidates={candidates} onSelect={onSelect} />
          )}

          {phase === "extracting" && <Extracting />}

          {(phase === "found" || phase === "saving") && result && (
            <ResultView
              result={result}
              // 저장 중에는 모달을 떠나는 버튼을 주지 않는다(닫기와 같은 규칙).
              onRetakeLabel={phase === "found" ? onRetakeLabel : undefined}
            />
          )}

          {phase === "done" && saved && (
            <SavedView product={saved} shelfCount={shelfCount} />
          )}
        </div>

        <div className={styles.footer}>
          {error && (
            <p className={styles.error} role="alert">
              <Icon name="error" size="sm" />
              {error}
            </p>
          )}

          {(phase === "found" || phase === "saving") && result && (
            <button
              type="button"
              className={styles.submit}
              onClick={onConfirm}
              disabled={phase === "saving"}
            >
              {phase === "saving" ? (
                <>
                  <Icon name="progress_activity" className={styles.spinner} />
                  담는 중…
                </>
              ) : (
                <>
                  <Icon name="add_circle" filled />
                  선반에 등록하기
                </>
              )}
            </button>
          )}

          {phase === "done" && (
            <>
              {/*
                방금 제품이 늘었다 — 새 제품을 반영해 루틴을 다시 짜는 것이 자연스러운
                다음 행동이다(사용자 피드백 2026-08-20: 닫기(X)와 "더 등록하기"의 기능이
                같아서 헷갈렸다). 더 등록하기는 보조 버튼으로 내린다.
              */}
              <Link href="/routine/new" className={styles.submit}>
                <Icon name="auto_awesome" filled />
                루틴 다시 짜기
              </Link>
              <button
                type="button"
                className={styles.secondary}
                onClick={onRegisterAnother}
              >
                <Icon name="add_circle" />
                다른 제품 등록하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateList({
  candidates,
  onSelect,
}: {
  candidates: ProductCandidate[];
  onSelect: (candidate: ProductCandidate) => void;
}) {
  /*
   * ⭐ 빈 배열은 실패가 아니라 정상 응답이다(프롬프트 규칙 3: 화해에 없으면 []).
   *    막다른 길을 만들지 않도록 다음 행동을 알려 준다.
   */
  if (candidates.length === 0) {
    return (
      <p className={styles.empty}>
        검색 결과가 없어요. 이름을 조금 다르게 적어 보거나, 제품 사진을 함께
        올리면 성분표를 직접 읽어 등록할 수 있어요.
      </p>
    );
  }

  return (
    <>
      <p className={styles.lead}>
        찾은 제품 {candidates.length}개예요. 담을 제품을 골라 주세요.
      </p>

      <ul className={styles.candidates}>
        {candidates.map((candidate, index) => (
          // 이름이 겹치는 후보가 올 수 있어 index 를 함께 쓴다.
          <li key={`${candidate.product_name}-${index}`}>
            <button
              type="button"
              className={styles.candidate}
              onClick={() => onSelect(candidate)}
            >
              <span className={styles.candidateThumb}>
                {/*
                  화해 CDN 썸네일(96x96). 서버가 허용 호스트인지 이미 걸렀다.
                  최적화는 끈다 — 이미 작은 이미지라 얻을 게 없고 서버 부하만 는다.
                */}
                {candidate.image_url ? (
                  <Image
                    src={candidate.image_url}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className={styles.candidateThumbImg}
                  />
                ) : (
                  <Icon name="image" className={styles.candidateThumbIcon} />
                )}
              </span>

              <span className={styles.candidateText}>
                <span className={styles.candidateName}>
                  {candidate.product_name}
                </span>
                {/* brand·volume 은 페이지에서 확인 못 하면 null 이다(규칙 6·7). 없으면 그냥 뺀다. */}
                {(candidate.brand || candidate.volume) && (
                  <span className={styles.candidateMeta}>
                    {[candidate.brand, candidate.volume]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
              <Icon name="chevron_right" className={styles.candidateArrow} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 성분 추출 대기. 실측 14~54초라 경과를 보여 주지 않으면 멈춘 줄 안다. */
function Extracting() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <p className={styles.loading} role="status">
      <Icon name="progress_activity" className={styles.spinner} />
      성분을 읽는 중… {elapsed}초
    </p>
  );
}

/** 등록 완료. 폼 아래 인라인이 아니라 모달로 보여 준다 — 방금 한 행동의 결과가 눈에 띄어야 한다. */
function SavedView({
  product,
  shelfCount,
}: {
  product: Product;
  shelfCount: number;
}) {
  return (
    <div className={styles.saved}>
      <Icon name="check_circle" filled className={styles.savedIcon} />
      <p className={styles.savedTitle}>선반에 담았어요</p>
      <p className={styles.savedName}>
        {product.productName}
        <span className={styles.chip}>{product.category}</span>
      </p>
      <p className={styles.savedCount}>내 선반에 총 {shelfCount}개</p>
    </div>
  );
}

function ResultView({
  result,
  onRetakeLabel,
}: {
  result: SearchResult;
  onRetakeLabel?: () => void;
}) {
  return (
    <>
      <div className={styles.head}>
        <span className={styles.thumb}>
          {/*
            직접 찍은 사진이 우선, 없으면 검색 결과 이미지. 둘 다 없으면 카테고리 아이콘.
            (담을 때 서버가 검색 이미지를 받아 data URL 로 바꿔 저장하므로,
             담긴 뒤에는 어느 쪽이든 같은 모양이 된다.)
          */}
          {result.thumbnail || result.imageUrl ? (
            <Image
              src={result.thumbnail ?? result.imageUrl ?? ""}
              alt=""
              width={112}
              height={112}
              unoptimized
              className={styles.thumbImg}
            />
          ) : (
            <Icon name={stepIcon(result.category)} filled />
          )}
        </span>

        <div className={styles.headText}>
          <p className={styles.name}>{result.productName}</p>
          <span className={styles.chip}>{result.category}</span>
          {/* 제조사·용량은 없을 수 있다. 빈 자리를 만들지 않고 있을 때만 보여 준다. */}
          {(result.productCompany || result.volume) && (
            <p className={styles.meta}>
              {[result.productCompany, result.volume]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      <h3 className={styles.sectionTitle}>
        성분
        {result.ingredients.length > 0 && (
          <span className={styles.count}>{result.ingredients.length}개</span>
        )}
      </h3>

      {/*
        빈 배열은 실패가 아니라 정상 응답이다 — 프롬프트가 "확신 없으면 []" 를 요구한다.
        성분을 지어내지 않았다는 뜻이므로 그대로 알리고 다음 행동을 제안한다.
        이 상태로도 담을 수 있다(이름만 저장).
      */}
      {result.ingredients.length === 0 ? (
        <>
          <p className={styles.empty}>
            성분 정보를 찾지 못했어요. 성분표 사진을 올리면 정확히 읽을 수
            있습니다.
          </p>
          {/* 문구로만 안내하면 막다른 길이다 — 바로 촬영으로 이어지는 버튼을 준다. */}
          {onRetakeLabel && (
            <button
              type="button"
              className={styles.emptyAction}
              onClick={onRetakeLabel}
            >
              <Icon name="photo_camera" filled size="sm" />
              성분표 촬영하기
            </button>
          )}
        </>
      ) : (
        <ul className={styles.ingredients}>
          {result.ingredients.map((ingredient) => (
            <li key={ingredient} className={styles.ingredient}>
              {ingredient}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
