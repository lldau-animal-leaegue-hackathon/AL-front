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
