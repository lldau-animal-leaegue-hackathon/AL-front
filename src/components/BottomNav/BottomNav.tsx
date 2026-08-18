"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";

import styles from "./BottomNav.module.css";

const TABS = [
  { icon: "home", label: "홈", href: "/" },
  { icon: "center_focus_strong", label: "스캔", href: "/scan" },
  { icon: "event_repeat", label: "루틴", href: "/routine" },
  { icon: "person", label: "프로필", href: "/profile" },
] as const;

// 루틴 수행 화면(/routine/daily-am/1 …)은 한 가지 일에 집중시키는 화면이라
// 탭바를 감춘다. 빠져나가는 길은 헤더의 닫기 버튼이다.
const IMMERSIVE = /^\/routine\/[^/]+\//;

export function BottomNav() {
  const pathname = usePathname();

  if (IMMERSIVE.test(pathname)) return null;

  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={tab.icon} filled={active} />
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
