/**
 * 브랜드 공식몰에서 **전성분**을 읽어 온다 — 서버 전용.
 *
 * 왜 이 경로가 필요한가(2026-08-20 실측):
 * 성분 출처가 "카탈로그(DB) → AI 모델 기억" 둘뿐이라, 카탈로그에 없고 모델도 모르는 제품은
 * 성분이 **빈 배열**로 저장된다. 실제로 등록된 제품의 절반이 그랬다. 성분이 없으면 이 앱의
 * 핵심(성분 충돌·시너지 리포트, 루틴 안전 검증)이 통째로 무의미해진다.
 *
 * 왜 하필 브랜드 공식몰인가 — 다른 후보를 전부 실측하고 남은 유일한 경로다:
 *  - 화해 상세(`/goods/{id}`): **403 WAF**. 의도적으로 보호되는 자산이라 우회하지 않는다.
 *  - 네이버 쇼핑·쿠팡: robots 가 `Disallow: /` (네이버는 "AI 크롤링 금지" 명시). 배제.
 *  - 올리브영: robots 는 ClaudeBot 을 허용하지만 WAF 가 서버 fetch 를 403 으로 막는다.
 *  - 무신사: robots 허용·SSR 200 이지만 **전성분이 HTML 에 없다**(CSR 별도 API).
 *  - Open Beauty Facts: 무료 API 지만 한국 제품 커버리지가 사실상 0.
 *  → 공식몰은 **제조사가 화장품법상 표시 의무**로 게시하는 정보이고, robots 도 상품 상세를
 *    막지 않는다. 근거로서도 가장 권위 있다(2차 유통 표기보다 정확).
 *
 * ⚠️ 한계(알고 쓰는 것): **브랜드 하나 = 어댑터 하나**라 확장이 선형이다. 그래서 여기에
 *    전부를 넣지 않는다 — 카탈로그 상위 브랜드만 넣고, 나머지는 기존 AI 경로가 받는다.
 *    에스네이처처럼 **전성분을 이미지로만** 싣는 몰은 이 경로로 풀 수 없다(OCR 영역).
 */

/** 성분표는 사용자를 기다리게 하는 경로가 아니다 — 짧게 끊고 다음 단계로 넘긴다. */
const FETCH_TIMEOUT_MS = 5_000;

/** 봇이 아니라 일반 브라우저로 보이게 하는 최소한의 헤더. 위조·회피 목적의 지문 조작은 하지 않는다. */
const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "accept-language": "ko-KR,ko;q=0.9",
};

/**
 * 전성분 문자열 → 배열.
 * 화장품 전성분은 쉼표로 나열되고 함량 순이라 **순서를 보존**한다.
 * 괄호 안 함량 표기(예: `소듐하이알루로네이트(1,000ppm)`)는 성분명의 일부라 지우지 않는다 —
 * 다만 괄호 안 쉼표로 잘리면 안 되므로 괄호 깊이를 세며 자른다.
 */
