"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";

import styles from "./CameraCapture.module.css";

/**
 * 촬영 오버레이 — 제품 사진과 성분표 사진 두 용도를 `mode` 로 가른다.
 *
 * `/testCamera` 를 이관하며 **tesseract.js 를 걷어냈다**(Q3) — 이제 인식은
 * 서버의 멀티모달 Claude 가 한다. 그래서 여기 남은 책임은 촬영뿐이다:
 * 워커·PSM·그레이스케일 전처리·3배 업스케일이 전부 사라졌다.
 * (업스케일은 tesseract 전용 최적화였고, 멀티모달은 원본 해상도를 선호한다.)
 *
 * 별도 라우트가 아니라 오버레이인 이유 — 라우트로 두면 촬영한 이미지를 폼으로
 * 되돌릴 경로(sessionStorage 등)가 따로 필요하다. 오버레이는 그냥 콜백으로 넘긴다.
 */

/**
 * 촬영 용도. 쓰임이 달라 **가이드 박스 모양과 안내가 다르다.**
 *  - `product`: 선반 썸네일용. 제품 전체가 들어와야 알아본다 → 세로로 긴 박스.
 *  - `label`  : 성분 추출용. 글씨가 크게 찍혀야 읽힌다 → 가로로 긴 박스 + 가까이.
 */
export type CaptureMode = "product" | "label";

// 가이드 박스는 영상 프레임 기준 비율이다. 필요한 부분만 잘라 배경 잡음을 줄인다.
const MODES = {
  product: {
    title: "제품 촬영",
    hint: "제품 전체가 박스 안에 들어오게 담아 주세요.",
    // 화장품은 세로로 긴 병·튜브가 많다.
    roi: { x: 0.18, y: 0.12, w: 0.64, h: 0.76 },
    prefix: "product",
  },
  label: {
    title: "성분표 촬영",
    hint: "박스 안에 성분표가 꽉 차게 담고 카메라를 가까이 대세요.",
    roi: { x: 0.06, y: 0.29, w: 0.88, h: 0.42 },
    prefix: "label",
  },
} as const;

// 업로드 시간을 감안한 상한. 성분표 글씨는 이 해상도면 충분히 읽힌다.
const MAX_EDGE = 2048;

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 2560 },
    height: { ideal: 1440 },
  },
  audio: false,
};

export function CameraCapture({
  mode,
  onCapture,
  onClose,
}: {
  mode: CaptureMode;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const { title, hint, roi, prefix } = MODES[mode];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // 스트림은 마운트 시 한 번 연다. cleanup 에서 트랙을 꺼야
  // 오버레이를 닫아도 카메라 표시등이 켜져 있지 않다.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia(VIDEO_CONSTRAINTS)
      .then((granted) => {
        if (cancelled) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        if (videoRef.current) videoRef.current.srcObject = granted;
      })
      .catch((cause: unknown) => {
        // 실패 원인이 여러 가지라 name 까지 봐야 구분된다.
        // NotAllowedError: 권한 거부 또는 Permissions-Policy 차단
        // NotFoundError: 카메라 없음 / NotReadableError: 다른 앱이 점유 중
        const name = cause instanceof Error ? cause.name : "";
        const detail = cause instanceof Error ? cause.message : String(cause);
        setError(
          window.isSecureContext
            ? `${name}: ${detail}`
            : `${name}: ${detail} — 현재 주소(${window.location.origin})는 보안 컨텍스트가 아닙니다. HTTPS 또는 localhost 로 접속하세요.`,
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Esc 로 닫기 — 오버레이라 브라우저 뒤로가기가 닫아 주지 않는다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    setBusy(true);

    // 화면에 보이는 크기가 아니라 카메라 원본 해상도 기준으로 가이드 박스를 잘라낸다.
    const sx = Math.round(video.videoWidth * roi.x);
    const sy = Math.round(video.videoHeight * roi.y);
    const sw = Math.round(video.videoWidth * roi.w);
    const sh = Math.round(video.videoHeight * roi.h);

    // 확대는 하지 않는다. 상한을 넘을 때만 줄인다.
    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      setBusy(false);
      return;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) {
          setError("사진을 만들지 못했습니다. 다시 시도해 주세요.");
          return;
        }
        onCapture(
          new File([blob], `${prefix}-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.9,
    );
    // roi·prefix 는 MODES 의 모듈 상수라 mode 가 바뀔 때만 참조가 달라진다.
  }, [onCapture, roi, prefix]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={styles.bar}>
        <p className={styles.title}>{title}</p>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="닫기"
        >
          <Icon name="close" />
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* 비율을 영상 원본에 맞춰 레터박스를 없앤다 —
          그래야 가이드 박스 위치와 실제 잘라내는 영역이 정확히 일치한다. */}
      <div className={styles.stage} style={{ aspectRatio: aspect }}>
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(event) =>
            setAspect(
              `${event.currentTarget.videoWidth} / ${event.currentTarget.videoHeight}`,
            )
          }
        />
        <div
          className={styles.roi}
          style={{
            left: `${roi.x * 100}%`,
            top: `${roi.y * 100}%`,
            width: `${roi.w * 100}%`,
            height: `${roi.h * 100}%`,
          }}
        />
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />

      <p className={styles.hint}>{hint}</p>

      <button
        type="button"
        className={styles.shutter}
        onClick={capture}
        disabled={busy || Boolean(error)}
      >
        <Icon name="photo_camera" filled />
        {busy ? "저장 중…" : "촬영하기"}
      </button>
    </div>
  );
}
