# -*- coding: utf-8 -*-
"""
리팩토링 등가 검증용 토큰 멀티셋 diff (Next.js + TSX + CSS Modules 판).

이 프로젝트는 Tailwind를 쓰지 않는다. 스타일은 전부 CSS Modules 이므로
`styles.클래스` 참조 보존이 렌더 등가의 핵심 신호다.

OLD(분리/통합 전 원본)와 NEW(후 파일들)에서 아래 토큰의 등장 횟수(Counter)를 비교한다:

  styles-ref         CSS Module의 styles.클래스 참조   ← 가장 중요
  styles-dynamic     동적 styles[...] 접근
  classname-literal  className에 직접 쓴 문자열 클래스 (있으면 안 되지만 유입 감시용)
  jsx-element        JSX로 렌더된 컴포넌트/태그 (<Xxx)
  korean-string      한글 UI 문자열
  import-source      import 소스 경로 (.module.css 누락도 여기서 잡힌다)

OLD에만 있는 토큰(소실)은 렌더 출력 변화 신호 → exit 1.
NEW에만 있는 토큰(유입)은 전부 설명 가능해야 한다(새 JSDoc·주석 등) → 출력만.

⚠️ korean-string은 한글 '주석'도 집계한다 — 주석 재작성/삭제 유래 소실은 등가 위반이
아니므로 설명으로 소화한다(소실 목록에서 주석 문구인지 확인).
⚠️ classname-literal에 유틸리티처럼 보이는 토큰(flex, gap-4 …)이 **유입**되면
Tailwind 클래스가 섞여 들어온 것이다 — 이 프로젝트에서는 그 자체가 규칙 위반이다.

사용 (PYTHONIOENCODING=utf-8 필수, Windows는 Bash 도구로 실행):
  python token_multiset_diff.py --old git:HEAD:src/.../Old.tsx --new src/.../A.tsx src/.../B.tsx
  --old/--new 모두 복수 지정 가능. `git:REF:PATH` 형식은 git show로 읽는다.
"""
import argparse
import io
import re
import subprocess
import sys
from collections import Counter

# 단일 캡처 그룹 패턴 — group(1)이 토큰이 된다.
TOKEN_PATTERNS = {
    "styles-ref": r"\b(?:styles|baseStyles|cardStyles|commonStyles)\.([A-Za-z_]\w*)",
    "styles-dynamic": r"\b(?:styles|baseStyles|cardStyles|commonStyles)\[([^\]]+)\]",
    "jsx-element": r"<([A-Za-z][\w.]*)(?=[\s/>])",
    "korean-string": r"[가-힣][가-힣0-9 ·,.%()~:/-]*",
    "import-source": r"""(?:from|import)\s+['"]([^'"]+)['"]""",
}

# className 값은 별도 처리 — 문자열을 공백으로 쪼개 개별 유틸리티 토큰으로 집계한다.
CLASSNAME_RE = re.compile(
    r"""className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*`([^`]*)`\s*\}|\{([^}]*)\})""",
    re.DOTALL,
)
# className={...} 표현식 안에 섞인 문자열 리터럴만 뽑는다 (styles.x 등 식별자는 제외 —
# 그건 styles-ref 패턴이 따로 집계한다).
STRING_LITERAL_RE = re.compile(r"""["'`]([^"'`]*)["'`]""")
# 템플릿 리터럴의 ${...} 보간부는 클래스 토큰이 아니므로 제거한다.
INTERPOLATION_RE = re.compile(r"\$\{[^}]*\}")


def read_spec(spec):
    if spec.startswith("git:"):
        _, ref_path = spec.split(":", 1)
        out = subprocess.run(["git", "show", ref_path], capture_output=True)
        if out.returncode != 0:
            sys.exit(
                "git show 실패: %s\n%s"
                % (ref_path, out.stderr.decode("utf-8", "replace"))
            )
        return out.stdout.decode("utf-8")
    with io.open(spec, encoding="utf-8") as f:
        return f.read()


def count_classname_tokens(text, counter):
    """className에 직접 쓴 문자열 클래스를 개별 토큰으로 집계.
    (styles.x 같은 식별자 참조는 styles-ref 패턴이 따로 집계하므로 여기선 제외된다.)"""
    for m in CLASSNAME_RE.finditer(text):
        quoted = m.group(1) or m.group(2) or m.group(3)
        if quoted is None:
            # className={표현식} — 안에 든 문자열 리터럴만 수집
            expr = m.group(4) or ""
            chunks = STRING_LITERAL_RE.findall(expr)
        else:
            chunks = [quoted]
        for chunk in chunks:
            chunk = INTERPOLATION_RE.sub(" ", chunk)
            for cls in chunk.split():
                # 유틸리티처럼 보이는 것만 (점 표기 식별자·순수 기호 제외)
                if cls and "." not in cls:
                    counter[cls] += 1


def count_tokens(texts):
    counters = {k: Counter() for k in TOKEN_PATTERNS}
    counters["classname-literal"] = Counter()
    for text in texts:
        for key, pattern in TOKEN_PATTERNS.items():
            for m in re.finditer(pattern, text):
                counters[key][m.group(1) if m.groups() else m.group(0).strip()] += 1
        count_classname_tokens(text, counters["classname-literal"])
    return counters


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--old", nargs="+", required=True, help="원본 소스 (파일 경로 또는 git:REF:PATH)"
    )
    ap.add_argument("--new", nargs="+", required=True, help="변경 후 소스들")
    ap.add_argument(
        "--ignore",
        nargs="*",
        default=[],
        help="무시할 토큰 종류 (예: korean-string import-source)",
    )
    args = ap.parse_args()

    old = count_tokens([read_spec(s) for s in args.old])
    new = count_tokens([read_spec(s) for s in args.new])

    lost_any = False
    for key in sorted(old):
        if key in args.ignore:
            continue
        lost = old[key] - new[key]
        gained = new[key] - old[key]
        if lost:
            lost_any = True
            print("[%s] OLD에만 있음(소실 — 등가 위반 신호): %s" % (key, dict(lost)))
        if gained:
            print("[%s] NEW에만 있음(유입 — 전부 설명 필요): %s" % (key, dict(gained)))

    print("RESULT:", "DIFF(소실 있음)" if lost_any else "OK (소실 0)")
    sys.exit(1 if lost_any else 0)


if __name__ == "__main__":
    main()
