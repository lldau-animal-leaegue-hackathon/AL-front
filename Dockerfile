# youtine 앱 이미지 — GitHub Actions 가 main 푸시마다 서버에서 빌드한다.
#
# ⚠️ **자격 증명을 이미지에 넣지 않는다.** 헤드리스 Claude 의 구독 인증은
#    호스트에 1회 심어 둔 `~/.claude` 를 compose 가 볼륨으로 마운트한다.
#    이미지에는 CLI 바이너리만 들어간다.

# ── 빌드 ────────────────────────────────────────────────
FROM node:24-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DB 환경변수 없이 빌드된다 — serverEnv.db 는 게터라 라우트가 실행될 때만 검증한다.
# output:"standalone"(next.config.ts) 이라 .next/standalone 에 자립 서버가 나온다.
RUN npm run build

# ── 실행 ────────────────────────────────────────────────
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# 헤드리스 Claude CLI — Route Handler 가 `claude -p` 자식 프로세스를 띄운다.
# 버전 핀: latest 로 두면 캐시 축출 순간 통제 없이 점프한다(m24).
# 갱신 절차: `npm view @anthropic-ai/claude-code version` 으로 최신을 확인하고
#            로컬에서 그 버전으로 빌드·동작 확인 후 아래 숫자만 올려 커밋한다.
RUN npm install -g @anthropic-ai/claude-code@2.1.237 --no-audit --no-fund

# standalone 출력만 복사한다 — node_modules 통복사·runner 의 npm ci 가 필요 없다(m19).
# server.js 는 next.config 를 내장하므로 next.config.ts 복사도 불필요하다.
COPY --from=builder /app/.next/standalone ./
# 정적 자산은 standalone 에 포함되지 않아 따로 얹는다(server.js 가 이 경로를 서빙).
COPY --from=builder /app/.next/static ./.next/static
# ⚠️ 이 레포에는 public/ 이 없다(정적 파일은 전부 app 라우터가 든다).
#    나중에 public/ 을 만들면 `COPY --from=builder /app/public ./public` 을 추가할 것 —
#    없는 채 COPY 하면 빌드가 죽는다(2026-08-20 첫 배포 실패 원인).

# node(uid 1000) = 호스트 ubuntu(uid 1000) — 마운트된 ~/.claude 를 읽고 쓸 수 있다.
# HOME=/home/node 이므로 CLI 가 /home/node/.claude 에서 인증을 찾는다(마운트 지점).
USER node
EXPOSE 3000
# standalone server.js 는 이 env 로 바인딩을 정한다(기본 hostname 은 localhost).
ENV HOSTNAME=0.0.0.0 PORT=3000

# 부팅 실패가 초록불로 남지 않게 컨테이너 스스로 홈을 찔러 본다(m22).
# node 24 내장 fetch 사용 — curl/wget 을 이미지에 더하지 않는다.
# start-period: next 서버 첫 기동 + 컴파일 여유.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "server.js"]
