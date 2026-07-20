# 🔁 AI 工作流程 (AI Workflow) — 接下來做什麼、怎麼驗證、怎麼迭代

> 搭配 [`AI_HANDOFF.md`](AI_HANDOFF.md)(怎麼上傳、安全守則)一起讀。
> **本檔是行動手冊**:任何 AI 接手,照第 2 節的循環跑,就能持續把專案往前推。
> 所有「目前狀態」都是實測結果(標了 ✅/❌),不是猜的;你接手時請重測,以你的實測為準。

---

## 1. 使命與完成定義 (Mission)

**Auto-Architect**:自然語言 → 完整專案骨架的 CLI。目標是**高星數、真的可用**的開源工具。

「v2.0 完成」的定義(全部打勾才算):
- [ ] `npm run build` 產出可用 dist/,`npx auto-architect` 從 npm 裝了就能跑
- [ ] 產出的每種框架專案 `npm install && npm run build` 都成功(不只 Next.js)
- [ ] 測試覆蓋 parser 與 engine,CI 在 GitHub 上全綠
- [ ] README 的每個承諾(LICENSE、CONTRIBUTING、npm badge)都是真的
- [ ] (選配)接上 Claude API 做真 AI 解析,無 API key 時退回啟發式

---

## 2. 每一輪迭代循環 (The Loop) — 核心

每個 AI session 重複這個循環。**一輪 = 一個任務 = 一次上傳**,小步快跑:

```
┌─ 0. 同步 ──────────────────────────────────────────┐
│  git pull --rebase origin main   (拿最新;首推前可跳過)│
│  讀 AI_WORKFLOW.md §6 狀態看板:有人在做什麼?          │
├─ 1. 認領 ──────────────────────────────────────────┤
│  從 §5 路線圖挑「最上面還沒打勾、沒人認領」的任務        │
│  多 AI 並行時:先在 §6 認領表寫上任務+ID+時間,先推一次   │
├─ 2. 實作 ──────────────────────────────────────────┤
│  範圍只做這一個任務。發現新問題 → 記到 §5,不順手擴scope │
├─ 3. 驗證 ──────────────────────────────────────────┤
│  跑 §3 閘門:G1 必跑;G2 有測試後必跑;G3 必跑;         │
│  動到 engine/模板 → 加跑 G4。任何紅 → 修到綠才准上傳    │
├─ 4. 記錄 ──────────────────────────────────────────┤
│  更新 §5 打勾、§6 看板;必要時更新 README/HANDOFF       │
├─ 5. 上傳 ──────────────────────────────────────────┤
│  .\scripts\upload.ps1 -Message "feat: ..."          │
│  (多 AI 並行 → 加 -PerAgentBranch,見 §7)             │
└─ 6. 交棒:回到 0,或結束 session ─────────────────────┘
```

**迭代紀律**:
- 動手前先把該任務的「驗收標準」讀一遍(§5 每項都寫好了)。驗收標準沒過 = 沒完成,不准打勾。
- 驗證失敗 → 修;修不動 → `git checkout -- .` 回滾,把卡點寫進 §6 看板再交棒。**不准上傳紅的 main。**
- 每輪 commit 訊息用 conventional commits(`feat:` `fix:` `test:` `docs:` `chore:`)。

---

## 3. 驗證閘門 (Verification Gates) — 怎麼驗證

| 閘門 | 指令 | 通過標準 | 目前狀態 (2026-07-20 實測) |
|---|---|---|---|
| **G0 環境** | `npm install` | 無 error | ✅ |
| **G1 型別** | `npx tsc --noEmit` | 0 errors | ❌ 兩個原因:`test-app/` 漏進掃描;`src/` 有 TS1295(`verbatimModuleSyntax` vs CommonJS)→ **build 也是壞的** |
| **G2 測試** | `npm test` | 全綠 | ❌ 還是 `exit 1` 佔位,尚無測試框架 |
| **G3 冒煙** | `npx tsx src/index.ts generate "Next.js app with Supabase, Tailwind and GitHub Actions" --dir <temp>` | exit 0,且產出 `package.json`、`README.md`、`app/page.tsx`、`tailwind.config.js`、`.github/workflows/deploy.yml` | ✅ 5 檔全數產出 |
| **G4 產物可用**(深) | cd 進產出目錄 → `npm install && npm run build` | build 成功 | ❌ 未達標:engine 對所有框架都寫死 `next dev/build/start`(engine.ts:19),React(Vite)/Vue 產物必壞 |
| **G5 文件同步** | 人工檢查 | §5 打勾與現實一致;README 沒有說謊的承諾 | ⚠️ README 提到的 LICENSE/CONTRIBUTING 不存在 |
| **G6 上傳** | `.\scripts\upload.ps1` | 顯示 `OK: uploaded` | ✅ 腳本已通過 4/4 本地並行測試(首推待使用者登入) |

