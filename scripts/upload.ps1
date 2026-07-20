<#
  upload.ps1  v2  -  safe / concurrent / record-loss-resilient one-shot upload (Windows PowerShell)
  ASCII-only on purpose: works on any code page (this machine's ANSI CP is Big5), with or without BOM.
  Full explanation (Chinese) lives in AI_HANDOFF.md.

  Usage:
    .\scripts\upload.ps1 -Message "msg"                    # push main (default)
    .\scripts\upload.ps1 -PerAgentBranch -Message "msg"    # push own ai/<id> branch (full isolation)
    .\scripts\upload.ps1 -RepoUrl "https://github.com/<acct>/<repo>.git"  # first time / change remote

  Features:
    * Runs from any directory (auto-locates project root).
    * Record-loss resilient: if origin is missing, recovers it from tracked file .deploy/remote.
    * Multi-AI concurrency: machine-local lock serializes commit+push; on push race does fetch->rebase->retry; never force.
    * Contains NO secrets. Auth via system Credential Manager, or env var $env:GIT_PAT.
#>
[CmdletBinding()]
param(
  [string]$RepoUrl = $env:REPO_URL,
  [string]$Branch  = "",
  [string]$Message = "",
  [string]$AgentId = $env:AGENT_ID,
  [switch]$PerAgentBranch,
  [int]$Retries = 5,
  [int]$LockTimeoutSec = 120
)

function Fail($m) { throw $m }

# Always operate from the project root (parent of scripts/)
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

try {
  # 0. Must be a git work tree
  git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -ne 0) { Fail "Not a git work tree." }

  # 1. Commit identity (this repo only)
  if (-not (git config user.name))  { git config user.name  "Claude (AI Creator)" }
  if (-not (git config user.email)) { git config user.email "claude.creator@anthropic.com" }

  # 2. Resolve remote (record-loss resilient: recover origin from .deploy/remote)
  $remotes = git remote
  if ($RepoUrl) {
    if ($remotes -contains "origin") { git remote set-url origin $RepoUrl }
    else { git remote add origin $RepoUrl }
  }
  elseif ($remotes -notcontains "origin") {
    $fallback = Join-Path $RepoRoot ".deploy\remote"
    if (Test-Path $fallback) {
      $u = (Get-Content $fallback -Raw).Trim()
      if ($u) { git remote add origin $u; Write-Host "-> recovered origin from .deploy/remote: $u" }
    }
  }
  if ((git remote) -notcontains "origin") { Fail "No origin and no .deploy/remote to recover from. Pass -RepoUrl." }

  # 3. Decide branch
  if ($PerAgentBranch) {
    if (-not $AgentId) { $AgentId = "$env:COMPUTERNAME-$PID" }
    $Branch = "ai/$AgentId"
  }
  elseif (-not $Branch) { $Branch = "main" }

  # 4. Acquire machine-local lock (serialize commit+push across AIs on the same machine)
  $gitDir  = (git rev-parse --absolute-git-dir).Trim()
  $lockDir = Join-Path $gitDir "ai-upload.lock"
  $deadline = (Get-Date).AddSeconds($LockTimeoutSec)
  $haveLock = $false
  while (-not $haveLock) {
    try {
      New-Item -ItemType Directory -Path $lockDir -ErrorAction Stop | Out-Null
      Set-Content -Path (Join-Path $lockDir "owner") -Value "$env:COMPUTERNAME PID=$PID $(Get-Date -Format o)"
      $haveLock = $true
    }
    catch {
      $info = Get-Item $lockDir -ErrorAction SilentlyContinue
      if ($info -and ((Get-Date) - $info.CreationTime).TotalMinutes -gt 10) {
        Write-Host "-> clearing stale lock"
        Remove-Item $lockDir -Recurse -Force -ErrorAction SilentlyContinue
        continue
      }
      if ((Get-Date) -gt $deadline) { Fail "Timed out waiting for lock (another AI is uploading). Try again later." }
      Write-Host "-> another AI is uploading, waiting..."
      Start-Sleep -Seconds 2
    }
  }

  try {
    # 5. Switch to target branch (handles fresh 'git init' unborn branch -> rebuild-from-zero)
    git rev-parse --verify -q HEAD *> $null
    if ($LASTEXITCODE -ne 0) {
      git symbolic-ref HEAD "refs/heads/$Branch"   # no commits yet: just set the branch name
    }
    elseif ($PerAgentBranch) {
      git checkout -B $Branch | Out-Null
    }
    else {
      $current = (git rev-parse --abbrev-ref HEAD).Trim()
      if ($current -ne $Branch) {
        git show-ref --verify --quiet "refs/heads/$Branch"
        if ($LASTEXITCODE -eq 0) { git checkout $Branch | Out-Null } else { git branch -M $Branch }
      }
    }

    # 6. Commit only if there are changes
    git add -A
    if (git status --porcelain) {
      if (-not $Message) { $Message = "chore: update by AI ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" }
      git commit -m $Message | Out-Null
      Write-Host "-> committed: $Message"
    }
    else { Write-Host "-> no changes to commit" }

    # 7. Push (fetch -> rebase -> retry; never force)
    $pushed = $false
    for ($i = 1; $i -le $Retries; $i++) {
      if ($env:GIT_PAT) {
        $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$($env:GIT_PAT)"))
        git -c http.extraheader="AUTHORIZATION: basic $basic" push -u origin $Branch
      }
      else { git push -u origin $Branch }
      if ($LASTEXITCODE -eq 0) { $pushed = $true; break }

      Write-Host "-> push rejected (another AI likely pushed); syncing and retrying $i/$Retries ..."
      git fetch origin $Branch 2>$null
      git show-ref --verify --quiet "refs/remotes/origin/$Branch"
      if ($LASTEXITCODE -eq 0) {
        git rebase "origin/$Branch"
        if ($LASTEXITCODE -ne 0) {
          git rebase --abort 2>$null
          Fail "Auto-rebase hit a conflict. Resolve manually: git pull --rebase origin $Branch, then rerun."
        }
      }
    }
    if (-not $pushed) { Fail "Still could not push after $Retries retries (check login / network)." }

    Write-Host ""
    Write-Host "OK: uploaded branch $Branch -> origin"
  }
  finally {
    Remove-Item $lockDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  exit 1
}
