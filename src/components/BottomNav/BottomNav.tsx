"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";

import styles from "./BottomNav.module.css";

// href가 없는 탭은 아직 화면이 없다. Link로 두면 존재하지 않는 경로로 보내므로
// 화면이 생기기 전까지는 이동하지 않는 항목으로 그린다.
const TABS = [
  { icon: "home", label: "Home", href: "/" },
  { icon: "center_focus_strong", label: "Scan", href: "/scan" },
  { icon: "event_repeat", label: "Routine", href: "/routine" },
  { icon: "person", label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const active = "href" in tab && pathname === tab.href;
        const content = (
          <>
            <Icon name={tab.icon} filled={active} />
            <span className={styles.label}>{tab.label}</span>
          </>
        );

        if (!("href" in tab)) {
          return (
            <span
              key={tab.label}
              className={`${styles.item} ${styles.pending}`}
              aria-disabled="true"
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
