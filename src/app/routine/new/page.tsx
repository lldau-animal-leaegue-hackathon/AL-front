import type { Metadata } from "next";

import { PageHeader } from "@/components/PageHeader/PageHeader";

import { RoutineForm } from "./components/RoutineForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "루틴 만들기",
};

/**
 * 루틴 생성 화면.
 *
 * 페이지는 서버 컴포넌트로 두고 폼만 클라이언트다 — 생성 입력·진행 상태·localStorage 가
 * 전부 폼 안에서만 필요하므로 `"use client"` 를 leaf 에 유지한다.
 */
export default function NewRoutinePage() {
  return (
    <>
      <PageHeader title="루틴 만들기" />

      <main className={styles.main}>
        <RoutineForm />
      </main>
    </>
  );
}
