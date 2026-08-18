"use client";

import { useRouter } from "next/navigation";

import { Icon } from "@/components/Icon";

import styles from "./PageHeader.module.css";

/** 뒤로가기가 필요해 클라이언트 컴포넌트다. 제목은 props로 받는다. */
export function PageHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <header className={styles.bar}>
      <button
        className={styles.back}
        type="button"
        onClick={() => router.back()}
        aria-label="뒤로 가기"
      >
        <Icon name="arrow_back" />
      </button>
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
