# youtine 배포 — 서브도메인 · Docker · CI/CD

> ⚠️ 보안: 서버 주소·도메인 전체 이름·포트 목록·경로는 이 문서에 적지 않는다
> (레포 규칙 — 퍼블릭 기준). 식별자가 필요한 값은 전부 서버의 설정 파일과
> GitHub Secrets 에만 있다.

## Context

프로젝트 이름 **youtine**. EC2 한 대(기존 서비스 다수 + 이 앱의 MariaDB 컨테이너)에
프론트(Next.js, Route Handler 포함)를 올린다. 사용자 결정(2026-08-20):
**main 푸시/머지 → GitHub Actions → 서버에서 Docker 빌드·기동.**

핵심 제약: AI 라우트가 `claude -p` 자식 프로세스를 구독 인증으로 띄운다 —
컨테이너에 CLI 는 굽되 **자격 증명은 호스트 `~/.claude` 를 볼륨 마운트**한다
(이미지·레포에 인증이 들어가지 않는 유일한 구조).

## 구조 확정 (2026-08-20)

| 층             | 결정                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS            | 베이스 도메인 밑에 `youtine.` 서브도메인(기존 서비스 관례). Route53 A 레코드는 사용자가 추가                                                                                     |
| TLS            | certbot webroot(서버 관례). 발급·HTTPS 승격 완료, 자동 갱신은 기존 타이머                                                                                                        |
| 리버스 프록시  | 호스트 nginx. `/api/` 는 **read timeout 600초**(루틴 생성 최장), 업로드 10MB(성분표 사진 8MB), `X-Forwarded-Proto`(쿠키 secure 판정)                                             |
| 앱             | `docker-compose.yml` 의 `app` 서비스 — 루프백 포트만 공개, DB 와 같은 네트워크(`DB_HOST=db`)                                                                                     |
| AI 인증        | 호스트 `~/.claude`(600) ← 로컬 자격 증명 이전, 서버에서 실호출 검증 완료                                                                                                         |
| CI/CD          | main 푸시 → **Actions 가 이미지 빌드 → Docker Hub push** → SSH → 서버는 pull + 재기동만. 사용자 결정(2026-08-20): 서버 빌드·deploy key 불필요, 디스크 부담 해소, sha 태그로 롤백 |
| SSH 키         | Actions 용 1개 — **forced command 로 배포 스크립트만 실행 가능**(키가 새어도 임의 명령 불가). GitHub deploy key 는 폐기(서버가 클론하지 않음)                                    |
| compose 동기화 | 서버는 레포를 클론하지 않으므로 compose·초기화 SQL 사본이 배포 디렉토리에 있다 — **compose 를 바꾸면 서버 사본도 갱신할 것**(드묾)                                               |
| 이미지 비공개  | 빌드 산출물(.next)에 서버 코드가 들어가므로 Docker Hub 저장소는 **Private** — 서버에 docker login 1회 필요                                                                       |

## 구현 순서

- [x] 서브도메인 + TLS — 완료 2026-08-20. 외부·내부 모두 TLS 검증 0, HTTP→HTTPS 301.
      앱 미배포 상태의 502 확인(= 라우팅 정상).
- [x] 서버 준비 — Node 24·claude CLI 설치, 구독 인증 이전·실호출 검증, Actions 키
      (forced command)·배포 스크립트 준비.
- [x] 레포 파일 — `Dockerfile`(멀티스테이지, CLI 포함·인증 미포함)·`.dockerignore`
      (env 차단)·compose `app` 서비스·`.github/workflows/deploy.yml`.
- [ ] **사용자 액션** — ① Docker Hub 계정·비공개 저장소·토큰 ② Actions 시크릿 5개
      (DOCKERHUB_USERNAME / DOCKERHUB_TOKEN / DEPLOY_HOST / DEPLOY_USER /
      DEPLOY_SSH_KEY) ③ 서버 docker login 1회 ④ taeyeop → main 머지.
      ~~GitHub deploy key 등록~~ — Docker Hub 방식 채택으로 폐기(2026-08-20).
- [x] 첫 배포 — 완료 2026-08-20 13:18(Actions 자동). 이후 재배포로 재현성도 확인.
      **삽질 기록**: ① Dockerfile 이 없는 public/ 을 COPY(로컬 도커로 사전 검증하는
      절차를 이후 도입) ② CI 시크릿 스캔이 훅과 패턴 드리프트(169.254 예외) ③ 배포
      트리거용 임시 커밋이 개행 없이 들어가 format:check 실패 — 셋 다 수정 커밋됨.
- [x] 검증 — 4탭 200 · DB 라우트(컨테이너→db 네트워크) 정상 · 쿠키
      Secure/HttpOnly/SameSite=lax(X-Forwarded-Proto 경유) · AI 실호출 200
      (컨테이너 안 claude 가 마운트된 인증 사용, 무의미 입력에 빈 배열 = 계약 준수).

## 검증 (첫 배포 후)

- 홈·스캔·고민·루틴 4탭 200 + 콘텐츠 렌더
- `/api/products` 등 DB 라우트 정상(컨테이너 → db 서비스 네트워크)
- AI 라우트 1건 실호출(컨테이너 안 claude 가 마운트된 인증을 쓰는지)
- 쿠키 `al_uid` 가 https 에서 Secure 로 내려오는지(X-Forwarded-Proto 경유)
- 두 번째 배포(작은 커밋 머지)로 파이프라인 재현성 확인

## 비범위 (Out of Scope)

- 이미지 레지스트리(GHCR 등) — 서버 빌드로 충분(단일 서버). 필요 시 후속.
- 무중단 배포(blue-green) — 재기동 몇 초 다운타임 허용(해커톤).
- 서버 모니터링·알림 — 후속.
