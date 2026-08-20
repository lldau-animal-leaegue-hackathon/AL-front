"use client";

import { useEffect } from "react";

/**
 * 모달이 떠 있는 동안 배경 스크롤을 잠근다(사용자 요청 2026-08-20 —
 * 모달 뒤 화면이 스크롤되면 안 된다).
 *
 * 이전 값을 복원하므로 **중첩 모달도 안전하다** — 성분 상세 안에서 제품 모달을
 * 열면 안쪽이 "hidden"을 저장했다가 닫힐 때 되돌리고, 바깥이 원래 값을 되돌린다
 * (React 는 자식 cleanup 을 먼저 실행한다).
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}
