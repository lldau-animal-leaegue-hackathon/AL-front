import type { NextConfig } from "next";

/**
 * 백엔드 프록시 대상 (예: http://localhost:8080 또는 https://api.example.com)
 * .env.local 에 BACKEND_ORIGIN 을 지정하면 /api/* 요청이 그쪽으로 전달됩니다.
 * 지정하지 않으면 프록시를 사용하지 않습니다.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;

/**
 * 모든 응답에 붙는 기본 보안 헤더.
 * CSP(Content-Security-Policy)는 잘못 설정하면 화면이 깨지기 쉬워 기본값에서 제외했습니다.
 * 배포 전에 https://nextjs.org/docs/app/guides/content-security-policy 를 참고해 추가하세요.
 */
const securityHeaders = [
  // MIME 타입 스니핑 차단
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부 사이트로 나갈 때 경로/쿼리는 빼고 origin 만 전달
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 클릭재킹 방지 (다른 사이트가 우리 페이지를 iframe 으로 못 감쌈)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // 쓰지 않는 브라우저 기능은 기본 차단.
  // camera 는 같은 오리진(self)에만 허용 — OCR 화면이 getUserMedia 를 쓴다.
  // `camera=()` 로 두면 사용자가 권한을 허용해도 NotAllowedError 가 난다.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 응답에서 `X-Powered-By: Next.js` 제거 (불필요한 버전 노출 차단)
  poweredByHeader: false,

  // <Link href="..."> 의 경로를 타입으로 검사 (오타 난 링크를 빌드 타임에 잡아줌)
  typedRoutes: true,

  images: {
    // next/image 로 불러올 외부 이미지 도메인을 여기에 화이트리스트로 등록합니다.
    // 예시이므로 실제 사용하는 도메인으로 교체하세요.
    remotePatterns: [
      /*
       * 화해 CDN — 후보 검색이 주는 제품 썸네일(`/api/ai/search`).
       * **후보를 고르는 동안만** 이 주소를 직접 띄운다. 선반에 담을 때는 서버가 한 번 받아
       * data URL 로 바꿔 저장하므로(`src/lib/images.ts`), 담긴 뒤에는 외부 요청이 없다.
       */
      { protocol: "https", hostname: "img.hwahae.co.kr" },
      // 네이버 쇼핑 검색 결과의 상품 썸네일 (현재 미사용 — 검색 API 가 막혀 제거됐다)
      { protocol: "https", hostname: "**.pstatic.net" },
    ],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /*
       * ⛔ `/api/*` 는 **전부 사용자별 데이터**다(쿠키 익명 ID 로 가른다).
       *
       * Next 16 의 Route Handler 는 dynamic 이라 Next 자체 캐시는 안 타지만,
       * **응답에 `Cache-Control` 을 아무것도 붙이지 않는다.** 앞단에 리버스 프록시나 CDN 이
       * 붙는 순간(서브도메인 작업이 예정돼 있다) 기본 TTL·heuristic freshness 로
       * `/api/products` 응답 하나가 URL 만으로 캐시되고, 쿠키가 다른 사람에게 그대로 나간다.
       *
       * `private` 로 공유 캐시 저장을 막고 `no-store` 로 저장 자체를 금지한다.
       * `Vary: Cookie` 는 캐시가 굳이 저장할 때 사용자별로 갈리게 하는 마지막 보루다.
       */
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Vary", value: "Cookie" },
        ],
      },
    ];
  },

  async rewrites() {
    if (!BACKEND_ORIGIN) return [];

    // 주의: 이 rewrite 는 파일 기반 라우트(src/app/api/**)보다 **나중에** 평가됩니다.
    // 즉 src/app/api/xxx/route.ts 가 있으면 그쪽이 우선이고, 없을 때만 백엔드로 넘어갑니다.
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
