import styles from "./TopAppBar.module.css";

export function TopAppBar({ userName }: { userName: string }) {
  return (
    <header className={styles.bar}>
      {/* fixed 바는 좌우로 꽉 채우고, 내용만 여기서 --container-max 로 좁힌다(m25). */}
      <div className={styles.inner}>
        <div className={styles.identity}>
          {/* 목업의 프로필 사진 자리. 실제 이미지는 사용자 데이터가 붙을 때 교체한다. */}
          <div className={styles.avatar} aria-hidden="true">
            {userName.charAt(0)}
          </div>
          <h1 className={styles.title}>{userName}님, 안녕하세요</h1>
        </div>

        {/* 알림 버튼은 제거했다(m18) — 알림 기능 자체가 없어서 눌러도 아무 일도
            일어나지 않는 죽은 요소였다. 알림이 생기면 그때 붙인다. */}
      </div>
    </header>
  );
}
