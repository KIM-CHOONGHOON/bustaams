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

# STRICT_RE 정의
STRICT_RE='ALTER[[:space:]]+TABLE|DROP[[:space:]]+TABLE|ADD[[:space:]]+COLUMN|DROP[[:space:]]+COLUMN'

# 검사 대상 파일 탐색
# 1. PR 환경이면 변경된 파일만 추적
if [[ -n "${GITHUB_BASE_REF:-}" ]]; then
  echo "PR environment detected (Base: $GITHUB_BASE_REF). Checking modified files only..."
  BASE_BRANCH="origin/$GITHUB_BASE_REF"
  if ! git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
    BASE_BRANCH="$GITHUB_BASE_REF"
  fi
  if git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
    changed_files=$(git diff --name-only "$BASE_BRANCH"...HEAD || true)
  else
    changed_files=$(git diff --name-only HEAD~1 || true)
  fi
else
  # 로컬 빌드 또는 푸시 환경: 로컬 수정사항 및 최근 커밋 변경 사항 추적
  echo "Local or push environment detected. Checking modified files..."
  changed_files=$( (git diff --name-only HEAD~1 2>/dev/null || true); git status --porcelain | awk '{print $2}' )
  # 만약 변경 사항이 전혀 없으면 전체 검사 진행 (로컬 수동 전체 검사용)
  if [[ -z "$(echo "$changed_files" | tr -d '[:space:]')" ]]; then
    changed_files=$(git ls-files || true)
  fi
fi

# busTaams_server/**/*.js 파일들만 필터링
target_files=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if [[ "$file" =~ ^busTaams_server/.*\.js$ ]]; then
    # 실제로 존재하는 파일만 검사 대상에 포함 (삭제된 파일 제외)
    if [[ -f "$file" ]]; then
      target_files+=("$file")
    fi
  fi
done <<< "$(printf '%s\n' "$changed_files" | sort -u)"

if [[ ${#target_files[@]} -eq 0 ]]; then
  echo "No modified application source files in busTaams_server/. Skipping DDL guard."
  exit 0
fi

echo "Checking the following files for DDL:"
printf ' - %s\n' "${target_files[@]}"

# STRICT_RE 검사
if git grep -n -i -E "$STRICT_RE" -- "${target_files[@]}" 2>/dev/null; then
  die "Forbidden DDL in application sources: ALTER/DROP TABLE or ADD/DROP COLUMN. Schema changes belong in approved DBA migrations only."
fi

# CREATE TABLE — allowlist에 있는 파일만 허용
CREATE_RE='CREATE[[:space:]]+TABLE'

hits=$(git grep -l -i -E "$CREATE_RE" -- "${target_files[@]}" 2>/dev/null || true)
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
