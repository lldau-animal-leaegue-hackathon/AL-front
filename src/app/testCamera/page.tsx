"use client";

import { useEffect, useRef, useState } from "react";
import { createWorker, PSM, type Worker } from "tesseract.js";

import styles from "./page.module.css";

// 인식률은 입력 해상도가 좌우한다. 브라우저가 줄 수 있는 만큼 크게 요청하고,
// 후면 카메라를 우선한다(모바일에서 전면 카메라로 글자를 찍는 경우는 없다).
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 2560 },
    height: { ideal: 1440 },
  },
  audio: false,
};

// 인식 영역(가이드 박스) — 영상 프레임 기준 비율.
// 전체 화면을 그대로 넣으면 배경 잡음까지 같이 인식돼 정확도가 떨어진다.
const ROI = { x: 0.06, y: 0.29, w: 0.88, h: 0.42 };

// Tesseract는 글자 높이가 30~40px일 때 가장 잘 읽는다. 잘라낸 영역이 그보다
// 작으면 그대로는 뭉개지므로 확대해서 넘긴다. 원본이 이미 크면 확대하지 않는다.
const TARGET_CROP_WIDTH = 1600;
const MAX_SCALE = 3;

export default function TestCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [aspect, setAspect] = useState<string | undefined>(undefined);

  // 카메라 스트림은 마운트 시 한 번만 연다. cleanup에서 트랙을 꺼야
  // 라우트를 벗어나도 카메라 표시등이 계속 켜져 있지 않다.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia(VIDEO_CONSTRAINTS)
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e: unknown) => {
        // getUserMedia 실패는 원인이 여러 가지라 name까지 봐야 구분된다.
        // NotAllowedError는 권한 거부/Permissions-Policy 차단,
        // NotFoundError는 카메라 없음, NotReadableError는 다른 앱이 점유 중.
        const name = e instanceof Error ? e.name : "";
        const detail = e instanceof Error ? e.message : String(e);
        setError(
          window.isSecureContext
            ? `${name}: ${detail}`
            : `${name}: ${detail} — 현재 주소(${window.location.origin})는 보안 컨텍스트가 아닙니다. HTTPS 또는 localhost로 접속하세요.`,
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      void workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // worker 생성은 언어 데이터 로딩까지 포함해 몇 초 걸린다.
  // 여러 번 찍어보며 각도를 바꾸는 화면이라 한 번 만들고 재사용한다.
  async function getWorker() {
    if (workerRef.current) return workerRef.current;
    const worker = await createWorker(["kor", "eng"], 1, {
      logger: (m) => {
        if (m.status === "recognizing text") setProgress(m.progress);
      },
    });
    // 잘라낸 영역은 이미 "한 덩어리의 글" 이므로 페이지 레이아웃 분석을 생략한다.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });
    workerRef.current = worker;
    return worker;
  }

  async function recognize() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    setBusy(true);
    setError(null);
    setProgress(0);

    // 화면에 보이는 크기가 아니라 카메라 원본 해상도 기준으로 가이드 박스를 잘라낸다.
    const sx = Math.round(video.videoWidth * ROI.x);
    const sy = Math.round(video.videoHeight * ROI.y);
    const sw = Math.round(video.videoWidth * ROI.w);
    const sh = Math.round(video.videoHeight * ROI.h);

    const scale = Math.min(MAX_SCALE, Math.max(1, TARGET_CROP_WIDTH / sw));
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // 그레이스케일만 적용한다. 이진화는 Tesseract가 내부에서 하므로
    // 여기서 임의 임계값으로 미리 깎으면 오히려 획이 끊긴다.
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = gray;
    }
    ctx.putImageData(image, 0, 0);

    try {
      const worker = await getWorker();
      const { data } = await worker.recognize(canvas);
      setText(data.text.trim() || "(인식된 글자가 없습니다)");
      setConfidence(data.confidence);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "인식에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>카메라 글자 인식</h1>

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
          onLoadedMetadata={(e) =>
            setAspect(
              `${e.currentTarget.videoWidth} / ${e.currentTarget.videoHeight}`,
            )
          }
        />
        <div
          className={styles.roi}
          style={{
            left: `${ROI.x * 100}%`,
            top: `${ROI.y * 100}%`,
            width: `${ROI.w * 100}%`,
            height: `${ROI.h * 100}%`,
          }}
        />
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />

      <p className={styles.hint}>
        박스 안에 글자만 꽉 차게 담고, 카메라를 가까이 대세요. 글자가 작을수록
        인식률이 급격히 떨어집니다.
      </p>

      <button className={styles.button} onClick={recognize} disabled={busy}>
        {busy ? `인식 중… ${Math.round(progress * 100)}%` : "인식하기"}
      </button>

      {text !== null && (
        <section className={styles.result}>
          <h2 className={styles.resultTitle}>
            인식된 글자
            {confidence !== null && (
              <span className={styles.confidence}>
                신뢰도 {Math.round(confidence)}%
              </span>
            )}
          </h2>
          <pre className={styles.text}>{text}</pre>
        </section>
      )}
    </main>
  );
}
