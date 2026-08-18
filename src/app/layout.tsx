import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/AppShell/AppShell";

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
  /**
   * 이게 없으면 브라우저가 safe area 를 노출하지 않아
   * `env(safe-area-inset-*)` 가 **전부 0** 이 된다.
   * BottomNav·StepActions 가 그 값을 쓰고 있었는데 여태 무효였다(iOS 홈 인디케이터에 겹침).
   */
  viewportFit: "cover",
  /**
   * `--surface` 와 같은 값. 예전엔 light `#ffffff`(팔레트에 없는 값) +
   * dark `#0a0a0a` 를 선언해, OS 다크 모드에서 **브라우저 UI 만 검고 페이지는 흰** 상태가 됐다.
   * 다크 팔레트가 없으므로 라이트 단일 값으로 맞춘다(R-Step 6 에서 다크를 추가한다).
   */
  themeColor: "#f8f9fa",
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

        {/*
          Material Symbols — 아이콘. @/components/Icon 이 이 폰트를 쓴다.
          아이콘 폰트라 next/font/google 목록에 없어서 CDN으로 불러온다.
          display=block: swap 이면 폰트 로딩 동안 "notifications_active" 같은
          리거처 원문이 그대로 노출된다. 아이콘은 잠깐 비는 편이 낫다.
        */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font -- 위 주석 참고. no-page-custom-font 는 App Router 루트 레이아웃에는 해당하지 않는다 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
