import { useId } from "react";

/**
 * 유틴(youtine) 브랜드 아이콘 — 선인장 + 물방울 + 루틴 타이머 아크.
 * 원본: `src/app/icon.svg`(파비콘 컨벤션 파일)와 같은 아트워크의 인라인 버전이다.
 * 파일로 두지 않고 컴포넌트로 인라인한 이유: public/ 이 없는 레포 구조(Dockerfile 참조)에서
 * UI 용 SVG 를 추가 정적 경로 없이 쓰기 위해서다.
 *
 * 그라데이션 id 는 useId 로 인스턴스마다 고유화한다 — 사이드바·상단바처럼 한 문서에
 * 여러 개 그려도 url(#…) 참조가 서로 엉키지 않는다.
 */
export function YoutineIcon({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F4F6F4" />
        </linearGradient>
        <linearGradient id={`${uid}sage`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#557564" />
          <stop offset="100%" stopColor="#466253" />
        </linearGradient>
        <linearGradient id={`${uid}sand`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBDEC0" />
          <stop offset="100%" stopColor="#E8C39E" />
        </linearGradient>
      </defs>

      <rect
        x="32"
        y="32"
        width="448"
        height="448"
        rx="108"
        fill={`url(#${uid}bg)`}
        stroke="#E1E5E2"
        strokeWidth="2"
      />

      <g transform="translate(0, -6)">
        <circle
          cx="256"
          cy="262"
          r="142"
          fill="none"
          stroke="#DDE3DF"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="620 180"
          transform="rotate(-110 256 262)"
        />
        <path
          d="M 256 128 C 256 128, 206 210, 206 266 A 50 50 0 0 0 306 266 C 306 210, 256 128, 256 128 Z"
          fill={`url(#${uid}sage)`}
        />
        <path
          d="M 216 256 H 182 A 26 26 0 0 1 156 230 V 204"
          fill="none"
          stroke={`url(#${uid}sage)`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 296 270 H 330 A 26 26 0 0 0 356 244 V 190"
          fill="none"
          stroke={`url(#${uid}sage)`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="356" cy="160" r="14" fill={`url(#${uid}sand)`} />
        <circle cx="256" cy="358" r="8" fill="#466253" />
      </g>
    </svg>
  );
}
