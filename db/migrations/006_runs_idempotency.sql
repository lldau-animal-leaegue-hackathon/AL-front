-- 수행 기록 멱등성 (리뷰 2라운드 m1)
--
-- 왜 필요한가: 서버가 요청마다 새 PK 를 만들고 중복을 막을 키가 없어서,
-- INSERT 가 커밋된 뒤 응답만 유실되면(모바일 연결 끊김·타임아웃) 클라이언트가
-- 실패로 보고 재시도해 **같은 수행이 2행**으로 쌓였다. 주간 달성률은
-- completedStepIds 를 합산하므로 실제 50% 가 100% 로 표시된다.
--
-- 자연키를 (user_id, routine_id, started_at) 으로 잡은 이유:
--   finished_at 은 재시도마다 `new Date()` 로 새로 만들어져 키가 될 수 없다.
--   started_at 은 수행 시작 표시(localStorage)에서 오므로 재시도·새로고침에도 같다.
--   즉 "이 사용자가 이 루틴을 이 시각에 시작한 수행"이 곧 한 건이다.
--
-- ⚠️ 이미 중복이 쌓인 DB 가 있을 수 있어 **유니크 키를 걸기 전에 중복을 먼저 정리**한다.
--    남기는 쪽은 가장 먼저 들어온 행(id 가 작은 것)이다 — 뒤엣것이 재시도 사본이다.

DELETE later
FROM routine_runs AS later
  JOIN routine_runs AS keep
    ON keep.user_id = later.user_id
   AND keep.routine_id = later.routine_id
   AND keep.started_at = later.started_at
   AND keep.id < later.id;

-- MariaDB 는 `ADD UNIQUE KEY IF NOT EXISTS` 를 지원한다(재실행 안전).
ALTER TABLE routine_runs
  ADD UNIQUE KEY IF NOT EXISTS uq_runs_user_routine_start (user_id, routine_id, started_at);

INSERT INTO schema_migrations (version)
VALUES ('006')
ON DUPLICATE KEY UPDATE version = version;
