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
RUN npm run build

# ── 실행 ────────────────────────────────────────────────
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

# 헤드리스 Claude CLI — Route Handler 가 `claude -p` 자식 프로세스를 띄운다.
RUN npm install -g @anthropic-ai/claude-code --no-audit --no-fund

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/.next ./.next
# ⚠️ 이 레포에는 public/ 이 없다(정적 파일은 전부 app 라우터가 든다).
#    나중에 public/ 을 만들면 여기에 COPY 를 추가할 것 — 없는 채 COPY 하면 빌드가 죽는다
#    (2026-08-20 첫 배포 실패 원인).
COPY --from=builder /app/next.config.ts ./

# node(uid 1000) = 호스트 ubuntu(uid 1000) — 마운트된 ~/.claude 를 읽고 쓸 수 있다.
# HOME=/home/node 이므로 CLI 가 /home/node/.claude 에서 인증을 찾는다(마운트 지점).
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
