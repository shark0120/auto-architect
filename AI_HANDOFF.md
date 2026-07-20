# 🤖 AI 交接手冊 (AI Handoff)

> **未來接手的 AI，請先讀這一份，再開始做事。**
> 這份文件會跟著 repo 一起上傳,所以就算在新機器 fresh clone 也看得到。
> 個人密鑰、Token 一律**不寫進這裡**(見下方安全守則)。

---

## 1. 這個專案在幹嘛 (What this is)

- **名稱**:Auto-Architect(npm 套件名 `auto-architect`)
- **一句話**:一個語言無關的 CLI,使用者用自然語言描述想要的技術棧,工具就自動產生可上線的專案骨架(Auth / DB / CI-CD / Tailwind)。
- **技術**:Node.js + TypeScript + Commander + Inquirer。
- **目標**:做成一個高星數的開源專案。
- **核心程式**:
  - `src/index.ts` — CLI 進入點
  - `src/parser.ts` — 把自然語言 prompt 解析成 Architecture Schema
  - `src/generators/engine.ts` — 依 schema 產生檔案骨架
  - `src/utils/fs.ts` — 檔案輸出工具

**試跑**:
```bash
npm install
npx tsx src/index.ts generate "React with Firebase and Tailwind"
```

---

## 2. 目前的 Git 狀態 (Where we are)

- 分支:見 `git branch`(初始為 `master`,建議上傳前改成 `main`)。
- Commit 身分:`Claude (AI Creator) <claude.creator@anthropic.com>`。
- **遠端 (remote)**:第一次上傳前是**空的**。設定完成後這裡應為:
  ```
  origin  https://github.com/<帳號>/<repo>.git
  ```
- 用 `git remote -v` 和 `git log --oneline -5` 確認現況,不要假設。

---

## 3. 要怎麼上傳 (How to upload) — 這是重點

### 3-A. 首次設定(整個專案只需做一次)

> ⚠️ **這一步需要「人」來做,AI 不能代替:**
> AI **不能**幫忙註冊帳號、輸入密碼、完成人機驗證。以下由使用者本人操作。

1. 使用者到 Git 平台(GitHub / GitLab...)**註冊/登入新帳號**,建立一個**空的** repo(不要勾 README/LICENSE,避免衝突)。
2. 記下 repo 的 HTTPS 網址,例如 `https://github.com/<帳號>/auto-architect.git`。
3. 準備登入憑證,擇一:
   - **(推薦,給人用)** 直接用 Git 內建的 Credential Manager:第一次 `git push` 會跳出瀏覽器登入,登入後憑證自動快取,之後就不用再輸入。
   - **(給自動化 / AI 用)** 產生一個 Personal Access Token(PAT,權限勾 `repo`),放進環境變數,**不要**貼進任何檔案:
     ```powershell
     $env:GIT_PAT = "<你的PAT>"      # PowerShell,只存在這個 session
     ```

### 3-B. 日常上傳(每次要 push 時)

最簡單:在專案根目錄執行上傳腳本(會自動 commit + push):
```powershell
# Windows PowerShell
.\scripts\upload.ps1 -RepoUrl "https://github.com/<帳號>/<repo>.git" -Message "你的變更說明"
```
```bash
# macOS / Linux / Git-Bash
REPO_URL="https://github.com/<帳號>/<repo>.git" ./scripts/upload.sh "你的變更說明"
```
- `RepoUrl` 只有**第一次**需要(用來設定 origin);之後 origin 已存在就可省略。
- 腳本會:設定 commit 身分 → 分支改為 `main` → `git add -A` → 有變更才 commit → 確保 origin → `git push`。

想手動做也可以,等同於:
```bash
git branch -M main                                   # 首次:master → main
git remote add origin https://github.com/<帳號>/<repo>.git   # 首次
git add -A
git commit -m "你的變更說明"
git push -u origin main
```

---

## 4. 安全守則 (Rules — 不要違反)

1. **絕不**把 Token / 密碼 / 金鑰寫進任何被 git 追蹤的檔案。憑證只放環境變數或系統 Credential Manager。
2. **AI 不能**:註冊帳號、輸入密碼、過人機驗證。這些請人來做。
3. `git push`(公開發佈)前,**先跟使用者確認**要 push 到哪個 repo。
4. Push 前先 `git status` / `git log`,確認沒有把不該公開的東西(`.env`、`.claude/`、私人筆記)加進去。`.gitignore` 已排除 `node_modules/`、`dist/`、`.claude/`、`WORKLOG.md`、`test-app/`。
5. 保持 commit 身分為 `Claude (AI Creator) <claude.creator@anthropic.com>`(除非使用者要改)。

---

## 5. 已完成 / 待辦 (Status)

**已完成**
- [x] Auto-Architect v1.0 CLI 骨架(parser + engine)。
- [x] 高轉換率 README。
- [x] 這份可上傳的 AI 交接機制 + 上傳腳本。

**待辦 / 下一步**
- [ ] 使用者建立新 Git 帳號 + 空 repo,提供網址(見 3-A)。
- [ ] 首次 push(見 3-B),把分支改成 `main`。
- [ ] README 有提到但尚未建立的檔案:`LICENSE`(MIT)、`CONTRIBUTING.md`。
- [ ] `package.json` 的 `test` 目前是失敗佔位,之後補上真的測試。
- [ ] Roadmap:接 Anthropic Claude API 取代目前的本地啟發式解析。

---

## 6. 未來 AI 的第一步 (Start here)

1. 讀這份 `AI_HANDOFF.md` + `README.md`。
2. `git remote -v`、`git status`、`git log --oneline -5` 看現在到哪。
3. 若還沒設定遠端 → 依第 3 節,請使用者提供新帳號 repo 網址,確認後再 push。
4. 若已設定 → 做完你的變更,跑 `scripts/upload.ps1` 上傳。
5. 更新本檔第 5 節的「已完成 / 待辦」,讓下一個 AI 接得下去。
