/**
 * 네비게이션 단일 출처.
 *
 * `BottomNav`(모바일)와 `SideNav`(데스크톱)가 **같은 배열을 공유**한다.
 * 탭 정의가 두 벌이 되면 반드시 어긋난다 — 한쪽에만 탭을 추가하고 잊는 식으로.
 */

import type { Route } from "next";

export type NavTab = {
  /** Material Symbols 아이콘 이름 */
  icon: string;
  label: string;
  href: Route;
};

export const NAV_TABS: readonly NavTab[] = [
  { icon: "home", label: "홈", href: "/" },
  { icon: "center_focus_strong", label: "스캔", href: "/scan" },
  { icon: "event_repeat", label: "루틴", href: "/routine" },
  { icon: "person", label: "프로필", href: "/profile" },
];

/**
 * 루틴 수행 화면(`/routine/<루틴id>/1` …)은 한 가지 일에 집중시키는 화면이라
 * 네비게이션을 감춘다. 빠져나가는 길은 헤더의 닫기 버튼이다.
 *
 * **모바일·데스크톱 양쪽에 같이 적용해야 한다** — 사이드바만 남으면 몰입이 깨진다.
 */
export const IMMERSIVE_PATH = /^\/routine\/[^/]+\//;

export function isImmersive(pathname: string): boolean {
  return IMMERSIVE_PATH.test(pathname);
}
