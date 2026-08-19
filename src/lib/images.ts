/**
 * 외부 제품 이미지 가져오기 — **서버 전용**.
 *
 * 후보 검색(`/api/ai/search`)이 화해 CDN 의 썸네일 주소를 준다. 그 주소를 DB 에 그대로
 * 넣지 않고 **한 번 받아 data URL 로 바꿔 저장한다**(사용자 결정 2026-08-19):
 *  - 직접 찍은 사진과 **같은 모양**이 되어 화면 코드가 갈라지지 않는다.
 *  - 화해가 URL 을 바꾸거나 핫링크를 막아도 이미 담은 제품은 깨지지 않는다.
 *  - 실측상 96x96 썸네일이 1KB 안팎이라 용량 부담이 없다.
 *
 * ⛔ **SSRF 를 막는 것이 이 파일의 핵심 책임이다.**
 * 여기 들어오는 URL 은 **LLM 이 만들어 클라이언트를 거쳐 온 값**이다. 그대로 fetch 하면
 * 서버가 임의 주소로 요청하게 되고, 클라우드 메타데이터(169.254.169.254)나 사내망처럼
 * 서버만 닿을 수 있는 곳을 긁어 오는 통로가 된다. 호스트를 화이트리스트로 못 박는다.
 */

/**
 * 허용 호스트. 실측(2026-08-19)에서 후보 검색이 주는 이미지가 전부 이 호스트였다.
 * 다른 출처가 생기면 **여기에 추가하기 전에 실제로 열리는지 확인**할 것 —
 * 화해 상세 페이지(`/goods/{id}`)는 403 이지만 이 CDN 은 Referer 없이도 200 이었다.
 */
const ALLOWED_IMAGE_HOSTS = new Set(["img.hwahae.co.kr"]);

/** 96x96 썸네일은 1KB 안팎이다. 상한은 넉넉히 두되 무한정 받지는 않는다. */
const MAX_IMAGE_BYTES = 2_000_000;

/** 이미지를 받는 데 오래 매달리지 않는다 — 등록 흐름 한가운데라 사용자가 기다린다. */
const FETCH_TIMEOUT_MS = 8_000;

/** 화이트리스트에 있는 https 주소인가. */
export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    // URL 로 파싱조차 안 되면 당연히 거부한다.
    return false;
  }
}

/**
 * 허용된 이미지 주소를 받아 data URL 로 바꾼다.
 *
 * 실패하면 **`null` 을 돌려준다 — 예외를 던지지 않는다.** 썸네일은 부가 정보라
 * 이것 때문에 제품 등록 전체가 실패하면 안 된다(사진 없이 담기면 아이콘으로 대체된다).
 */
export async function fetchImageAsDataUrl(
  value: string,
): Promise<string | null> {
  if (!isAllowedImageUrl(value)) return null;

  try {
    const response = await fetch(value, {
      // 리다이렉트를 따라가면 화이트리스트 밖으로 나갈 수 있다.
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    // content-type 을 믿기만 하면 안 되지만, 최소한 이미지가 아니라고 말하면 거른다.
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }

    // 실측에서 화해는 `image/jpg` 를 준다(표준 표기가 아니다). 그대로 쓰면 브라우저가
    // 못 알아볼 수 있어 매개변수를 떼고 정규화한다.
    const mime = contentType.split(";")[0].trim().toLowerCase();
    const normalized = mime === "image/jpg" ? "image/jpeg" : mime;

    return `data:${normalized};base64,${buffer.toString("base64")}`;
  } catch {
    // 타임아웃·네트워크 실패·리다이렉트 모두 여기로 온다. 썸네일 없이 진행한다.
    return null;
  }
}