冒煙測試的 temp 目錄用完即丟,放 scratchpad 或 `%TEMP%`,**不要**產在 repo 裡(`.gitignore` 已擋 `test-app/`、`my-test-app/`)。

---

## 4. 已知真相 (Ground Truth) — 改碼前先知道

程式很小,10 分鐘可讀完;這些是已確認的事實,不用重新考古:

- `src/index.ts` — commander 入口,只有 `generate` 一個指令,`--dir` 選項。
- `src/parser.ts` — **假 AI**:關鍵字比對 + `setTimeout(1500)` 裝忙。認得:next.js/react/vue、supabase/firebase/mongo、tailwind、stripe、github actions。`name` 寫死 `my-auto-app`。
- `src/generators/engine.ts` — 產檔器 + `setTimeout(1200)` 裝忙。**已知 bug**:`package.json` scripts 對所有框架寫死 next 指令(第 19 行);框架分支只有 Next.js 有內容。
- `src/utils/fs.ts` — `createFile`:mkdir -p + 寫檔 + log,乾淨。
- `tsconfig.json` — 目前把 `test-app/` 掃進去,且 module 設定與 CommonJS 衝突(TS1295)→ G1 紅的根因。
- `package.json` — `bin` 指向 `dist/index.js` 但 build 壞掉 = **現在 npm publish 會是死包**;`test` 是失敗佔位。

---

## 5. 路線圖 (Roadmap) — 接下來要做啥,由上往下做

> 規則:由上往下認領;每項先看驗收標準;完成打 `[x]` 並附 commit hash。

### P0 — 讓閘門變綠(最優先,每項都小)
- [ ] **P0-1 修 tsconfig**:排除 `test-app/`、解 TS1295(建議 `"module": "nodenext"` + package.json 加 `"type": "module"`,或改回純 CJS,擇一走到底)。
  驗收:`npx tsc --noEmit` 0 errors(G1 綠)。
- [ ] **P0-2 修 build**:`npm run build` 產出 dist/,`node dist/index.js generate "react app" --dir <temp>` 能跑。
  驗收:上述兩指令 exit 0;dist/ 不進 git(已在 .gitignore)。
- [ ] **P0-3 測試框架**:裝 vitest,`npm test` 跑真測試。第一批:parser 至少 6 個 case(三框架、三 DB、tailwind、stripe、ci、無關鍵字 fallback)。parser 的 setTimeout 改成可注入/可跳過,測試不用等 1.5 秒。
  驗收:`npm test` 全綠(G2 綠),測試時間 < 5 秒。
- [ ] **P0-4 修 engine 框架 bug**:scripts 按框架產生(Next→next、React(Vite)→vite、Vue→vite),React/Vue 也要有最小入口檔。
  驗收:三種框架各 generate 一次,`package.json` scripts 正確、入口檔存在(G3 擴充);Next.js 產物過 G4。
- [ ] **P0-5 兌現 README 承諾**:補 `LICENSE`(MIT, copyright shark0120)與 `CONTRIBUTING.md`。
  驗收:兩檔存在,README 連結不再是死的(G5 綠)。

### P1 — CI 與可信度
- [ ] **P1-1 GitHub Actions CI**:`.github/workflows/ci.yml`,push/PR 時跑 `tsc --noEmit` + `npm test` + G3 冒煙。
  驗收:推上 GitHub 後 Actions 全綠,README 掛真 badge。
- [ ] **P1-2 npm pack 演練**:`npm pack` 產 tarball,從 tarball 全域安裝後 `auto-architect generate` 可跑(補 `files` 欄位、`prepublishOnly` build)。
  驗收:tarball 安裝實測通過。發佈到 npm 要使用者的 npm 帳號,**先問使用者**。

