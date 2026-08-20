"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { isImmersive } from "@/components/nav/tabs";

import styles from "./AppShell.module.css";

/**
 * 앱 셸 — 네비게이션과 본문 영역의 관계를 한 곳에서 관리한다.
 *
 * 두 네비게이션을 **항상 함께 렌더**하고 표시 여부는 CSS 가 정한다:
 *  - `< lg`  : `BottomNav`(하단 고정) 만 보인다.
 *  - `≥ lg`  : `SideNav`(좌측 고정) 만 보이고, 본문이 사이드바 폭만큼 밀린다.
 *
 * 뷰포트 분기를 JS 로 하지 않는 이유 — 서버 렌더 시점엔 뷰포트를 알 수 없어
 * 하이드레이션 불일치가 난다. 뷰포트는 CSS 가, **경로는 JS 가** 판단한다.
 *
 * 이 컴포넌트만 클라이언트다. `children` 은 prop 으로 넘어오므로
 * 페이지들은 그대로 서버 컴포넌트로 남는다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 몰입 화면에서는 사이드바 자체가 렌더되지 않는다.
  // 그때도 본문을 밀면 왼쪽 240px 가 빈 채로 남는다.
  const immersive = isImmersive(pathname);

  return (
    <>
      <SideNav />
      <div className={immersive ? styles.contentFull : styles.content}>
        {children}
      </div>
      <BottomNav />
    </>
  );
}
