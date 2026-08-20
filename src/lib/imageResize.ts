/**
 * 이미지 축소 — **브라우저 전용**(canvas 를 쓴다).
 *
 * 같은 사진을 두 용도로 쓰는데 요구가 정반대다(Q7):
 *  - **AI 에는 원본**을 보낸다. 성분표 글씨 해상도가 곧 인식 정확도다.
 *  - **저장은 썸네일**만 한다. base64 는 원본보다 33% 큰데 localStorage 는 5MB 뿐이라,
 *    2048px 원본을 그대로 쌓으면 제품 12~15개에서 한계에 닿는다.
 */

/** 원본을 그대로 data URL 로. AI 전송용이다. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

/** AI 가 읽을 수 있는 포맷. HEIF(아이폰 갤러리 기본) 등은 재인코딩해야 한다. */
const LABEL_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * API 본문 한도(8MB)에서 역산한 원본 상한 — base64 는 원본의 4/3 배라 6MB.
 * 이보다 크면 그대로 보내면 413 이 난다.
 */
const LABEL_MAX_BYTES = 6 * 1024 * 1024;

/**
 * 성분표 사진 → AI 전송용 data URL. **갤러리 폴백 경로**다(m12).
 *
 * 카메라 경로(CameraCapture)는 촬영 시점에 이미 2048px JPEG 로 잘라 주지만,
 * 갤러리에서 고른 원본은 6MB 초과(→413)나 HEIF(→400)가 그대로 들어온다.
 *  - 지원 포맷이고 base64 후 8MB 미만이면: 원본 그대로 (글씨 해상도가 곧 정확도).
 *  - 아니면: 카메라 경로와 같은 근거로 긴 변 2048px JPEG 재인코딩.
 */
export async function fileToLabelDataUrl(file: File): Promise<string> {
  if (LABEL_TYPES.has(file.type) && file.size < LABEL_MAX_BYTES) {
    return fileToDataUrl(file);
  }

  // HEIF 등 브라우저가 디코딩 못 하는 포맷. 서버 400 대신 여기서 알려 준다.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(
      "이 사진 형식은 사용할 수 없어요. JPG나 PNG로 다시 올려 주세요.",
    );
  });

  try {
    // 확대는 하지 않는다. 상한(2048px)을 넘을 때만 줄인다 — 카메라 경로와 동일.
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas 2d 컨텍스트를 만들지 못했습니다.");

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // 품질 0.9 — 카메라 경로(CameraCapture toBlob)와 같은 값. 글씨가 뭉개지면 안 된다.
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    bitmap.close();
  }
}

/**
 * 긴 변을 `maxEdge` 로 줄인 JPEG data URL. 원본이 이미 작으면 확대하지 않는다.
 * 256px / q=0.7 이면 대략 15KB 라, 100개를 넣어도 1.5MB 로 여유가 있다.
 */
export async function resizeToThumbnail(
  file: File,
  maxEdge = 256,
  quality = 0.7,
): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas 2d 컨텍스트를 만들지 못했습니다.");

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // 투명 배경은 JPEG 에서 검게 나오지만, 제품 사진은 촬영본이라 문제되지 않는다.
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    // 비트맵은 GC 를 기다리지 않고 즉시 반환한다 — 큰 사진을 연달아 넣으면 메모리가 튄다.
    bitmap.close();
  }
}
