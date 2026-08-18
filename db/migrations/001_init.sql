-- 001_init — 스킨케어 앱 초기 스키마 (MariaDB)
--
-- 적용 방법:
--   mysql -h <host> -u <user> -p <database> < db/migrations/001_init.sql
--
-- 규칙 (사용자 결정 2026-08-18):
--  * 마이그레이션은 **번호 붙인 파일로 쌓는다.** 이 파일을 고치지 말고 002, 003 을 추가한다.
--    이미 적용된 서버에서 파일을 고치면 그 서버만 다른 스키마가 된다.
--  * 테이블을 DROP 해서 다시 만들지 않는다 — 데모 중에 컬럼 하나 추가하려다 데이터가 날아간다.
--  * 적용 이력은 아래 schema_migrations 에 남긴다.
--
-- 설계 근거는 docs/plans/2026-08-18-server-storage/README.md 참조.

SET NAMES utf8mb4;

-- ── 마이그레이션 실행 기록 ──────────────────────────────────────────
-- 어떤 파일까지 적용됐는지 서버에 물어볼 수 있어야 한다.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(20)  NOT NULL PRIMARY KEY,
  applied_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 사용자 ──────────────────────────────────────────────────────────
-- 쿠키 익명 ID. 로그인 화면이 없으므로 비밀번호·이메일 컬럼도 없다.
-- IP 를 키로 쓰지 않은 이유: 같은 와이파이면 남의 데이터가 보이고, 모바일은 IP 가 자주 바뀐다.
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 제품 (전체 공유 카탈로그) ───────────────────────────────────────
-- ⭐ 사용자별이 아니다. 누가 검색했든 모두가 즉시 쓴다 — 40초짜리 웹 검색이 쓸수록 줄어든다.
CREATE TABLE IF NOT EXISTS products (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  brand        VARCHAR(120) NULL,
  category     VARCHAR(60)  NOT NULL,
  -- string[]. **빈 배열이 정상**이다(프롬프트 규칙: 확신 없으면 지어내지 말고 [] 반환).
  ingredients  JSON         NOT NULL,
  -- string[]. 주의사항은 지연 생성이라 아직 없을 수 있다.
  warnings     JSON         NULL,
  -- 성분을 어디서 얻었는지. **화면에 반드시 표시한다** — 폴백 출처가 구버전 성분표를
  -- 자신 있게 반환하는 것을 실측했다(scan-search 계획서 참조). 성분은 알레르기와 직결된다.
  ingredient_source ENUM('photo', 'hwahae', 'fallback', 'manual') NOT NULL,
  source_url   VARCHAR(500) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 두 사용자가 같은 제품을 동시에 검색해도 중복이 쌓이지 않게 한다.
  -- brand 가 NULL 이면 MySQL/MariaDB 는 중복을 허용하므로, 브랜드 미상은 빈 문자열로 넣는다.
  UNIQUE KEY uk_products_name_brand (name, brand),
  KEY idx_products_category (category)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 내 선반 (사용자 ↔ 제품) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelf_items (
  id          CHAR(36)   NOT NULL PRIMARY KEY,
  user_id     CHAR(36)   NOT NULL,
  product_id  CHAR(36)   NOT NULL,
  -- 긴 변 256px JPEG data URL. 사용자가 **직접 찍은 사진**이라 공유 카탈로그(products)에 두지 않는다.
  thumbnail   MEDIUMTEXT NULL,
  created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_shelf_user_product (user_id, product_id),
  KEY idx_shelf_user (user_id),
  CONSTRAINT fk_shelf_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_shelf_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 피부 프로필 (루틴 생성 입력) ────────────────────────────────────
-- 여러 루틴이 같은 입력에서 나오므로 루틴마다 중복 저장하지 않고 따로 둔다.
CREATE TABLE IF NOT EXISTS skin_profiles (
  user_id         CHAR(36)    NOT NULL PRIMARY KEY,
  wonder          TEXT        NOT NULL,
  usable_morning  VARCHAR(30) NOT NULL,
  usable_evening  VARCHAR(30) NOT NULL,
  updated_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 루틴 ────────────────────────────────────────────────────────────
-- 프롬프트 1회 출력({morning, evening})은 여기 **2행**으로 펼쳐 저장한다.
CREATE TABLE IF NOT EXISTS routines (
  id          CHAR(36)        NOT NULL PRIMARY KEY,
  user_id     CHAR(36)        NOT NULL,
  name        VARCHAR(100)    NOT NULL,
  -- `condition` 은 SQL 예약어라 백틱이 필요하다. 예: "평소", "생리 기간"
  `condition` VARCHAR(60)     NOT NULL,
  time_slot   ENUM('am','pm') NOT NULL,
  summary     VARCHAR(255)    NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_routines_user (user_id),
  CONSTRAINT fk_routines_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 루틴 단계 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routine_steps (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  routine_id     CHAR(36)     NOT NULL,
  seq            SMALLINT     NOT NULL,
  routine_name   VARCHAR(100) NOT NULL,
  -- ⚠️ **초 단위 정수다. 분이 아니다.** 옛 시드가 분·초를 이원화해 실제로 혼동을 만들었다.
  estimated_time INT          NOT NULL,
  -- string[]. **제품 id 가 아니라 이름 문자열**이다(프롬프트 출력 그대로).
  -- 이름이 조금만 달라도 products 와 매칭이 안 되므로, 못 찾아도 이름은 표시해야 한다.
  using_product  JSON         NOT NULL,
  how_to_use     JSON         NOT NULL,
  tips           JSON         NOT NULL,
  -- 단수형 키에 배열이 들어간다. 오타가 아니라 프롬프트 명세 그대로다.
  warning        JSON         NOT NULL,
  UNIQUE KEY uk_step_routine_seq (routine_id, seq),
  CONSTRAINT fk_steps_routine FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── 수행 기록 ───────────────────────────────────────────────────────
-- 주간 달성률(Q10)의 유일한 근거다.
CREATE TABLE IF NOT EXISTS routine_runs (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  -- ⚠️ **routine_id 에 FK 를 걸지 않는다.** 루틴을 다시 만들면 옛 기록이 고아가 되는데,
  -- CASCADE 로 지우면 과거 수행 이력이 사라지고 달성률이 소급해서 바뀐다.
  -- 기록은 남아야 하고, 화면은 못 찾은 루틴을 "삭제된 루틴"으로 표시한다.
  routine_id         CHAR(36) NOT NULL,
  started_at         DATETIME NOT NULL,
  finished_at        DATETIME NOT NULL,
  completed_step_ids JSON     NOT NULL,
  -- 주간 달성률이 "이 사용자의 특정 기간 기록"을 훑으므로 복합 인덱스로 잡는다.
  KEY idx_runs_user_finished (user_id, finished_at),
  CONSTRAINT fk_runs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version)
VALUES ('001')
ON DUPLICATE KEY UPDATE version = version;
