#!/bin/sh
# youtine 운영 DB(MariaDB) 백업 — 크론에서 하루 1회 돌린다.
#
# WHY 이런 모양인가:
# - 자격 증명을 스크립트에 넣지 않는다. 배포 디렉토리의 .env(=compose 가 쓰는 그 파일)를
#   읽는다. 경로는 인자로 받고 기본값은 이 스크립트 기준 상대 경로다 —
#   서버 경로를 하드코딩하면 레포 규칙(식별자 금지) 위반이고 이식성도 잃는다.
# - 비밀번호를 **어느 프로세스의 argv 에도** 두지 않는다(호스트 `ps` 에 보인다 —
#   다른 서비스와 공유하는 단일 서버다). `-e NAME=값` 은 docker 클라이언트 argv 에
#   평문이 그대로 들어가므로 쓰지 않는다. 값 없는 `-e NAME` 만 주면 docker 가
#   **클라이언트 환경변수에서 값을 복사**하므로 argv 에는 이름만 남는다.
#   되돌려서 `-e MYSQL_PWD="$DB_PASSWORD"` 로 쓰면 DB 비밀번호가 ps 에 노출된다.
# - **조용한 실패가 백업의 전형적 사망 원인**이라 검증 없이는 성공으로 치지 않는다:
#   빈 파일 / gzip 깨짐 / 덤프 중단(마지막 줄 "Dump completed" 없음)이면 exit 1.
# - 보관은 최근 3개뿐이다. 서버 디스크가 91% 라 더 쌓으면 디스크가 먼저 죽는다.
#
# 사용:  sh db/backup.sh [.env 경로] [출력 디렉토리]
# 종료코드: 0 성공 / 1 실패(크론이 메일·알림으로 잡을 수 있게 stderr 에 이유를 남긴다)
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

ENV_FILE=${1:-"$SCRIPT_DIR/../.env"}
OUT_DIR=${2:-"$SCRIPT_DIR/../backups"}
DB_CONTAINER=${DB_CONTAINER:-al-front-db}
KEEP=${KEEP:-3}

die() {
  echo "backup: $*" >&2
  exit 1
}

[ -f "$ENV_FILE" ] || die ".env 를 찾을 수 없다: $ENV_FILE (첫 인자로 경로를 넘겨라)"

# .env 를 통째로 `.` 하지 않는다 — 앱 설정에는 따옴표·특수문자·주석이 섞여 있어
# sh 파서가 엉뚱하게 실행될 수 있다. 필요한 세 키만 뽑는다.
env_get() {
  # 마지막 정의가 이긴다(compose 와 같은 규칙). 값의 양끝 따옴표만 벗긴다.
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed 's/^"\(.*\)"$/\1/; s/^'"'"'\(.*\)'"'"'$/\1/'
}

DB_NAME=$(env_get DB_NAME)
DB_USER=$(env_get DB_USER)
DB_PASSWORD=$(env_get DB_PASSWORD)

[ -n "$DB_NAME" ] || die "DB_NAME 이 비어 있다 ($ENV_FILE)"
[ -n "$DB_USER" ] || die "DB_USER 가 비어 있다 ($ENV_FILE)"
[ -n "$DB_PASSWORD" ] || die "DB_PASSWORD 가 비어 있다 ($ENV_FILE)"

mkdir -p "$OUT_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$OUT_DIR/${DB_NAME}-${STAMP}.sql.gz"

# 실패하면 반쪽짜리 파일을 남기지 않는다 — 다음 실행의 보관 개수만 갉아먹는다.
trap 'rm -f "$OUT"' EXIT

# ⚠️ POSIX sh 에는 pipefail 이 없다 — docker 가 죽어도 gzip 이 0 을 내서 아래 `||` 는
#    안 걸린다. 그래서 성공 판정을 **덤프 내용 검사**에 맡긴다(아래 3줄). 그 검사를
#    지우면 "0바이트 백업을 매일 성공으로 보고하는" 상태가 된다.
# --single-transaction: InnoDB 를 락 없이 일관 스냅샷으로 뜬다(서비스 중단 없음).
# --default-character-set=utf8mb4: 한글 제품명·성분명이 ??? 로 깨지는 것을 막는다.
MYSQL_PWD="$DB_PASSWORD" MARIADB_PWD="$DB_PASSWORD" \
  docker exec -e MYSQL_PWD -e MARIADB_PWD "$DB_CONTAINER" \
  mariadb-dump --single-transaction --default-character-set=utf8mb4 \
  -u "$DB_USER" "$DB_NAME" | gzip -c >"$OUT" ||
  die "덤프 실패 (컨테이너=$DB_CONTAINER)"

[ -s "$OUT" ] || die "덤프가 비었다"
gzip -t "$OUT" 2>/dev/null || die "gzip 무결성 실패"
# 덤프가 중간에 끊겼는지 — mariadb-dump 는 정상 종료 시 마지막 줄에 이 문구를 넣는다.
gzip -dc "$OUT" | tail -n 1 | grep -q "Dump completed" || die "덤프가 중간에 끊겼다"

trap - EXIT

SIZE=$(wc -c <"$OUT" | tr -d ' ')
echo "backup: $OUT ($SIZE bytes)"

# 최근 $KEEP 개만 남긴다. 파일명이 날짜시각이라 이름 정렬 = 시간 정렬이다.
ls -1 "$OUT_DIR/${DB_NAME}-"*.sql.gz 2>/dev/null | sort -r | tail -n "+$((KEEP + 1))" | while IFS= read -r old; do
  rm -f "$old"
  echo "backup: removed $old"
done
