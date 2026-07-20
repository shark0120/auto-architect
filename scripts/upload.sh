#!/usr/bin/env bash
# upload.sh — 安全的一鍵上傳腳本 (macOS / Linux / Git-Bash)
# 用法:
#   REPO_URL="https://github.com/<帳號>/<repo>.git" ./scripts/upload.sh "說明"
#   ./scripts/upload.sh "說明"          # origin 已存在時
#
# Auth 來源(腳本本身不含任何密鑰):
#   1. 系統 Git Credential Manager
#   2. 環境變數 GIT_PAT(Personal Access Token,不寫進檔案或 config)
set -euo pipefail

BRANCH="${BRANCH:-main}"
MESSAGE="${1:-}"
REPO_URL="${REPO_URL:-}"

# 0. 確認在 git 工作區
git rev-parse --is-inside-work-tree >/dev/null

# 1. commit 身分(只影響這個 repo)
git config user.name  >/dev/null 2>&1 || git config user.name  "Claude (AI Creator)"
git config user.email >/dev/null 2>&1 || git config user.email "claude.creator@anthropic.com"

# 2. 分支改名為 main
current="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current" != "$BRANCH" ]; then
  echo "→ 分支 $current 改名為 $BRANCH"
  git branch -M "$BRANCH"
fi

# 3. 有變更才 commit
git add -A
if [ -n "$(git status --porcelain)" ]; then
  [ -z "$MESSAGE" ] && MESSAGE="chore: update project"
  git commit -m "$MESSAGE"
  echo "→ 已 commit: $MESSAGE"
else
  echo "→ 沒有新變更,略過 commit"
fi

# 4. 確保 origin 存在
if ! git remote | grep -qx "origin"; then
  if [ -z "$REPO_URL" ]; then
    echo "找不到 origin,也沒有提供 REPO_URL。請先建立空 repo 並帶入網址。" >&2
    exit 1
  fi
  git remote add origin "$REPO_URL"
  echo "→ 已設定 origin: $REPO_URL"
fi

# 5. Push
if [ -n "${GIT_PAT:-}" ]; then
  basic="$(printf 'x-access-token:%s' "$GIT_PAT" | base64 | tr -d '\n')"
  echo "→ 使用 GIT_PAT 推送 $BRANCH ..."
  git -c http.extraheader="AUTHORIZATION: basic $basic" push -u origin "$BRANCH"
else
  echo "→ 使用系統憑證推送 $BRANCH(首次可能跳出登入)..."
  git push -u origin "$BRANCH"
fi

echo ""
echo "✅ 上傳完成。用 'git remote -v' 和平台網頁確認。"
