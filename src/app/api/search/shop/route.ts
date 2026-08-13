import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";

/**
 * 네이버 쇼핑 검색 프록시. **현재 미사용(보류).**
 *
 * 개발자센터가 "신규로 등록할 수 없는 API" 로 검색 API 등록을 막아,
 * 새로 만든 애플리케이션으로는 호출이 불가능하다(errorCode 024).
 * 검색 API가 이미 등록된 예전 Client ID 를 구하면 .env.local 만 채워 되살릴 수 있어
 * 코드를 남겨둔다. 화면은 src/app/scan/products.ts 의 로컬 카탈로그를 쓴다.
 *
 * 브라우저에서 openapi.naver.com 을 직접 부르면 두 가지가 막힌다:
 *  1) Client Secret 이 번들에 노출된다.
 *  2) 네이버가 CORS 헤더를 주지 않아 브라우저가 응답을 못 읽는다.
 * 그래서 서버에서 대신 호출한다.
 *
 * 이 파일 기반 라우트는 next.config.ts 의 rewrites 보다 먼저 평가되므로
 * BACKEND_ORIGIN 프록시와 충돌하지 않는다.
 */

const NAVER_SHOP_SEARCH = "https://openapi.naver.com/v1/search/shop.json";

// 네이버가 허용하는 최대치. 초과하면 400을 준다.
const MAX_DISPLAY = 100;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      { message: "query 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const display = Math.min(Number(params.get("display")) || 20, MAX_DISPLAY);
  const sort = params.get("sort") ?? "sim";

  const url = `${NAVER_SHOP_SEARCH}?${new URLSearchParams({
    query,
    display: String(display),
    sort,
  })}`;

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": serverEnv.naverClientId,
      "X-Naver-Client-Secret": serverEnv.naverClientSecret,
    },
    // 같은 검색어는 잠깐 재사용해 호출량(일 25,000회)을 아낀다
    next: { revalidate: 60 },
  });

  const body = await response.text();

  if (!response.ok) {
    // 네이버 에러 본문(errorCode/errorMessage)을 그대로 넘겨야 원인을 알 수 있다.
    // 대표적으로 024 = 애플리케이션에 검색 API가 추가되지 않음.
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  }

  return new NextResponse(body, {
    headers: { "content-type": "application/json" },
  });
}
