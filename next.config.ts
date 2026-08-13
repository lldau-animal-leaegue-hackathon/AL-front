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
  // 쓰지 않는 브라우저 기능은 기본 차단
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
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
      // { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
