-- 005_ingredient_knowledge — 성분 지식 공유 테이블 (시나리오별)
--
-- 왜 필요한가 (2026-08-20, 사용자 지시):
--   "피부고민별로 도움이 되는 성분, 상승작용 있는 성분, 같이 쓰면 안 되는 성분들 등
--    다양한 시나리오의 성분들을 디비에 저장해줘."
--
--   지금까지 성분 지식은 사용자별 캐시(skin_profiles.concern_ingredients,
--   shelf_reports)에만 있었다 — 같은 지식(레티놀×비타민C 충돌 등)을 사용자마다
--   AI 로 다시 산다. 사용자와 무관한 **공용 지식**을 여기 모은다.
--   계획서(2026-08-20-ingredient-knowledge) Q2-B 로 미뤄 뒀던 것을 지시로 앞당겼다.
--
-- 채우는 경로 둘:
--   seed         : db/seeds/001_ingredient_knowledge.sql — 헤드리스 Claude 로 생성
--                  (잘 알려진 것만·지어내기 금지 규칙), 검수 후 커밋된 정적 시드
--   shelf_report : /api/ai/report 가 새 분석을 만들 때마다 쌍·타입별 주의를
--                  INSERT IGNORE 로 수확 — 쓸수록 지식이 쌓인다
--
-- 적용 방법:
--   mysql -h <host> -u <user> -p <database> < db/migrations/005_ingredient_knowledge.sql
--
-- 규칙(001 과 동일): 이 파일을 고치지 말고 006 을 추가한다. 테이블을 DROP 하지 않는다.

SET NAMES utf8mb4;

-- 성분 쌍 지식 — 상승작용(synergy)·충돌(conflict)
CREATE TABLE IF NOT EXISTS ingredient_pairs (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  -- ⚠️ 항상 ingredient_a < ingredient_b 로 저장한다(CHECK 로 강제).
  --    (레티놀, 비타민C)와 (비타민C, 레티놀)이 다른 행이 되는 것을 막는다.
  ingredient_a  VARCHAR(100) NOT NULL,
  ingredient_b  VARCHAR(100) NOT NULL,
  kind          ENUM('synergy', 'conflict') NOT NULL,
  description   TEXT         NOT NULL,
  source        ENUM('seed', 'shelf_report') NOT NULL DEFAULT 'seed',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_pair (ingredient_a, ingredient_b, kind),
  CONSTRAINT chk_pair_order CHECK (ingredient_a < ingredient_b)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 시나리오별 성분 효과 — 고민별 도움(helps)·피부 타입별 주의(caution)
-- scenario 예: kind=concern 이면 '여드름·트러블', kind=skin_type 이면 '건성'
CREATE TABLE IF NOT EXISTS ingredient_effects (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  scenario_kind  ENUM('concern', 'skin_type') NOT NULL,
  scenario       VARCHAR(60)  NOT NULL,
  ingredient     VARCHAR(100) NOT NULL,
  relation       ENUM('helps', 'caution') NOT NULL,
  description    TEXT         NOT NULL,
  -- helps 항목의 부가 주의점(예: "AHA 와 병용 시 자극"). 없으면 NULL.
  caution        TEXT         NULL,
  source         ENUM('seed', 'shelf_report') NOT NULL DEFAULT 'seed',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_effect (scenario_kind, scenario, ingredient, relation)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version)
VALUES ('005')
ON DUPLICATE KEY UPDATE version = version;
