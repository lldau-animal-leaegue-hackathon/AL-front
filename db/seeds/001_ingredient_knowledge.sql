-- db/seeds/001_ingredient_knowledge.sql — 공유 성분 지식 시드
-- 생성: 헤드리스 Claude 4회 호출(고민별/시너지/충돌/타입별), 스크립트가 좁히고 사람이 검수했다.
-- 규칙: 잘 알려진 것만·지어내기 금지·진단 금지 (src/lib/prompts/ 와 같은 골격).
-- INSERT IGNORE 라 재실행해도 안전하다(유니크 키 기준 중복 무시).

SET NAMES utf8mb4;

INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('8593da4c-c948-492f-9242-2d25181d0a0e', '아스코빅애씨드', '토코페롤', 'synergy', '지용성 토코페롤이 수용성 아스코빅애씨드의 산화를 늦춰 항산화 효과를 서로 보완합니다. 아침 세안 직후 가장 먼저 바르고 자외선차단제로 마무리하면 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('6325160b-63fa-43c6-a5dc-7a81948f3a3f', '아스코빅애씨드', '페룰릭애씨드', 'synergy', '페룰릭애씨드가 비타민씨의 안정성을 높여 항산화력이 오래 유지되도록 돕습니다. 낮 시간대에 사용하고 개봉 후에는 갈변 여부를 확인하며 쓰는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('c92a1593-3490-47e8-99c2-7235119fd1c5', '나이아신아마이드', '히알루론산', 'synergy', '히알루론산이 수분을 끌어오고 나이아신아마이드가 장벽 기능을 도와 보습이 더 오래갑니다. 히알루론산을 먼저, 나이아신아마이드를 그다음에 얹으면 무난합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('a140a1c4-cc2c-4d6e-ae37-82d3cc9856a6', '레티놀', '히알루론산', 'synergy', '레티놀 사용 초기에 나타나는 건조함과 각질을 히알루론산이 완화해 줄 수 있습니다. 밤에 레티놀을 바른 뒤 보습층으로 겹쳐 올리는 순서를 권합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('7109ca57-e03d-4e89-a091-89bb04d2f8cc', '레티놀', '세라마이드', 'synergy', '세라마이드가 피부 장벽 지질을 채워 레티놀 적응 기간의 자극감을 줄이는 데 도움이 될 수 있습니다. 저녁에 레티놀 후 세라마이드 크림으로 덮어 마무리합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('4f3fc446-f807-46a0-b811-b41fc28ead39', '나이아신아마이드', '레티놀', 'synergy', '나이아신아마이드는 자극이 있는 피부의 진정과 장벽 회복을 도와 레티놀과 함께 쓰기 좋은 조합입니다. 나이아신아마이드를 먼저 흡수시킨 뒤 레티놀을 올리면 부담이 덜합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('8e1ec970-75a4-486d-927b-ecda92050a2f', '나이아신아마이드', '살리실릭애씨드', 'synergy', '살리실릭애씨드가 모공 속 각질과 피지를 정리하고 나이아신아마이드가 번들거림과 붉은기를 다독여 줄 수 있습니다. 저녁에 살리실릭애씨드를 먼저 쓰고 나이아신아마이드로 마무리합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('ecba917b-0ab5-4a23-a2ec-4af74bca5aee', '글라이콜릭애씨드', '히알루론산', 'synergy', '각질 정돈 뒤 비어 있는 수분을 히알루론산이 채워 당김을 줄여 줍니다. 밤에 글라이콜릭애씨드를 쓰고 히알루론산으로 이어 바르되 다음 날 자외선차단은 꼭 챙깁니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('890703bf-0eb3-420a-90ca-040ecdd98413', '세라마이드', '콜레스테롤', 'synergy', '피부 장벽을 이루는 지질끼리의 조합이라 함께 있을 때 장벽 회복에 더 유리합니다. 세안 후 마지막 단계 크림으로 사용하는 것이 일반적입니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('ca80f562-75f0-428a-8f3c-28591abc2f5c', '스쿠알란', '히알루론산', 'synergy', '히알루론산이 끌어온 수분을 스쿠알란이 덮어 증발을 늦춰 줍니다. 히알루론산을 촉촉한 피부에 먼저 바르고 스쿠알란을 위에 얇게 올립니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('8c0b1751-0984-4475-bfc1-2c463a1281a9', '마데카소사이드', '판테놀', 'synergy', '둘 다 진정과 보습에 쓰이는 성분이라 예민해진 피부의 편안함을 함께 도울 수 있습니다. 아침·저녁 어느 때나 자극이 느껴지는 시기에 사용하기 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('678c5804-cdc2-4cf8-b150-491f6833a1cf', '나이아신아마이드', '센텔라아시아티카추출물', 'synergy', '센텔라아시아티카추출물이 진정을 돕고 나이아신아마이드가 장벽과 톤 정돈을 거들어 예민한 피부에 무난한 조합입니다. 가벼운 앰플로 겹쳐 쓰면 부담이 적습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('db0cb53a-8168-4d74-a2b1-45e31797728f', '나이아신아마이드', '트라넥사믹애씨드', 'synergy', '색소가 신경 쓰이는 피부의 톤 정돈을 서로 다른 경로로 거들어 함께 쓰는 경우가 많습니다. 아침에 사용한다면 자외선차단제를 반드시 병행하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('2c8563e0-e07e-4220-8c2c-652d2fd855e6', '나이아신아마이드', '아젤라익애씨드', 'synergy', '붉은기와 얼룩덜룩한 톤이 고민인 피부에서 함께 쓰이며 서로의 사용감을 보완합니다. 저녁에 얇게 바르고 보습으로 마무리하는 순서를 권합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('2ad367b3-9f4f-42cc-86dd-6e6f12346d61', '나이아신아마이드', '알파-아부틴', 'synergy', '멜라닌 생성 단계와 전달 단계에 각각 작용해 톤 케어를 함께 거들 수 있습니다. 아침·저녁 모두 사용 가능하지만 낮에는 자외선차단이 필수입니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('2b453fb1-a9c2-4da1-baa5-4f6187a8d191', '펩타이드', '히알루론산', 'synergy', '히알루론산이 채운 수분 위에서 펩타이드가 탄력 케어를 거들어 매끈한 결을 만드는 데 도움이 될 수 있습니다. 묽은 히알루론산을 먼저, 펩타이드 세럼을 나중에 바릅니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('1e8fd1e8-f065-4a21-8bd3-c8f4aec22e42', '세라마이드', '우레아', 'synergy', '우레아가 두꺼운 각질을 부드럽게 하고 세라마이드가 장벽을 채워 거칠어진 피부에 함께 쓰기 좋습니다. 팔꿈치·발뒤꿈치처럼 각질이 두꺼운 부위에 저녁에 사용하면 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('3f2c0950-4791-4fa6-9a63-1ea4f7327eb1', '글리세린', '판테놀', 'synergy', '두 성분 모두 수분을 끌어당기는 습윤제로, 함께 쓰면 자극이 적으면서 촉촉함이 오래갑니다. 토너·에센스 단계에서 사용하고 위에 크림을 덮어 주면 효과적입니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('65ff00d4-8204-4d37-b7c9-6266dc10cfd9', '살리실릭애씨드', '징크피씨에이', 'synergy', '징크피씨에이가 피지 조절을 거들고 살리실릭애씨드가 모공 속 각질을 정리해 유분이 많은 피부에 잘 맞습니다. 저녁 세안 후 국소적으로 사용하는 편이 부담이 적습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('3294cb49-7312-401e-a378-fbebeaf8aec7', '알란토인', '판테놀', 'synergy', '자극을 받은 피부를 달래는 데 흔히 함께 쓰이는 순한 진정 조합입니다. 각질 제거나 레티놀 사용 다음 날 회복 케어로 쓰면 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('967b6a2f-671c-4611-b398-795e8e62736d', '글라이콜릭애씨드', '레티놀', 'conflict', '각질 탈락을 촉진하는 두 성분을 함께 쓰면 자극과 건조, 따가움이 겹쳐 나타날 수 있습니다. 아침에는 산, 저녁에는 레티놀처럼 시간대를 나누거나 격일로 번갈아 사용하는 것이 안전합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('f45344f6-b0ab-4881-a509-865829613121', '레티놀', '살리실릭애씨드', 'conflict', '피지 조절과 각질 정돈 작용이 중첩되어 민감한 피부의 경우 홍조와 각질 들뜸이 심해질 수 있습니다. 같은 날 겹쳐 쓰기보다 요일을 나누어 번갈아 적용하는 편이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('252f56c3-09da-4097-ab13-bf445f3813cd', '락틱애씨드', '레티놀', 'conflict', '두 성분 모두 턴오버를 앞당겨 함께 쓰면 장벽이 얇아진 느낌과 당김이 생길 수 있습니다. 레티놀 사용에 익숙해진 뒤 락틱애씨드를 주 1~2회만 다른 날에 배치하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('ec741f74-6f47-41e8-b124-cdfa59707bce', '레티놀', '벤조일퍼옥사이드', 'conflict', '벤조일퍼옥사이드는 산화력이 강해 같은 자리에 겹쳐 바르면 레티놀의 안정성이 떨어질 수 있고 자극도 커집니다. 아침에 벤조일퍼옥사이드, 저녁에 레티놀로 시간대를 분리하는 것이 일반적인 방법입니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('5bae9c3e-a644-438e-844c-cad677441421', '레티놀', '아스코빅애씨드', 'conflict', '선호하는 pH 범위가 서로 달라 겹쳐 바르면 자극이 커지고 각 성분이 제 역할을 하기 어려울 수 있습니다. 아스코빅애씨드는 아침, 레티놀은 저녁으로 나누어 사용하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('6dc4278b-7951-4841-b7eb-999967f202f0', '레티놀', '아젤라익애씨드', 'conflict', '두 성분 모두 초기 적응기에 따가움과 붉어짐이 나타날 수 있어 동시에 시작하면 원인을 구분하기 어렵습니다. 한 가지에 먼저 적응한 뒤 다른 하나를 다른 날에 추가하는 방식이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('0abd8949-5dc7-4f80-8c38-c9fb5babfbf0', '레티놀', '티트리오일', 'conflict', '티트리오일은 그 자체로 자극이 될 수 있어 레티놀과 겹치면 건조함과 홍조가 함께 심해질 수 있습니다. 부분 사용으로 제한하거나 레티놀을 바르지 않는 날에만 사용하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('16664012-054b-408f-8f8d-b2f2d9f45640', '레티놀', '유황', 'conflict', '유황은 피지와 각질을 강하게 건조시켜 레티놀과 같이 쓰면 피부가 지나치게 마를 수 있습니다. 유황 제품은 국소 부위에만, 레티놀과 다른 날에 사용하는 편이 낫습니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('71ffc5f0-5445-4a77-aefd-85774ef5551e', '벤조일퍼옥사이드', '아스코빅애씨드', 'conflict', '산화력이 강한 벤조일퍼옥사이드와 산화에 약한 아스코빅애씨드를 겹쳐 바르면 비타민C가 변질되어 효과가 떨어질 수 있습니다. 최소 몇 시간 간격을 두거나 아침·저녁으로 나누어 쓰세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('052f28af-8792-4a3c-8ea7-2015ba45e01d', '벤조일퍼옥사이드', '살리실릭애씨드', 'conflict', '둘 다 피지와 각질을 강하게 건조시켜 함께 쓰면 피부가 트고 각질이 일어날 수 있습니다. 부위를 나누거나 하루 한 가지만 사용하는 것으로 조절하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('c0aa5809-b93b-4fe8-89a9-6f71c61eae87', '글라이콜릭애씨드', '벤조일퍼옥사이드', 'conflict', '각질 제거와 강한 건조 작용이 동시에 걸려 따가움과 붉어짐이 커질 수 있습니다. 같은 날 겹치지 말고 요일을 나누어 사용하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('e0905543-4d8c-447c-8d47-28b87a037ca7', '글라이콜릭애씨드', '살리실릭애씨드', 'conflict', '성격이 다른 두 각질 제거 성분을 한 번에 올리면 장벽 손상으로 따갑고 예민해질 수 있습니다. 하나만 쓰거나, 둘을 함께 담은 저농도 제품을 주 1~2회로 제한하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('56d6924e-b24f-4904-8cb3-f592c059307d', '글라이콜릭애씨드', '아스코빅애씨드', 'conflict', '둘 다 산성도가 낮아 연달아 바르면 따가움과 홍조가 겹쳐 나타날 수 있습니다. 아스코빅애씨드는 아침, 각질 제거 산은 저녁으로 분리하는 것이 무난합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('fa4cd18d-a6fa-4ec6-974e-5a190256203e', '살리실릭애씨드', '아스코빅애씨드', 'conflict', '산성 제형이 연이어 닿으면 자극이 누적되고 비타민C의 안정성도 흔들릴 수 있습니다. 시간대를 나누거나 산 사용일과 비타민C 사용일을 번갈아 두세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('db2c31f4-024e-424f-8cc2-e7a21b3c2709', '살리실릭애씨드', '아젤라익애씨드', 'conflict', '각질 정돈과 진정 목적이 겹치면서 자극만 더해져 화끈거림이 생길 수 있습니다. 아침·저녁으로 나누거나 한 가지를 부분 사용으로 제한하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('ef87c568-1072-4d74-b731-7f50acd5d590', '글라이콜릭애씨드', '아젤라익애씨드', 'conflict', '함께 사용하면 예민한 피부의 경우 따가움과 각질 들뜸이 두드러질 수 있습니다. 아젤라익애씨드에 먼저 적응한 뒤 산은 다른 날에 배치하세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('2f7f47fc-fe40-4da4-9085-592f4e2a02ff', '나이아신아마이드', '아스코빅애씨드', 'conflict', '높은 농도로 곧바로 겹쳐 바르면 일시적인 홍조나 화끈거림을 느끼는 경우가 있습니다. 대체로 함께 써도 무방하지만 신경 쓰인다면 아침·저녁으로 나누거나 흡수 후 시간 간격을 두세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('36e52d46-cf58-4662-86fa-7f5a0caa841a', '글라이콜릭애씨드', '나이아신아마이드', 'conflict', '산성도가 낮은 제형과 바로 겹치면 나이아신아마이드가 성질이 바뀌어 일시적인 붉어짐이 나타날 수 있습니다. 산을 바른 뒤 피부가 안정된 다음 사용하거나 시간대를 나누세요.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('dc450d13-2ae9-4715-b9c4-1d99dff83186', '아스코빅애씨드', '카퍼트라이펩타이드-1', 'conflict', '구리를 함유한 펩타이드와 강한 항산화 성분을 겹쳐 쓰면 서로의 안정성이 떨어질 수 있다고 알려져 있습니다. 아침·저녁으로 나누어 사용하는 것이 무난합니다.', 'seed');
INSERT IGNORE INTO ingredient_pairs (id, ingredient_a, ingredient_b, kind, description, source)
VALUES ('47fe1763-7373-4a4c-b40d-3ce11cb4954b', '글라이콜릭애씨드', '카퍼트라이펩타이드-1', 'conflict', '펩타이드는 산성도가 낮은 환경에서 구조가 불안정해질 수 있어 각질 제거 산과 연달아 바르면 기대한 효과가 줄 수 있습니다. 산은 다른 시간대에 쓰고 펩타이드는 피부가 안정된 뒤 올리세요.', 'seed');

INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('d4ce37c5-a82e-4f76-b63f-658709dc8f12', 'concern', '여드름·트러블', '살리실릭애씨드', 'helps', '지용성 BHA로 모공 속 피지와 각질을 정돈해 트러블이 생기기 쉬운 피부의 경우 막힌 모공을 완화하는 데 도움을 줄 수 있습니다.', '고농도·잦은 사용 시 자극과 건조가 생길 수 있고, 임신 중에는 사용 전 전문가와 상담하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('1e92e047-9629-40da-9d48-dffe6c609464', 'concern', '여드름·트러블', '벤조일퍼옥사이드', 'helps', '여드름 부위의 원인균을 줄이는 성분으로 알려져 있어 염증성 트러블이 잦은 피부의 경우 도움이 될 수 있습니다.', '자극·건조·따가움이 생길 수 있으며 수건이나 옷, 모발을 탈색시킬 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('44f48c18-f39e-4b1b-be6e-95b2a73e657b', 'concern', '여드름·트러블', '나이아신아마이드', 'helps', '피지 조절과 진정에 도움을 주는 것으로 알려져 트러블 후 붉은 자국이 남기 쉬운 피부의 경우 유용할 수 있습니다.', '고농도에서 일부 피부는 화끈거림을 느낄 수 있어 낮은 농도부터 사용하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('a6fe6f94-fca4-47d0-b49e-a263c5382432', 'concern', '여드름·트러블', '아젤라익애씨드', 'helps', '각질 정돈과 진정에 도움을 주며 트러블 자국이 함께 고민인 피부의 경우 선택할 수 있습니다.', '초기에 따끔거림이나 건조함이 나타날 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('6f98d1ab-6181-474c-937c-c77265af8b14', 'concern', '여드름·트러블', '티트리오일', 'helps', '국소 진정 목적으로 오래 쓰여온 정유로, 부분적인 트러블 부위 관리에 사용할 수 있습니다.', '원액은 자극이 강하므로 희석해 쓰고, 정유에 알레르기 반응이 있을 수 있어 패치 테스트를 권합니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('76f33577-9da9-4d19-a185-a1e272acc839', 'concern', '건조함', '히알루론산', 'helps', '수분을 끌어당겨 붙잡는 보습 성분으로, 속당김이 있는 피부의 경우 즉각적인 수분감을 더하는 데 도움이 될 수 있습니다.', '건조한 환경에서는 단독 사용 시 수분이 증발할 수 있어 위에 유분 제형을 덧발라 잠가주는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('ab92d645-6efa-481e-8984-f0c2169f59d2', 'concern', '건조함', '세라마이드', 'helps', '피부 장벽을 이루는 지질 성분으로, 장벽이 약해져 수분을 잃기 쉬운 피부의 경우 보완에 도움을 줄 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('05e828b3-0eff-4a5a-99ab-b7313534062a', 'concern', '건조함', '글리세린', 'helps', '대표적인 습윤제로 수분을 유지시켜 주며 건조한 피부의 경우 기본 보습 성분으로 활용됩니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('7b33e06b-0bfb-4ac6-aade-721105fa6f56', 'concern', '건조함', '판테놀', 'helps', '보습과 진정에 함께 도움을 주는 것으로 알려져 건조하고 예민해진 피부의 경우 부담이 적습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('1a85727f-bcf2-48e3-a8a0-25140bd0a8c8', 'concern', '건조함', '스쿠알란', 'helps', '가볍게 밀착되는 유분 성분으로 수분 증발을 막아 건조함이 심한 피부의 경우 마무리 단계에 쓸 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('56428084-c8a1-43aa-9095-54c07b558f29', 'concern', '유분·번들거림', '나이아신아마이드', 'helps', '피지 분비 조절에 도움을 주는 것으로 알려져 오후에 번들거림이 심한 피부의 경우 유용할 수 있습니다.', '고농도에서 화끈거림을 느끼는 경우가 있어 낮은 농도부터 시작하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('b2d1454b-f71b-48d3-8e53-9a2221ecfa60', 'concern', '유분·번들거림', '살리실릭애씨드', 'helps', '모공 속 피지와 묵은 각질을 정돈해 유분이 많은 피부의 경우 매끈한 표면을 유지하는 데 도움이 될 수 있습니다.', '과도하게 사용하면 오히려 건조해지고 자극이 생길 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('001cd169-8d8e-452f-b55b-506296b0f932', 'concern', '유분·번들거림', '징크피씨에이', 'helps', '피지 조절 목적으로 지성 피부용 제품에 흔히 쓰이는 성분입니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('15f473fa-a9fe-4170-ab4a-acb082e47249', 'concern', '유분·번들거림', '클레이(카올린·벤토나이트)', 'helps', '피지와 노폐물을 흡착하는 성질이 있어 번들거림이 고민인 피부의 경우 워시오프 팩 형태로 활용할 수 있습니다.', '자주 사용하면 필요한 유분까지 뺏겨 당김이 생길 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('9665c500-d90f-4e10-a7f2-85c4a9ff6f8a', 'concern', '유분·번들거림', '히알루론산', 'helps', '유분 없이 수분만 채워주어 수분·유분 균형이 무너진 피부의 경우 가벼운 보습 수단이 됩니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('47a72729-f53e-44ee-ac51-46e7674f865e', 'concern', '넓은 모공', '나이아신아마이드', 'helps', '피지 조절과 피부결 개선에 도움을 주어 모공이 도드라져 보이는 피부의 경우 완화된 인상을 줄 수 있습니다.', '고농도에서 자극감이 나타날 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('843f7c85-8e9e-445f-ad9c-eeae304e28b8', 'concern', '넓은 모공', '살리실릭애씨드', 'helps', '모공 속 각질과 피지를 정돈해 막혀서 넓어 보이는 모공이 고민인 피부의 경우 도움이 될 수 있습니다.', '건조·자극이 생길 수 있어 사용 빈도를 조절하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('cdc15e53-f5c2-419f-a01e-3e8b7d030927', 'concern', '넓은 모공', '레티놀', 'helps', '피부 턴오버와 결 개선에 도움을 주는 것으로 알려져 모공과 탄력이 함께 고민인 피부의 경우 선택할 수 있습니다.', '초기 자극·각질·건조가 나타날 수 있고 햇빛에 민감해질 수 있어 저녁 사용과 자외선 차단이 권장됩니다. 임신·수유 중에는 피합니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('a673a6ed-edf1-436f-9c4b-dbf9f144af04', 'concern', '넓은 모공', '아하(글라이콜릭애씨드)', 'helps', '표면 각질을 정돈해 모공 주변이 거칠어 보이는 피부의 경우 매끄러운 결을 만드는 데 도움이 될 수 있습니다.', '자외선에 민감해질 수 있어 낮에는 자외선 차단제를 함께 쓰는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('576b686d-52e6-471b-a9a5-c93c293e2986', 'concern', '색소침착·칙칙함', '비타민씨(아스코빅애씨드)', 'helps', '항산화 작용과 함께 균일한 톤을 돕는 것으로 잘 알려져 칙칙함이 고민인 피부의 경우 아침 단계에 활용됩니다.', '공기·빛에 불안정해 변색될 수 있고, 고농도는 따가움을 유발할 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('5007598c-1d40-4588-ae1f-1485cf4a3d69', 'concern', '색소침착·칙칙함', '나이아신아마이드', 'helps', '멜라닌이 피부 표면으로 전달되는 과정에 관여해 색소가 고르지 않은 피부의 경우 톤 정돈에 도움을 줄 수 있습니다.', '고농도에서 화끈거림이 있을 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('2d40bff5-210a-4e1c-9340-38a09f2fe1de', 'concern', '색소침착·칙칙함', '알부틴', 'helps', '미백 목적으로 널리 쓰여온 성분으로, 부분적인 색소침착이 고민인 피부의 경우 사용할 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('76bab3e0-498d-442a-88ab-058b1f25eff1', 'concern', '색소침착·칙칙함', '트라넥사믹애씨드', 'helps', '고르지 않은 색소와 붉은 자국이 함께 있는 피부의 경우 톤 정돈 목적으로 쓰이는 성분입니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('a3a29e85-0a4f-484b-992c-e735acb0bb16', 'concern', '색소침착·칙칙함', '자외선차단제(징크옥사이드·티타늄디옥사이드)', 'helps', '자외선은 색소침착을 짙게 하는 대표 요인이므로, 어떤 미백 성분을 쓰더라도 차단이 함께 가야 효과를 기대할 수 있습니다.', '충분한 양을 바르고 시간이 지나면 덧발라야 표시된 차단 효과에 가까워집니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('57c10d3e-e83d-4a25-a430-891182926374', 'concern', '주름·탄력 저하', '레티놀', 'helps', '콜라겐 생성과 턴오버를 도와 잔주름·탄력 저하가 고민인 피부의 경우 근거가 가장 잘 알려진 선택입니다.', '초기 자극·각질·건조가 생길 수 있으므로 저농도·저빈도로 시작하고, 임신·수유 중에는 피합니다. 낮에는 자외선 차단이 필요합니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('a0f42b9c-f175-453e-b48d-18e5c6818b29', 'concern', '주름·탄력 저하', '펩타이드', 'helps', '피부 탄력 관련 신호에 관여하는 것으로 알려져 자극이 적은 안티에이징 단계로 활용됩니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('09ae8a56-eb96-4b0f-8872-c8eec6bfb260', 'concern', '주름·탄력 저하', '비타민씨(아스코빅애씨드)', 'helps', '항산화 작용으로 외부 자극에 의한 노화 요인을 줄이고 콜라겐 합성에 관여하는 것으로 알려져 있습니다.', '고농도는 따가움을 유발할 수 있고 제형이 변색되기 쉽습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('3657e651-a4c8-47fd-96e1-914c9caf02ee', 'concern', '주름·탄력 저하', '바쿠치올', 'helps', '레티놀 대안으로 연구되어 온 성분으로, 레티놀이 부담스러운 피부의 경우 선택지가 될 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('dec6e732-2619-4267-ad3b-805ace21290e', 'concern', '주름·탄력 저하', '나이아신아마이드', 'helps', '장벽 강화와 결 개선을 도와 다른 안티에이징 성분과 함께 쓰기 좋은 성분입니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('57ac1248-c8bb-4040-afc7-00c8d309094c', 'concern', '민감·홍조', '판테놀', 'helps', '진정과 보습에 함께 도움을 주어 쉽게 붉어지는 피부의 경우 부담 없이 쓸 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('aec56d4b-0724-4ed2-b077-c8d0187c9ab7', 'concern', '민감·홍조', '센텔라아시아티카(병풀추출물)', 'helps', '진정 목적으로 널리 쓰이며 자극을 받은 피부의 경우 완화에 도움을 줄 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('56e5c661-fd16-40e6-b70d-ae7c1cee6f84', 'concern', '민감·홍조', '세라마이드', 'helps', '약해진 장벽을 보완해 외부 자극에 쉽게 반응하는 피부의 경우 반응성을 낮추는 데 도움이 될 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('e216c671-0e34-471f-b78f-e46373cfbb84', 'concern', '민감·홍조', '마데카소사이드', 'helps', '병풀 유래 성분으로 진정과 장벽 회복 목적의 민감 피부용 제품에 흔히 쓰입니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('8bb0222f-0470-4e79-840e-036f8fa5163f', 'concern', '민감·홍조', '알란토인', 'helps', '자극 완화와 보습에 도움을 주는 성분으로 순한 제형에 자주 배합됩니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('c1a07692-825f-4bb9-bd55-78690d40d0bd', 'concern', '각질·피부결', '아하(글라이콜릭애씨드)', 'helps', '수용성 각질제거 성분으로 표면의 묵은 각질을 정돈해 결이 거친 피부의 경우 매끄러움을 더할 수 있습니다.', '자외선에 민감해질 수 있고 과사용 시 자극·건조가 생기므로 주 1~2회로 시작하는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('5575b1dc-e515-4250-872a-ba068a261d1e', 'concern', '각질·피부결', '락틱애씨드', 'helps', '아하 중 비교적 순하고 보습성이 있어 건조하면서 각질이 일어나는 피부의 경우 적합할 수 있습니다.', '자외선 민감도가 올라갈 수 있어 낮에는 자외선 차단제를 함께 씁니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('11f69b34-ba75-44a2-ab60-515a176bd3cc', 'concern', '각질·피부결', '피에이치에이(글루코노락톤)', 'helps', '분자가 커 천천히 작용하는 각질 정돈 성분으로, 자극에 예민하지만 각질이 고민인 피부의 경우 선택할 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('0c53533b-71d7-4fe0-9412-2a76fe382255', 'concern', '각질·피부결', '우레아', 'helps', '각질을 부드럽게 하면서 수분을 잡아주어 두껍고 거친 각질이 고민인 피부의 경우 활용됩니다.', '고농도는 자극이 될 수 있고 상처 부위에는 따가울 수 있습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('6fc9029d-8780-487c-b4e9-6fc46371f474', 'concern', '각질·피부결', '살리실릭애씨드', 'helps', '모공 속까지 작용하는 지용성 각질제거 성분으로 피지와 각질이 함께 쌓이는 피부의 경우 도움이 될 수 있습니다.', '건조·자극이 생길 수 있어 다른 각질제거 성분과 동시에 쓰지 않는 것이 좋습니다.', 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('b0246afa-195d-4c8a-a1a8-e9a98bcc0069', 'skin_type', '건성', '살리실릭애씨드', 'caution', '각질을 녹여 내는 성분이라 건성 피부의 경우 자주 쓰면 당김과 들뜬 각질이 심해질 수 있습니다. 저농도로 부분 사용부터 시작하는 편이 무난합니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('0839b66a-d2e0-495d-9ce6-1de6dc141c40', 'skin_type', '건성', '변성알코올', 'caution', '빠르게 증발하면서 표면 수분을 함께 가져가, 건성 피부의 경우 바른 직후부터 당김이 두드러질 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('b60e1b09-a4ca-4ce8-83a3-ccbd0f80ad7a', 'skin_type', '건성', '레티놀', 'caution', '각질 turnover를 앞당기는 과정에서 건성 피부의 경우 초기 몇 주간 건조함과 미세 각질이 생길 수 있습니다. 보습제와 함께 사용 빈도를 낮춰 시작하는 것이 좋습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('da290cc0-9b29-4aa9-8a55-4bab7d8b5683', 'skin_type', '건성', '벤조일퍼옥사이드', 'caution', '피지와 각질을 강하게 정리하는 성분이라 건성 피부의 경우 도포 부위가 하얗게 일어나거나 화끈거릴 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('760e711c-a123-4dc9-948b-f7196cda975c', 'skin_type', '건성', '소듐라우릴설페이트', 'caution', '세정력이 강한 계면활성제로, 건성 피부의 경우 세안 직후 피부가 얇고 뻣뻣하게 느껴질 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('702e30c4-640a-4a90-beb9-77264d5391c1', 'skin_type', '지성', '코코넛오일', 'caution', '밀폐력이 높은 유지 성분이라 지성 피부의 경우 얼굴 전면에 바르면 모공이 막힌 느낌이 들 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('a2c4b70f-31ae-437f-8d99-7ebade97de33', 'skin_type', '지성', '아이소프로필미리스테이트', 'caution', '발림성을 좋게 하는 유성 성분이지만 모공을 막을 수 있다고 알려져 있어, 지성 피부의 경우 트러블 부위에는 피하는 편이 낫습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('ca096041-85be-48fc-9e87-05513a7644c9', 'skin_type', '지성', '코코아버터', 'caution', '실온에서 단단할 만큼 유분이 무거워 지성 피부의 경우 답답함과 번들거림을 느낄 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('3e4389df-1a85-4994-acb1-d7f6e0a5f503', 'skin_type', '지성', '페트롤라툼', 'caution', '수분 증발을 강하게 막는 폐색성 성분이라 지성 피부의 경우 여름철 전면 도포 시 무겁게 느껴질 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('677e9f0e-0f72-4ed8-9e61-63d3f55a5688', 'skin_type', '지성', '변성알코올', 'caution', '겉의 유분기를 빠르게 걷어내 산뜻하지만, 지성 피부의 경우 반복 사용하면 자극과 건조감이 함께 남을 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('88896b22-bf84-43b4-b060-f2250a455889', 'skin_type', '복합성', '살리실릭애씨드', 'caution', 'T존에는 적당해도 복합성 피부의 경우 볼처럼 건조한 부위까지 바르면 그 부위만 과하게 벗겨질 수 있습니다. 부위를 나눠 쓰는 것이 좋습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('3b599689-43b0-4f5a-86b7-041bad23c551', 'skin_type', '복합성', '카올린', 'caution', '피지를 흡착하는 클레이 성분이라 복합성 피부의 경우 얼굴 전체에 올리면 건조한 부위가 더 당길 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('90c64b2b-5621-42ec-abf0-3ed74529d34d', 'skin_type', '복합성', '시어버터', 'caution', '건조한 볼에는 잘 맞지만 복합성 피부의 경우 T존까지 두껍게 바르면 번들거림이나 모공 막힘이 생길 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('f4d5d989-e392-472c-bcf9-367f7b9c3f69', 'skin_type', '복합성', '레티놀', 'caution', '복합성 피부의 경우 같은 농도라도 부위별 반응 차이가 커서 건조한 쪽에만 각질과 붉은기가 먼저 나타날 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('f261f37c-807b-4986-b447-301046550119', 'skin_type', '복합성', '변성알코올', 'caution', '유분 부위에는 산뜻하지만 복합성 피부의 경우 건조한 부위에서는 당김과 자극이 두드러질 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('6d5fa45b-663b-495b-a66e-c765e35e2874', 'skin_type', '민감성', '향료', 'caution', '접촉 자극과 알레르기 반응의 흔한 원인으로 알려져 있어, 민감성 피부의 경우 따가움이나 붉은기가 생길 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('4060dba6-b0ce-4f9a-b913-dee291e6adc1', 'skin_type', '민감성', '리모넨', 'caution', '향료 중 알레르기 유발 성분으로 표시가 요구되는 물질이라, 민감성 피부의 경우 소량이어도 반응이 나타날 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('94014d4b-d394-4eb0-8f04-6e09b8eea060', 'skin_type', '민감성', '멘톨', 'caution', '시원한 청량감을 주는 대신 감각 신경을 자극해, 민감성 피부의 경우 화끈거림이나 따끔거림을 느낄 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('95f8baa5-004b-4740-8a4a-ad02d75b70aa', 'skin_type', '민감성', '변성알코올', 'caution', '휘발하면서 피부 표면을 건조하게 만들어, 민감성 피부의 경우 자극감이 더 크게 느껴질 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('f2a1045c-30de-4e37-90ce-f0bb38ca25f9', 'skin_type', '민감성', '글라이콜릭애씨드', 'caution', '분자가 작아 침투가 빠른 AHA라 민감성 피부의 경우 저농도에서도 따가움과 홍조가 생길 수 있습니다.', NULL, 'seed');
INSERT IGNORE INTO ingredient_effects (id, scenario_kind, scenario, ingredient, relation, description, caution, source)
VALUES ('ad4a45f5-10b0-48aa-b66b-c90557d26e63', 'skin_type', '민감성', '메틸아이소치아졸리논', 'caution', '접촉 알레르기 사례가 알려진 방부 성분으로, 민감성 피부의 경우 씻어내는 제품이라도 반응이 있을 수 있습니다.', NULL, 'seed');
