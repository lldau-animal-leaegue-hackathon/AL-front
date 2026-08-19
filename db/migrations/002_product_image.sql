-- 002_product_image — 공유 카탈로그에 제품 이미지 컬럼 추가
--
-- 왜 필요한가 (2026-08-19):
--   "인기 제품"을 서버 카탈로그에서 담긴 횟수 순으로 보여주기로 했다(concern-flow Q2).
--   그런데 지금 이미지가 들어 있는 곳은 `shelf_items.thumbnail` 하나뿐이고,
--   그건 **사용자가 직접 찍은 사진**이다(001_init.sql 주석에 명시).
--   그대로 인기 제품에 쓰면 **남의 개인 사진이 다른 사용자에게 노출된다.**
--
--   그래서 공유 가능한 이미지를 products 로 분리한다:
--     - products.image     : 검색(화해)에서 온 제품 이미지. **누구에게나 보여도 된다**
--     - shelf_items.thumbnail : 내가 찍은 사진. **나만 본다**(현행 유지)
--
--   표시 우선순위는 화면이 정한다 — 내 선반은 내 사진 우선, 인기 제품은 공유 이미지만.
--
-- 적용 방법:
--   mysql -h <host> -u <user> -p <database> < db/migrations/002_product_image.sql
--
-- 규칙(001 과 동일): 이 파일을 고치지 말고 003 을 추가한다. 테이블을 DROP 하지 않는다.

SET NAMES utf8mb4;

-- data URL(base64) 이 들어간다. 256px JPEG 기준 수십 KB 라 MEDIUMTEXT 로 충분하다.
-- 검색에서 안 왔거나 받지 못했으면 NULL 이다 — 화면은 아이콘으로 폴백한다.
ALTER TABLE products
  ADD COLUMN image MEDIUMTEXT NULL AFTER source_url;

INSERT INTO schema_migrations (version)
VALUES ('002')
ON DUPLICATE KEY UPDATE version = version;
