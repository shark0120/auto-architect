<#
  upload.ps1  —  安全的一鍵上傳腳本 (Windows PowerShell)
  用法:
    .\scripts\upload.ps1 -RepoUrl "https://github.com/<帳號>/<repo>.git" -Message "說明"
    .\scripts\upload.ps1 -Message "說明"      # origin 已存在時

  Auth 來源(擇一,腳本本身不含任何密鑰):
    1. 系統 Git Credential Manager(第一次 push 會跳瀏覽器登入)
    2. 環境變數 $env:GIT_PAT(Personal Access Token,不會被寫進檔案或 config)
#>
param(
  [string]$RepoUrl = $env:REPO_URL,
  [string]$Branch  = "main",
  [string]$Message = ""
)
$ErrorActionPreference = "Stop"

# 0. 確認在 git 工作區
git rev-parse --is-inside-work-tree | Out-Null

# 1. 確認 commit 身分(只影響這個 repo)
if (-not (git config user.name))  { git config user.name  "Claude (AI Creator)" }
if (-not (git config user.email)) { git config user.email "claude.creator@anthropic.com" }

# 2. 分支改名為 main(若目前不是)
$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne $Branch) {
  Write-Host "→ 分支 $current 改名為 $Branch"
  git branch -M $Branch
}

# 3. 有變更才 commit
git add -A
$pending = git status --porcelain
if ($pending) {
  if (-not $Message) { $Message = "chore: update project" }
  git commit -m $Message
  Write-Host "→ 已 commit: $Message"
} else {
  Write-Host "→ 沒有新變更,略過 commit"
}

# 4. 確保 origin 存在
$remotes = git remote
if ($remotes -notcontains "origin") {
  if (-not $RepoUrl) {
    throw "找不到 origin,也沒有提供 -RepoUrl / `$env:REPO_URL。請先建立空 repo 並帶入網址。"
  }
  git remote add origin $RepoUrl
  Write-Host "→ 已設定 origin: $RepoUrl"
}

# 5. Push
if ($env:GIT_PAT) {
  # 用 PAT 走 http header(不寫進 URL / config,push 完即消失)
  $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$($env:GIT_PAT)"))
  Write-Host "→ 使用 GIT_PAT 推送 $Branch ..."
  git -c http.extraheader="AUTHORIZATION: basic $basic" push -u origin $Branch
} else {
  Write-Host "→ 使用系統憑證推送 $Branch(首次可能跳出登入視窗)..."
  git push -u origin $Branch
}

Write-Host "`n✅ 上傳完成。用 'git remote -v' 和平台網頁確認。"