### P2 — 核心價值(讓工具真的有用)
- [ ] **P2-1 parser 擴充**:加 Svelte/SvelteKit、Express/Fastify(API-only)、Prisma、PostgreSQL、MySQL、auth(Clerk/Auth.js/Supabase Auth)、`--name` 推斷。未識別關鍵字要警告列出,不再沉默。
  驗收:每個新關鍵字有測試;未知詞警告有測試。
- [ ] **P2-2 CLI 選項**:`--dry-run`(只印檔案清單)、`--yes`(免互動)、目標目錄非空時要確認。
  驗收:三個行為各有測試或冒煙驗證。
- [ ] **P2-3 模板品質**:Next.js 模板補齊到 `npm run build` 可過(next.config、tsconfig、globals.css + Tailwind 接線);Vite/Vue 同樣標準。
  驗收:三框架產物全部過 G4(這是本階段的硬標準)。
- [ ] **P2-4 examples/ 與 demo**:examples 目錄放三個真實產出範例 + README 加 demo GIF/asciinema。
  驗收:範例可 build;README 有動圖。

### P3 — 真 AI 解析(差異化賣點)
- [ ] **P3-1 Claude API 整合**:`ANTHROPIC_API_KEY` 存在時用 Claude 解析 prompt → ArchitectureSchema(嚴格 JSON schema 驗證),否則自動退回啟發式。**動工前必讀 `claude-api` skill**(模型 ID、結構化輸出、計費)。API key 只讀環境變數,絕不寫檔(HANDOFF §6 鐵則)。
  驗收:無 key → 行為與現在完全相同(舊測試全綠);有 key → 手動實測 3 個複雜 prompt,解析優於啟發式;錯誤/超時退回啟發式且有測試(mock)。
- [ ] **P3-2 移除裝忙 setTimeout**:真 API 有真延遲,假延遲刪掉;spinner 保留。
  驗收:G3 冒煙在無 key 時 < 1 秒完成。

### P4 — 發佈與成長(需使用者參與的都先問)
- [ ] **P4-1 npm publish v2.0.0** + git tag + CHANGELOG.md(**需使用者 npm 帳號,先問**)。
- [ ] **P4-2 GitHub 門面**:repo description、topics、social preview、Release notes(推前給使用者過目)。
- [ ] **P4-3 宣傳素材**:擬 Show HN / Reddit r/webdev 貼文草稿放 `docs/launch/`。**只擬稿,發佈由使用者決定。**

---

## 6. 狀態看板 (Status Board) — 每輪要更新

**目前進度**:v1.0 骨架完成;上傳工作流已建好並測過;**首推 (first push) 待使用者登入完成**;路線圖從 P0-1 開始全部未動工。

**任務認領表**(多 AI 並行時先寫這裡再動工;單 AI 可省):

| 任務 | 認領者 (AgentId) | 認領時間 | 狀態 |
|---|---|---|---|
| _(範例)_ P0-1 | ai/alice | 2026-07-20 21:00 | done @abc1234 |

**卡點/移交備註**:
- (無)

規則:認領後 2 小時沒有後續 commit = 視為棄單,別人可接手。完成後把該列狀態改 `done @<hash>`,並到 §5 打勾。

---

## 7. 多 AI 並行規則 (Concurrency)

機制細節在 [`AI_HANDOFF.md`](AI_HANDOFF.md) §4,這裡是行為約定:

1. **單 AI 在線** → 直接推 `main`(`scripts/upload.ps1`,自帶鎖與 rebase 重試)。
2. **多 AI 同時** → 各自 `-PerAgentBranch`(推 `ai/<id>`),認領表先佔位;由最後收尾的 AI(或使用者)把 `ai/*` merge 回 main 並跑全閘門。
3. **永不 force-push main;紅的不上傳**;衝突解不掉就照 HANDOFF 指示停下來留言。
4. 兩個 AI 不要同時碰同一個路線圖任務 — 這比解衝突便宜太多。

---

## 8. Skill 路由表 (Skill Router) — 這台環境有哪些可用技能

> ⚠️ **重要**:Skill 安裝在使用者機器/帳號上,**不在這個 repo 裡**。換機器或環境可能沒有。
> 所以:每個 session 先看系統列出的可用 skills;**有就用,沒有就照本文件手動做**(本文件的循環不依賴任何 skill 也能跑)。
> 使用者打 `/名稱` 即明確呼叫;下表描述符合時也可自動觸發。

