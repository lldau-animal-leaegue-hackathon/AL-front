import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Animal League</h1>

      <p className={styles.description}>
        Next.js 16 개발 환경이 준비되었습니다.{" "}
        <code className={styles.code}>src/app/page.tsx</code> 를 수정해서
        시작하세요.
      </p>

      <ul className={styles.commands}>
        <li>
          <code>npm run dev</code> — 개발 서버
        </li>
        <li>
          <code>npm run check</code> — 타입 + 린트 + 포맷 한번에 검사
        </li>
      </ul>
    </main>
  );
}