export function splitIngredients(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let buffer = "";

  for (const char of text) {
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      items.push(buffer);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  items.push(buffer);

  return (
    items
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter((item) => item.length > 0 && item.length <= 60)
      // `[유화]` 같은 공정 구분 머리표나 안내 문구가 섞이면 성분이 오염된다 — 성분명에는
      // 대괄호·콜론·마침표가 오지 않는다(실측: 한 페이지에 여러 제품 표기가 이어져 있었다).
      .filter((item) => !/[[\]:·。.]|입니다|사용법|제조/.test(item))
  );
}

/**
 * 전성분으로 보이는가 — **오탐이 성분 오염으로 이어지므로 보수적으로 본다.**
 * 화장품 전성분은 거의 예외 없이 정제수/워터로 시작하고 항목이 여럿이다.
 */
function looksLikeIngredients(items: string[]): boolean {
  // 상한: 화장품 전성분은 많아야 80종대다. 그보다 많으면 **여러 제품이 이어붙은 것**이라
  // 통째로 버린다(실측: 183개가 나온 적이 있다 — 검색 결과 페이지를 긁은 경우).
  if (items.length < 5 || items.length > 90) return false;
  const head = items[0];
  return /^(정제수|물|워터|water|아쿠아)/i.test(head);
}

/**
 * ⚠️ `response.text()` 를 쓰지 않는다. Cafe24 계열 몰은 Content-Type 헤더에 EUC-KR 을
 * 선언하면서 본문은 UTF-8 로 보내는 경우가 있어, 그대로 디코딩하면 한글이 통째로 깨진다
 * (실측 2026-08-20: `정제수` → `ì ì ì`). 바이트로 받아 **본문의 meta charset 을 보고**
 * 직접 디코딩한다.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    // 앞부분만 아스키로 훑어 선언된 charset 을 찾는다(meta 는 head 안에 있다).
    const head = buffer.subarray(0, 4_096).toString("latin1");
    const declared = /charset=["']?\s*([\w-]+)/i.exec(head)?.[1]?.toLowerCase();

    const utf8 = buffer.toString("utf8");
    // UTF-8 로 읽어 한글이 멀쩡하면 그게 정답이다(헤더 선언이 틀린 경우가 있다).
    if (/[가-힣]/.test(utf8)) return utf8;

    if (declared && declared !== "utf-8" && declared !== "utf8") {
      try {
        return new TextDecoder(declared).decode(buffer);
      } catch {
        // 지원하지 않는 인코딩 — utf8 결과를 그대로 쓴다.
      }
    }
    return utf8;
  } catch {
    // 타임아웃·네트워크 오류 — 다음 단계(AI)가 받는다. 여기서 던지지 않는다.
    return null;
  }
}

/**
 * Cafe24 계열 몰(웰라쥬 등)은 JSON-LD `Product.description` 에 전성분을 통째로 넣는다.
 * HTML 파싱보다 안정적이라 이걸 먼저 본다.
 */
function fromJsonLd(html: string): string[] | null {
  const blocks = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    const raw = block[1];
    if (!raw.includes("정제수")) continue;
    const match = /"description"\s*:\s*"([^"]*정제수[^"]*)"/.exec(raw);
    if (!match) continue;
    const items = splitIngredients(match[1]);
    if (looksLikeIngredients(items)) return items;
  }
  return null;
}

/**
 * 상품정보제공고시 블록. 화장품법이 문구를 정해 두어 라벨 텍스트가 안정적이다:
 * "화장품법에 따라 기재·표시하여야 하는 모든 성분".
 *
 * ⚠️ 라벨을 `전성분` 까지 넓힌 이유(2026-08-21 실측): 고시 표를 직접 만든 몰은 법정 문구
 * 대신 `<strong>전성분</strong>` 한 단어만 쓴다(리더스가 그렇다). 라벨이 느슨해진 만큼
 * 오탐 방어는 아래 `looksLikeIngredients` 에 그대로 맡긴다 — **그쪽을 약화시키면 안 된다.**
 *
 * 첫 매치만 보지 않고 **모든 매치를 순회**한다. `전성분` 은 짧은 단어라 상단 배너·탭 이름에
 * 먼저 등장할 수 있는데, 그때 첫 매치만 보면 진짜 표를 놓친다.
 */
function fromNoticeBlock(html: string): string[] | null {
  for (const label of html.matchAll(/화장품법에\s*따라\s*기재|전성분/g)) {
    const index = label.index;
    // 라벨 뒤 3KB 안에서 정제수로 시작하는 줄을 찾는다(고시 표는 라벨 바로 다음 칸이 값이다).
    const segment = html.slice(index, index + 3_000);
    const text = segment.replace(/<[^>]+>/g, "\n");
    for (const line of text.split("\n")) {
      if (!line.includes("정제수")) continue;
      const items = splitIngredients(line);
      if (looksLikeIngredients(items)) return items;
    }
  }
  return null;
}

/*
 * ⛔ "페이지 어디서든 정제수로 시작하는 줄을 찾는" 느슨한 폴백은 **두지 않는다.**
 *    실측에서 그 방식이 여러 제품의 성분표를 이어붙여 183개를 만들었다. 성분은 화면에
 *    사실로 표시되고 충돌 분석의 입력이 되므로, **틀린 성분보다 빈 성분이 낫다.**
 *    근거가 분명한 두 위치(JSON-LD·고시 블록)에서만 읽는다.
 */
function parseIngredients(html: string): string[] | null {
  return fromJsonLd(html) ?? fromNoticeBlock(html);
}

/**
 * 브랜드별 어댑터 — 제품명으로 상세 URL 후보를 찾는다.
 * `search` 는 검색 결과 HTML 에서 상세 경로를 뽑는다. robots 가 검색을 막는 몰
 * (에스네이처의 `/search.html?*`)은 여기 넣지 않는다.
 */
