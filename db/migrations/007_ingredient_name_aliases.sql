-- 성분 지식의 표기 정정 (리뷰 2라운드 m15)
--
-- 지식 테이블과 제품 성분은 `sameIngredient`(src/lib/ingredientNames.ts)로 잇는다.
-- 별칭 정확 일치 또는 2자 이상 포함 관계만 보므로, 표기가 어긋나면 **지식이 조용히 안 뜬다** —
-- 화면에는 아무 오류도 안 보이고 "같이 쓰면 좋음" 칸이 그냥 비어 있을 뿐이다.
--
-- ① 오기 정정: '알파-아부틴' → '알파-알부틴'
--    한국 화장품 성분 표기 표준에 없는 철자다('ㄹ' 탈락). '알부틴' ⊄ '알파-아부틴' 이라
--    같은 시드 안의 효과 행('색소침착·칙칙함'의 '알부틴')과도 이어지지 않았고,
--    나이아신아마이드 상세 모달에는 오기가 그대로 노출됐다.
--
-- ② 별칭 다리: 제품 라벨 표기와 지식 표기가 다른 두 건.
--    `ingredientAliases` 가 괄호 안을 별칭으로 펼치므로 복합 표기로 두면 양쪽에서 도달한다
--    ('히알루론산' 으로도, 라벨의 '소듐하이알루로네이트' 로도).
--    괄호 표기는 문자열 **끝**에 와야 별칭 전개 정규식에 걸린다 — 뒤에 다른 말을 붙이지 말 것.

UPDATE ingredient_pairs SET ingredient_a = '알파-알부틴' WHERE ingredient_a = '알파-아부틴';
UPDATE ingredient_pairs SET ingredient_b = '알파-알부틴' WHERE ingredient_b = '알파-아부틴';

UPDATE ingredient_pairs SET ingredient_a = '히알루론산(소듐하이알루로네이트)' WHERE ingredient_a = '히알루론산';
UPDATE ingredient_pairs SET ingredient_b = '히알루론산(소듐하이알루로네이트)' WHERE ingredient_b = '히알루론산';
UPDATE ingredient_pairs SET ingredient_a = '티트리오일(티트리잎오일)' WHERE ingredient_a = '티트리오일';
UPDATE ingredient_pairs SET ingredient_b = '티트리오일(티트리잎오일)' WHERE ingredient_b = '티트리오일';

UPDATE ingredient_effects SET ingredient = '히알루론산(소듐하이알루로네이트)' WHERE ingredient = '히알루론산';
UPDATE ingredient_effects SET ingredient = '티트리오일(티트리잎오일)' WHERE ingredient = '티트리오일';

-- ⚠️ `ingredient_pairs` 에는 `CHECK (ingredient_a < ingredient_b)` 가 걸려 있다(005).
--    위 UPDATE 는 전부 접두사를 보존한 채 뒤에만 붙이므로 정렬 순서가 바뀌지 않는다
--    (나이아신아마이드 < 알파-알부틴, 레티놀 < 티트리오일(…), * < 히알루론산(…)).
--    새 표기를 추가할 때 이 순서가 깨지면 MariaDB 가 이 마이그레이션을 거부한다 —
--    조용히 넘어가지 않으므로 그때 표기를 다시 정하면 된다.

INSERT INTO schema_migrations (version)
VALUES ('007')
ON DUPLICATE KEY UPDATE version = version;
