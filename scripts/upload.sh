#!/usr/bin/env bash
# upload.sh v2 - safe / concurrent / record-loss-resilient one-shot upload (macOS / Linux / Git-Bash)
# ASCII-only on purpose (robust across locales). Full explanation (Chinese) is in AI_HANDOFF.md.
#
# Usage:
#   ./scripts/upload.sh "msg"                        # push main (default)
#   PER_AGENT=1 ./scripts/upload.sh "msg"            # push own ai/<id> branch (full isolation)
#   REPO_URL="https://github.com/<acct>/<repo>.git" ./scripts/upload.sh "msg"  # first time / change remote
#
# Features: runs from any dir; recovers origin from .deploy/remote if missing;
#           multi-AI via machine-local lock + fetch->rebase->retry; never force.
# Auth: system Credential Manager, or env var GIT_PAT (never written to files/config).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

BRANCH="${UPLOAD_BRANCH:-}"
MESSAGE="${1:-}"
REPO_URL="${REPO_URL:-}"
AGENT_ID="${AGENT_ID:-}"
PER_AGENT="${PER_AGENT:-0}"
RETRIES="${RETRIES:-5}"
LOCK_TIMEOUT="${LOCK_TIMEOUT:-120}"

fail() { echo "ERROR: $*" >&2; exit 1; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not a git work tree."

git config user.name  >/dev/null 2>&1 || git config user.name  "Claude (AI Creator)"
git config user.email >/dev/null 2>&1 || git config user.email "claude.creator@anthropic.com"

# Resolve remote (record-loss resilient)
if [ -n "$REPO_URL" ]; then
  if git remote | grep -qx origin; then git remote set-url origin "$REPO_URL"; else git remote add origin "$REPO_URL"; fi
elif ! git remote | grep -qx origin; then
  if [ -f .deploy/remote ]; then
    u="$(tr -d ' \r\n' < .deploy/remote)"
    if [ -n "$u" ]; then git remote add origin "$u"; echo "-> recovered origin from .deploy/remote: $u"; fi
  fi
fi
git remote | grep -qx origin || fail "No origin and no .deploy/remote. Set REPO_URL."

# Decide branch
if [ "$PER_AGENT" = "1" ]; then
  [ -z "$AGENT_ID" ] && AGENT_ID="$(hostname)-$$"
  BRANCH="ai/$AGENT_ID"
elif [ -z "$BRANCH" ]; then
  BRANCH="main"
fi

# Machine-local lock (atomic mkdir); clear if stale (>10 min)
GITDIR="$(git rev-parse --absolute-git-dir)"
LOCK="$GITDIR/ai-upload.lock"
deadline=$(( $(date +%s) + LOCK_TIMEOUT ))
while ! mkdir "$LOCK" 2>/dev/null; do
  mtime="$(stat -c %Y "$LOCK" 2>/dev/null || stat -f %m "$LOCK" 2>/dev/null || echo '')"
  if [ -n "$mtime" ] && [ "$(( $(date +%s) - mtime ))" -gt 600 ]; then
    echo "-> clearing stale lock"; rm -rf "$LOCK"; continue
  fi
  [ "$(date +%s)" -gt "$deadline" ] && fail "Timed out waiting for lock (another AI is uploading). Try later."
  echo "-> another AI is uploading, waiting..."
  sleep 2
done
echo "$(hostname) PID=$$ $(date -Iseconds 2>/dev/null || date)" > "$LOCK/owner" 2>/dev/null || true
trap 'rm -rf "$LOCK"' EXIT

# Switch to target branch (handles fresh 'git init' unborn branch -> rebuild-from-zero)
if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  if [ "$PER_AGENT" = "1" ]; then
    git checkout -B "$BRANCH" >/dev/null
  else
    current="$(git rev-parse --abbrev-ref HEAD)"
    if [ "$current" != "$BRANCH" ]; then
      if git show-ref --verify --quiet "refs/heads/$BRANCH"; then git checkout "$BRANCH" >/dev/null; else git branch -M "$BRANCH"; fi
    fi
  fi
else
  git symbolic-ref HEAD "refs/heads/$BRANCH"   # no commits yet: just set the branch name
fi

# Commit only if there are changes
git add -A
if [ -n "$(git status --porcelain)" ]; then
  [ -z "$MESSAGE" ] && MESSAGE="chore: update by AI ($(date '+%Y-%m-%d %H:%M'))"
  git commit -m "$MESSAGE" >/dev/null
  echo "-> committed: $MESSAGE"
else
  echo "-> no changes to commit"
fi

# Push (fetch -> rebase -> retry; never force)
pushed=0
for i in $(seq 1 "$RETRIES"); do
  if [ -n "${GIT_PAT:-}" ]; then
    basic="$(printf 'x-access-token:%s' "$GIT_PAT" | base64 | tr -d '\n')"
    if git -c http.extraheader="AUTHORIZATION: basic $basic" push -u origin "$BRANCH"; then pushed=1; break; fi
  else
    if git push -u origin "$BRANCH"; then pushed=1; break; fi
  fi
  echo "-> push rejected (another AI likely pushed); syncing and retrying $i/$RETRIES ..."
  git fetch origin "$BRANCH" 2>/dev/null || true
  if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    if ! git rebase "origin/$BRANCH"; then
      git rebase --abort 2>/dev/null || true
      fail "Auto-rebase hit a conflict. Resolve manually: git pull --rebase origin $BRANCH, then rerun."
    fi
  fi
done
[ "$pushed" = "1" ] || fail "Still could not push after $RETRIES retries (check login / network)."

echo ""
echo "OK: uploaded branch $BRANCH -> origin"