type BrandAdapter = {
  /** 매칭할 브랜드 표기들(정규화 후 비교) */
  aliases: readonly string[];
  /** 제품명 → 상세 URL 후보(최대 3개) */
  findDetailUrls: (productName: string) => Promise<string[]>;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "");

/**
 * Cafe24 공통 — `/product/search.html?keyword=` 결과에서 상세 경로를 긁는다.
 *
 * 상세 링크 표기가 몰마다 **두 가지**다(실측): 웰라쥬·라운드랩은 SEO 형태
 * `/product/{한글슬러그}/{번호}/...`, 리더스·몽디에스는 구형 쿼리 형태
 * `/product/detail.html?product_no={번호}...`. 한쪽만 받으면 후자 계열이 통째로 0건이 된다.
 */
function cafe24Adapter(
  origin: string,
  aliases: readonly string[],
): BrandAdapter {
  return {
    aliases,
    findDetailUrls: async (productName) => {
      const html = await fetchHtml(
        `${origin}/product/search.html?keyword=${encodeURIComponent(productName)}`,
      );
      if (!html) return [];
      const seen = new Set<string>();
      for (const m of html.matchAll(
        /href="(\/product\/(?:[^"?#]+\/\d+\/[^"]*|detail\.html\?product_no=\d+[^"]*))"/g,
      )) {
        // 쿼리형 링크는 HTML 엔티티로 나오는 몰이 있다 — 그대로 fetch 하면 파라미터가 깨진다.
        seen.add(origin + m[1].replace(/&amp;/g, "&"));
        if (seen.size >= 3) break;
      }
      return [...seen];
    },
  };
}

const ADAPTERS: readonly BrandAdapter[] = [
  cafe24Adapter("https://www.wellage.co.kr", ["웰라쥬", "wellage"]),
  cafe24Adapter("https://leaderscosmetics.com", ["리더스", "leaders"]),
  cafe24Adapter("https://anua.kr", ["아누아", "anua"]),
  cafe24Adapter("https://mongdies.com", ["몽디에스", "mongdies"]),
  {
    // 토니모리는 자체몰. 사이트맵(102KB)에 제품 351건이 있어 검색 없이 슬러그를 찾는다.
    // ⚠️ www 호스트는 인증서 이름 불일치라 apex 를 쓴다(실측).
    aliases: ["토니모리", "tonymoly"],
    findDetailUrls: async (productName) => {
      const xml = await fetchHtml("https://tonymoly.com/sitemap/sitemap.xml");
      if (!xml) return [];
      const target = normalize(productName);
      const urls: string[] = [];
      for (const m of xml.matchAll(/<loc>([^<]*\/products\/[^<]*)<\/loc>/g)) {
        const url = m[1];
        // 슬러그는 영문이라 한글 제품명과 직접 비교가 안 된다 — 숫자·영문 토큰으로 느슨히 본다.
        const slug = normalize(decodeURIComponent(url));
        const tokens = target.match(/[가-힣a-z0-9]{2,}/g) ?? [];
        if (tokens.length > 0 && tokens.some((t) => slug.includes(t))) {
          urls.push(url);
          if (urls.length >= 3) break;
        }
      }
      return urls;
    },
  },
];

/**
 * 브랜드 공식몰에서 전성분을 찾는다. **못 찾으면 null** — 호출부는 조용히 다음 단계로 간다.
 * 어떤 예외도 밖으로 던지지 않는다(성분 보강은 부가 기능이라 등록 자체를 막으면 안 된다).
 */
export async function findIngredientsFromBrandSite(
  productName: string,
  productCompany: string | undefined,
): Promise<string[] | null> {
  const brand = productCompany?.trim();
  if (!brand || !productName.trim()) return null;

  const key = normalize(brand);
  const adapter = ADAPTERS.find((item) =>
    item.aliases.some((alias) => key.includes(normalize(alias))),
  );
  if (!adapter) return null;

  try {
    const urls = await adapter.findDetailUrls(productName);
    for (const url of urls) {
      const html = await fetchHtml(url);
      if (!html) continue;
      const items = parseIngredients(html);
      if (items) return items;
    }
  } catch (error: unknown) {
    console.warn("[brandSites] 조회 실패 — AI 경로로 진행:", error);
  }
  return null;
}
