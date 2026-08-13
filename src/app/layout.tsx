import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_NAME = "Animal League";
const SITE_DESCRIPTION = "Animal League 프로젝트";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    // 하위 페이지에서 title: "로그인" 이라고만 쓰면 "로그인 | Animal League" 가 됩니다.
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          Pretendard (한글 웹폰트) — CDN 방식.
          폰트 파일을 public/fonts 에 넣고 next/font/local 로 바꾸면
          외부 요청이 사라지고 CLS(레이아웃 이동)도 줄어듭니다. README 참고.
        */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
