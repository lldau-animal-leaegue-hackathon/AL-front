-- 003_concern_cache — "고민 → 성분" AI 결과를 프로필에 영속 캐시
--
-- 왜 필요한가 (2026-08-20):
--   POST /api/ai/concern 은 서버 캐시가 없어 **새로고침만 해도 같은 고민에
--   10~30초짜리 AI 호출(claude -p 프로세스 = 구독 차감)이 다시 나간다**
--   (refuter 검증 2026-08-20 — 클라이언트 SWR 캐시는 메모리뿐이다).
--
--   화면이 쓰는 키는 프로필의 wonder 하나이고 사용자당 1행이므로,
--   별도 테이블이 아니라 skin_profiles 의 지연 생성 컬럼이 정확히 맞는다
--   (products.warnings 의 "지연 생성 JSON NULL" 선례 — 001_init.sql:41).
--
--   무효화: PUT /api/profile 에서 wonder 가 **바뀔 때만** NULL 로 리셋한다.
--   NULL = 아직 안 만듦(다음 조회 때 AI 호출), '[]' = "고를 수 없음"도 유효한 답
--   (프롬프트 규칙 7)이라 캐시된다 — 같은 고민에 같은 답을 다시 사지 않는다.
--
-- 적용 방법:
--   mysql -h <host> -u <user> -p <database> < db/migrations/003_concern_cache.sql
--
-- 규칙(001 과 동일): 이 파일을 고치지 말고 004 를 추가한다. 테이블을 DROP 하지 않는다.

SET NAMES utf8mb4;

ALTER TABLE skin_profiles
  ADD COLUMN concern_ingredients JSON NULL AFTER usable_evening;

INSERT INTO schema_migrations (version)
VALUES ('003')
ON DUPLICATE KEY UPDATE version = version;
