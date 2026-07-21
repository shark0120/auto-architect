# 🤖 AI 交接手冊 (AI Handoff)

> **未來接手的 AI,請先讀這一份,再開始做事。**
> 這份文件、上傳腳本、遠端位址全部都 commit 進 repo,所以就算記憶 / `.claude/` 全被清空、
> 甚至 `.git/config` 遺失,也**不影響上傳**(見第 5 節「從零重建」)。
> 個人密鑰 / Token 一律**不寫進任何檔案**(見第 6 節安全守則)。

---

## 1. 這個專案在幹嘛 (What this is)

- **名稱**:Auto-Architect(npm 套件名 `auto-architect`)
- **一句話**:語言無關的 CLI,使用者用自然語言描述技術棧,工具自動產生可上線的專案骨架(Auth / DB / CI-CD / Tailwind)。
- **技術**:Node.js + TypeScript + Commander + Inquirer。
- **核心程式**:`src/index.ts`(CLI 入口)、`src/parser.ts`(NL→Schema)、`src/generators/engine.ts`(產檔)、`src/utils/fs.ts`。

**試跑**:
```bash
npm install
npx tsx src/index.ts generate "React with Firebase and Tailwind"
```

---

## 2. 目前的 Git 狀態 (Where we are)

- **遠端**:`origin = https://github.com/shark0120/auto-architect.git`(Public)。
  也記在追蹤檔 [`.deploy/remote`](.deploy/remote),作為還原用。
- **主分支**:`main`。
- **Commit 身分**:`Claude (AI Creator) <claude.creator@anthropic.com>`。
- 動手前先看現況,別假設:`git remote -v` / `git status` / `git log --oneline -5`。

---

## 3. 要怎麼上傳 (How to upload) — 日常用這個

在專案任何位置執行上傳腳本(自動 commit + push,會回到專案根目錄):
```powershell
# Windows PowerShell
.\scripts\upload.ps1 -Message "你的變更說明"
```
```bash
# macOS / Linux / Git-Bash
./scripts/upload.sh "你的變更說明"
```
腳本會:設定身分 → 確保 `origin` → 上本機鎖 → `git add -A` → 有變更才 commit → `fetch/rebase/push`(見第 4 節)→ 放鎖。

**Auth(擇一,腳本不含任何密鑰)**:
- **推薦(人用)**:直接 push,Git Credential Manager 第一次會跳瀏覽器登入 `shark0120`,之後快取。
- **自動化(AI 用)**:設環境變數再跑腳本,Token 不會寫進檔案 / config:
  ```powershell
  $env:GIT_PAT = "<PAT,權限勾 repo>"   # 只存活於這個 session
  ```

---

## 4. 多 AI 同時上傳 (Concurrent uploads) — 重點

三層保護,讓多個 AI 可以一起推而不互相蓋:

1. **同機序列化(本機鎖)**:腳本用 `.git/ai-upload.lock`(machine-local,不會被 commit)把「commit+push」這段上鎖。同一台機器上第二個 AI 會自動排隊等待,超過 10 分鐘的死鎖會自動清除。
2. **跨 clone 競爭(自動同步)**:push 若被拒(別人剛推了),腳本自動 `fetch → rebase → 重試`(最多 5 次)。只要改到的內容不衝突,並行推 `main` 就會成功。
3. **完全隔離模式(最穩)**:每個 AI 推自己的分支,永不衝突:
   ```powershell
   .\scripts\upload.ps1 -PerAgentBranch -Message "..."   # 推到 ai/<機器-PID>
   ```
   ```bash
   PER_AGENT=1 AGENT_ID=alice ./scripts/upload.sh "..."  # 推到 ai/alice
   ```
   之後由一個 AI 或人把各 `ai/*` 分支合併回 `main`。要更徹底隔離,可讓每個 AI 各開 `git worktree` 或各自 clone。

**鐵則**:
- **永不** `git push --force` 到共用分支(`main`)。腳本本身絕不 force。
- 真的遇到自動 rebase 解不開的衝突 → 腳本會停下並提示,改用 `-PerAgentBranch` 或人工 `git pull --rebase` 解決。

---

## 5. 從零重建 / 抗紀錄遺失 (Rebuild from nothing)

整套上傳能力都在 repo 裡,不依賴任何外部記憶:

- **只要有這份 clone** → 直接跑 `scripts/upload.ps1` 就能推,origin 來自 `.git/config`。
- **origin 不見了**(例如在別的目錄 `git init`) → 腳本自動讀追蹤檔 `.deploy/remote` 還原 origin。
- **連 `.git` 都沒了,只剩程式碼** → 一鍵重建並推:
  ```powershell
  git init
  git add -A
  git commit -m "restore"
  .\scripts\upload.ps1            # 自動從 .deploy/remote 設 origin 再推
  ```
- 腳本可**從任何資料夾**執行(會自動定位到專案根目錄)。

> 所以「未來紀錄遺失」不影響上傳:上傳所需的**流程、腳本、遠端位址**全部是 repo 的一部分。

---

## 6. 安全守則 (Rules — 不要違反)

1. **絕不**把 Token / 密碼 / 金鑰寫進任何被 git 追蹤的檔案。只放環境變數或系統 Credential Manager。
2. **AI 不能**:註冊帳號、輸入密碼、過人機驗證 → 這些請人做。
3. `git push`(公開發佈)前,先確認目標 repo 沒推錯地方。
4. Push 前 `git status` 確認沒把 `.env`、私人筆記加進去。`.gitignore` 已排除 `node_modules/`、`dist/`、`.claude/`、`WORKLOG.md`、`test-app/`。
5. commit 身分維持 `Claude (AI Creator) <claude.creator@anthropic.com>`(除非使用者要改)。

---

## 7. 已完成 / 待辦 (Status)

**已完成**
- [x] Auto-Architect v1.0 CLI(parser + engine)。
- [x] 建好遠端 repo `shark0120/auto-architect`(Public),分支 `main`。
- [x] 可並行、抗紀錄遺失的上傳流程(`scripts/` + `.deploy/remote` + 本文件)。
- [x] 詳細迭代工作流程與路線圖 → **[`AI_WORKFLOW.md`](AI_WORKFLOW.md)**。

**待辦**
- [x] 第一次 push 上去 ✅ 2026-07-21 完成(`shark0120` 憑證已以 per-repo 方式快取,之後 push 全自動免登入)。
- [ ] 其餘全部開發任務:見 **[`AI_WORKFLOW.md`](AI_WORKFLOW.md) §5 路線圖**(本檔不再重複維護任務清單)。

---

## 8. 未來 AI 的第一步 (Start here)

1. 讀本檔(怎麼上傳)+ **[`AI_WORKFLOW.md`](AI_WORKFLOW.md)**(做什麼、怎麼驗證、怎麼迭代、有哪些 Skill)。
2. `git remote -v` / `git status` / `git log --oneline -5` 看現況。
3. 照 `AI_WORKFLOW.md` §2 的循環認領任務、實作、過閘門。
4. 上傳:`scripts/upload.ps1`(多 AI 一起跑就加 `-PerAgentBranch`)。
5. 更新 `AI_WORKFLOW.md` §5 打勾與 §6 看板,讓下一個 AI 接得下去。
