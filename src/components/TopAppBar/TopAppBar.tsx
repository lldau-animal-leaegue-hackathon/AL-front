import { Icon } from "@/components/Icon";

import styles from "./TopAppBar.module.css";

export function TopAppBar({ userName }: { userName: string }) {
  return (
    <header className={styles.bar}>
      <div className={styles.identity}>
        {/* 목업의 프로필 사진 자리. 실제 이미지는 사용자 데이터가 붙을 때 교체한다. */}
        <div className={styles.avatar} aria-hidden="true">
          {userName.charAt(0)}
        </div>
        <h1 className={styles.title}>{userName}님, 안녕하세요</h1>
      </div>

      <button className={styles.bell} type="button" aria-label="알림">
        <Icon name="notifications_active" />
      </button>
    </header>
  );
}