### A. 本專案迭代的主力
| Skill | 什麼時候用 |
|---|---|
| `autopilot` | 使用者說「開始/自己跑/繼續做/我去睡了」→ 自主執行本文件 §2 循環,從 §5 認領任務往下推 |
| `execute-better` | 單一多步任務需要嚴謹的 scope→實作→驗證→報告(CLAUDE.md 已設為預設路由) |
| `max` / `MAX` | 使用者明確打 `/max`:高強度多代理把剩餘額度轉成品質(全路線圖掃一輪) |
| `ai` / `campaign-status` | 使用者說「燒 N 小時/戰役」→ 小時制排程迭代;`campaign-status` 查進度 |
| `loop` / `schedule` | 需要定時重跑(例:每小時跑一輪循環、排程夜間迭代) |
| `context-compress` | context 快滿 / 換 session 前 → 產交接摘要(寫進 §6 看板再上傳) |

### B. 品質與驗證
| Skill | 什麼時候用 |
|---|---|
| `simplify` | 每完成一個 P 階段後跑:重用/簡化/效率清理(不抓 bug) |
| `review` | 有 GitHub PR 要審(多 AI 用 ai/* 分支開 PR 時) |
| `security-review` | 動到檔案寫入、API key 處理(P3-1)之後必跑 |
| `/code-review ultra` | 使用者觸發的多代理雲端審查(AI 不能自行啟動,計費) |
| `run` | 要實際啟動/截圖確認 CLI 行為時 |
| `ai-plugins:endor-setup` | 要對依賴做漏洞掃描時(P1 CI 可考慮納入) |

### C. Skill 工程(改進技能本身)
| Skill | 什麼時候用 |
|---|---|
| `skill-forge` | 要新增/強化 skill(例:把本文件的循環做成專屬 skill) |
| `skill-dedupe-audit` | skill 多了之後去重合併 |
| `anthropic-skills:skill-creator` | 從零建 skill、跑 skill evals |
| `update-config` / `keybindings-help` / `fewer-permission-prompts` | 調 settings.json / 快捷鍵 / 減少權限彈窗 |

### D. 研究與內容產出
| Skill | 什麼時候用 |
|---|---|
| `deep-research` | P4 前研究同類工具(create-t3-app、Plop、Yeoman)差異化定位 |
| `claude-api` | **P3-1 動工前必讀**;任何提到 Claude/Anthropic API 的實作 |
| `dataviz` | 要畫任何圖表(例:README 的架構圖、star 成長圖) |
| `artifact-design` / `artifact-capabilities` | 要發佈網頁型展示(demo 頁) |
| `anthropic-skills:docx/pdf/pptx/xlsx` | 產 Word/PDF/簡報/試算表交付物時 |
| `anthropic-skills:setup-writing-style` / `consolidate-memory` / `morning` / `schedule` / `setup-cowork` | 個人工作流輔助(寫作風格/記憶整理/晨報/排程/環境設置) |

### E. 其他專案專屬 — **在本專案不要用**
| Skill | 屬於 |
|---|---|
| `grok` / `gork` | TG 頻道專案的部署診斷(systemd/DPAPI/polling) |
| `mysite` | 使用者的網站 0120.tw420.cc 檢視 |
| `overkill-*`(6 個) | Overkill Build Week 提交流程 |
| `daily-news-crawl` | 每日新聞爬蟲專案 |
| `h5-gamestudio` | H5 遊戲開發流程 |
| `anthropic-skills:sports-betting-analysis` | 運彩賠率分析 |
| `init` | 已有 CLAUDE.md,不需重建 |

---

## 9. 未來 AI 的開場白 (TL;DR)

1. 讀 `AI_HANDOFF.md`(怎麼上傳)+ 本檔(做什麼)。
2. `git pull --rebase origin main`,看 §6 看板。
3. 從 §5 挑最上面沒人做的任務,照 §2 循環:實作 → §3 閘門全綠 → 更新 §5/§6 → `scripts/upload.ps1`。
4. 卡住就記錄、回滾、交棒。**紅的不上傳,scope 不亂擴,力氣花在把勾打上。**
