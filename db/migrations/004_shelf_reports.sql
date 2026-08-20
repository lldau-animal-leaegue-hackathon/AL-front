-- 004_shelf_reports — 선반 분석(시너지·충돌·타입별 주의) 결과 캐시
--
-- 왜 필요한가 (2026-08-20):
--   선반 전체를 AI 에 넘겨 제품 간 상호작용을 분석한다(계획서 Q2-A).
--   호출 1회가 1~2분 + 구독 차감이라, **선반이 안 바뀌면 다시 만들지 않는다.**
--
--   캐시 키는 fingerprint — 정렬된 (product_id, ingredients) 쌍의 SHA-256.
--   products.updated_at 을 쓰지 않는 이유(refuter 검증):
--     · 과잉 무효화 — warnings 저장·이미지 채우기에도 updated_at 이 갱신된다
--     · 과소 무효화 — 기존 카탈로그 제품을 선반에 담고 빼는 것은 products 행을
--       안 건드려 updated_at 으로는 감지되지 않는다
--
--   user_id 가 PK 라 사용자당 최신 1건만 남는다(UPSERT). 지문이 다르면 갈아 끼운다.
--
-- 적용 방법:
--   mysql -h <host> -u <user> -p <database> < db/migrations/004_shelf_reports.sql
--
-- 규칙(001 과 동일): 이 파일을 고치지 말고 005 를 추가한다. 테이블을 DROP 하지 않는다.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS shelf_reports (
  user_id      CHAR(36)  NOT NULL PRIMARY KEY,
  -- SHA-256 hex 64자. 선반 구성(제품 id + 성분 내용)이 바뀌면 달라진다.
  fingerprint  CHAR(64)  NOT NULL,
  -- 프롬프트 출력 전체(skin_type_cautions·conflicts·synergies·suggestions).
  -- 라우트가 좁힌 뒤 저장하므로 읽기는 한 번 더 좁히기만 하면 된다.
  result       JSON      NOT NULL,
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_shelf_reports_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version)
VALUES ('004')
ON DUPLICATE KEY UPDATE version = version;
