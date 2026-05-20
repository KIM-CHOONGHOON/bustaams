#!/usr/bin/env bash
# bustaams 스키마: 애플리케이션 소스에서 DDL(테이블·컬럼 생성/변경/삭제) 금지 — CI 및 로컬 실행용.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALLOWLIST="$ROOT/scripts/ci/ddl-guard-create-table-allowlist.txt"

die() {
  echo "::error::$*" >&2
  echo "ERROR: $*" >&2
  exit 1
}

# Git 추적 파일만 검사 (node_modules 등 미추적 경로 제외)
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  die "Not a git repository root."
fi

STRICT_RE='ALTER[[:space:]]+TABLE|DROP[[:space:]]+TABLE|ADD[[:space:]]+COLUMN|DROP[[:space:]]+COLUMN'

pathspecs=(
  ':(glob)busTaams_server/**/*.js'
)

if git grep -n -i -E "$STRICT_RE" -- "${pathspecs[@]}" 2>/dev/null; then
  die "Forbidden DDL in application sources: ALTER/DROP TABLE or ADD/DROP COLUMN. Schema changes belong in approved DBA migrations only."
fi

# CREATE TABLE — allowlist에 있는 파일만 허용
CREATE_RE='CREATE[[:space:]]+TABLE'

hits=$(git grep -l -i -E "$CREATE_RE" -- "${pathspecs[@]}" 2>/dev/null || true)
if [[ -z "$hits" ]]; then
  exit 0
fi

allowed_lines="$(sed '/^[[:space:]]*#/d;/^[[:space:]]*$/d' "$ALLOWLIST")"

while IFS= read -r hit; do
  [[ -z "$hit" ]] && continue
  ok=false
  while IFS= read -r allowed; do
    [[ -z "$allowed" ]] && continue
    if [[ "$hit" == "$allowed" ]]; then
      ok=true
      break
    fi
  done <<< "$allowed_lines"
  if [[ "$ok" != true ]]; then
    die "CREATE TABLE found in '$hit' (not in scripts/ci/ddl-guard-create-table-allowlist.txt). New tables must not be added from application code."
  fi
done <<< "$(printf '%s\n' "$hits" | sort -u)"

exit 0
