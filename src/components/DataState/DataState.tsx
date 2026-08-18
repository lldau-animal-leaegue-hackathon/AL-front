"use client";

import { Icon } from "@/components/Icon";

import styles from "./DataState.module.css";

/**
 * 서버 데이터의 로딩·실패 상태.
 *
 * localStorage 시절에는 읽기가 즉시 끝나서 이 자리가 필요 없었다. 네트워크가 끼면
 * **수백 ms~수 초** 동안 아무것도 그리지 않게 되고, 실패하면 "데이터 없음"과 구분이 안 된다.
 * 빈 상태 문구는 화면마다 다르지만 이 둘은 같아도 되므로 한 곳에 모은다.
 */
type Props = {
  /** 아직 불러오는 중 */
  loading?: boolean;
  /** 불러오지 못했다 */
  error?: boolean;
  onRetry?: () => void;
  /** 무엇을 못 불러왔는지. 예: "루틴" → "루틴을 불러오지 못했어요" */
  label?: string;
};

export function DataState({ loading, error, onRetry, label }: Props) {
  if (loading) {
    return (
      // aria-live 로 알리면 짧은 로딩에도 스크린리더가 매번 말한다. 존재만 알린다.
      <p className={styles.loading} role="status">
        {label ? `${label}을(를) 불러오는 중…` : "불러오는 중…"}
      </p>
    );
  }

  if (!error) return null;

  return (
    <section className={styles.error} role="alert">
      <Icon name="cloud_off" className={styles.icon} />
      <p className={styles.text}>
        {label ? `${label}을(를) 불러오지 못했어요.` : "불러오지 못했어요."}
        <br />
        인터넷 연결을 확인해 주세요.
      </p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          <Icon name="refresh" size="sm" />
          다시 시도
        </button>
      )}
    </section>
  );
}
