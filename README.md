# 貼圖大亨 Sticker Tycoon

一個**對話優先、手機優先**的 AI LINE 貼圖製作工作室。使用者只要像和 ChatGPT 對話一樣描述想做的角色與貼圖套組，即可上傳多張角色參考圖、建立角色設定、規劃貼圖、生成獨立任務、針對某一張修改、在額度中斷後續作，並輸出 LINE 靜態貼圖 PNG 與 ZIP。

## 目前能力

| 能力 | 說明 |
| --- | --- |
| AI 對話工作室 | 中央對話、對話歷史、建議指令、聊天附件、繁體中文回覆與 projectKey 跨裝置恢復。 |
| 多圖角色理解 | 可上傳多張 JPG、PNG、WEBP、HEIC／HEIF 角色圖片；HEIC 在瀏覽器端轉成 JPEG。 |
| 角色一致性 | Gemini 3.1 Flash Image 作為多參考角色生成的優先提供者；GPT Image 2 作為語意去背、單張修改與後備。 |
| 獨立貼圖任務 | 每張貼圖具獨立 `queued`、`generating`、`completed`、`failed`、`paused_quota` 狀態；重試第 3 張不影響其他張。 |
| 中斷續作 | API 額度中斷時保存專案、對話、角色設定、初稿 checkpoint、任務狀態和已完成圖片；輸入「繼續製作」只續跑未完成工作。 |
| 統一 Provider Adapter | `generate`、`edit`、`analyze`、`healthCheck` 均透過同一伺服器端 Adapter 契約執行。Gemini 與 GPT Image 具實接；FLUX.2 因未設定使用者授權憑證而明確維持 `disabled`。 |
| Agent Model Router | 每張任務保存 Provider health、候選、已嘗試歷程、參考圖快照、品質報告與 checkpoint。新生成優先 Gemini；修改與去背採 GPT Image／可用後備，只有可轉移錯誤才 fallback。 |
| 參考圖與 Style Anchor | 上傳圖可被設為角色、已確認角色、姿勢、場景或風格參考；已接受圖與畫風錨點會在後續任務中優先排序。 |
| 整套自然語言修改 | 「全部變可愛一點」與「全部去背，背景改透明」會建立獨立 edit job 與版本；透明已合格、或仍有 queued／retrying／paused 生成工作的貼圖不會被誤排程。 |
| Quality Agent | 生成後檢查透明覆蓋、尺寸、安全邊距與文字長度，回傳 `pass`／`fail`、原因與建議。僅在確定性圖檔檢查失敗時執行一次安全 Fix → Recheck；臉部／肢體語意不會在未執行視覺模型時被誤標為已通過。 |
| 版本回復 | 每次生成／重試／修改均保存不可覆蓋版本鏈、父版本、活動版本、Provider 與品質結果；可在聊天工作室回復單張舊版本。 |
| 對話內工作狀態 | 聊天欄顯示 Agent 工作事件、最近成果、修改／下載快捷操作與規劃／續作按鈕；桌面與手機均保留獨立任務總覽。 |
| LINE Preflight | 主工作室顯示 370×320 PNG、透明背景、10 px 安全邊距、繁中 SVG 後製與 ZIP 可匯出狀態。 |
| 公開 Preview／Inspection | `/preview` 與 `/preview/inspection` 使用原創固定示範資料，展示聊天、唯讀附件／HEIC、多圖語意、規劃、版本、品質與輸出 UI；不呼叫 Studio API、不上傳檔案、不讀取私人專案。 |
| 中文文字可靠性 | 圖像模型不負責最終中文字；伺服器端用 `Noto Sans CJK TC` SVG 後製，避免亂碼、錯字與文字截斷。 |
| LINE 輸出 | 產生透明 PNG、主圖、聊天室縮圖與 ZIP；檢查 370×320、透明 alpha、偶數尺寸、單圖 1 MB、套組 60 MB 等規格。 |

## 公開 AI Inspection Preview

> **這是 AI Inspection Preview，不代表真實 AI API 生成結果。**

| 頁面 | 可直接開啟的 URL | 用途 |
| --- | --- | --- |
| Preview | [https://stickertyco-wsz8yoes.manus.space/preview](https://stickertyco-wsz8yoes.manus.space/preview) | 不登入即可查看固定 Demo 的完整 Chat-first 工作流程。 |
| Inspection | [https://stickertyco-wsz8yoes.manus.space/preview/inspection](https://stickertyco-wsz8yoes.manus.space/preview/inspection) | 提供 Desktop View 與 Mobile View，供外部 AI、開發者與測試人員檢查完整介面。 |

兩頁皆**不需要登入、API Key 或私人資料**。它們僅使用固定且非個資的兔子 Demo 圖與 React 本頁狀態；不讀取 `localStorage`、不建立專案、不上傳檔案、不呼叫 `/api/trpc` 或任何外部影像 Provider。Preview 直接復用正式工作室的 `StudioTopbar`、`StudioMessage`、`StudioComposer`、`StudioAgentWorkspace`、`StudioStickerTask`、`StudioPreflight` 與相同 `chat-studio.css`，因此不是另一套平行展示 UI。

## 技術架構

- **前端：** React 19、Tailwind 4、tRPC React、手機優先 CSS。
- **後端：** Express、tRPC 11、TypeScript。
- **資料：** MySQL／Drizzle，保存專案、對話、附件、角色／風格 Anchor、貼圖腳本、Agent 事件、Router／品質工作紀錄、可回復版本和輸出紀錄。
- **檔案：** S3；資料庫只保存檔案參照，不保存圖片 bytes。
- **圖像：** `server/imageProviders.ts` 將 Gemini Image API、GPT Image 2 與 disabled FLUX.2 接至共用 Provider Adapter；Sharp 合成 PNG、驗證 alpha、後製 LINE 文字。

## 本機啟動

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

開發伺服器會使用專案框架提供的環境設定。正式部署前，請在受管的 Secrets／Environment Variables 設定以下值，**不要建立或提交 `.env` 檔**：

| 變數 | 用途 |
| --- | --- |
| `DATABASE_URL` | MySQL／TiDB 連線。 |
| `GEMINI_API_KEY` | Gemini 3.1 Flash Image 的多參考角色生成。僅伺服器端使用。 |
| `BUILT_IN_FORGE_API_KEY`、`BUILT_IN_FORGE_API_URL` | 現有 GPT Image 2、LLM、S3 與其他平台服務。 |
| `JWT_SECRET`、OAuth 相關變數 | 使用者登入與工作室 session。 |

## 資料庫 migration

Schema 位於 `drizzle/schema.ts`。產生 migration 後，必須先閱讀 SQL，再依部署環境安全套用：

```bash
pnpm drizzle-kit generate
```

目前已新增的對話工作室資料表：`stickerConversations`、`stickerMessages`、`stickerAttachments`、`stickerCharacterProfiles`、`stickerStyleAnchors`、`stickerAgentEvents`、`stickerJobs`、`stickerExports`。第二階段 migration 為 `drizzle/0003_grey_sentinel.sql`，僅新增欄位／表格，未刪除既有資料。**第三階段未新增或變更資料 schema**：Provider health、Router、品質、Scene Reference 與整套修改皆保存於既有文字／JSON 欄位與 Agent 事件中，因此無需產生 migration。

## 測試與驗證

```bash
pnpm check
pnpm test
pnpm build

# 瀏覽器回歸
VIEWPORT=desktop node scripts/verify-chat-studio-flow.mjs
VIEWPORT=mobile node scripts/verify-chat-studio-flow.mjs
VIEWPORT=desktop node scripts/verify-preview-demo.mjs
VIEWPORT=mobile node scripts/verify-preview-demo.mjs
HEIC_FIXTURE_PATH=/path/to/sample.heic node scripts/verify-chat-heic-upload.mjs
node scripts/verify-chat-quota-resume.mjs

# 僅用於本機成功路徑驗證；絕不可設定於正式環境
STICKER_E2E_TEST_MODE=1 PORT=3001 NODE_ENV=development npx tsx server/_core/index.ts
BASE_URL=http://localhost:3001 HEIC_FIXTURE_PATH=/path/to/sample.heic node scripts/verify-android-controlled-success.mjs
```

HEIC 回歸腳本不會內建或下載任何使用者照片；請以 `HEIC_FIXTURE_PATH`（單張）或 `HEIC_FIXTURE_PATHS`（五張、以系統路徑分隔符連接）明確提供你有權使用的測試素材。測試覆蓋貼圖提示、Gemini 金鑰連線、LINE PNG／ZIP 產出、聊天建案、八張獨立任務、跨重新載入 projectKey 恢復、指定修改與整套修改、HEIC 多媒體上傳、額度暫停、Provider health／fallback、一次品質修正、參考圖角色／姿勢／場景／風格、版本 V1→V2→回復、對話內成果操作、公開 Preview／Inspection 的零 Studio API 呼叫，以及 Android 手機回歸。

`STICKER_E2E_TEST_MODE=1` 是**僅供測試**的受控圖像提供者；它讓 Android 瀏覽器可驗證真實 UI、tRPC、資料庫、S3、修改與下載成功路徑，並不會在未設定該環境變數的開發或正式環境取代 Gemini／GPT Image。

## 推送至 GitHub

### 方式 A：使用管理介面

在專案管理介面開啟 **Settings → GitHub**，連結 GitHub 帳號，建立一個新的 **Private** repository，並匯出最新 checkpoint。這是最快、最安全的做法。

### 方式 B：使用 Git 指令

目前的 `origin` 為受管平台遠端，請**不要覆寫**。在 GitHub 建立一個空的 Private repository（不要預先建立 README、License 或 `.gitignore`）後，加入第二個 remote：

```bash
cd /home/ubuntu/sticker-tycoon-replica
git remote add github https://github.com/OWNER/sticker-tycoon.git
git remote -v

git status
git add README.md docs/ research/ client/ server/ shared/ drizzle/ scripts/ package.json pnpm-lock.yaml todo.md
git commit -m "feat: chat-first LINE sticker studio"
git push -u github main
```

GitHub HTTPS 推送不可使用帳號密碼；請使用 Personal Access Token、GitHub CLI 瀏覽器登入或 SSH key。建議啟用兩步驟驗證，並對團隊專案使用 Private repository。

## 絕不可提交到 GitHub 的內容

- `.env`、API key、OAuth／JWT token、Personal Access Token。
- 使用者原始照片、私密角色圖片、暫存生成圖與 S3 presigned URL。
- `node_modules/`、`dist/`、測試 log、個人下載檔與 SQLite／本機資料庫。
- 包含敏感內容的交接包；交接包必須先檢查再放入 `docs/handover/`。

## 研究與設計文件

- [`research/chat-first-line-sticker-architecture.md`](research/chat-first-line-sticker-architecture.md)：模型比較、角色一致性、中文字策略與 LINE 規格研究。
- [`research/chat-first-line-sticker-implementation-plan.md`](research/chat-first-line-sticker-implementation-plan.md)：資料模型、任務狀態、對話編排、輸出與續作架構。
- [`research/chat-first-ui-visual-findings.md`](research/chat-first-ui-visual-findings.md)：桌面與 Android 初始視覺驗證結果。
- [`research/phase-2-model-router-research.md`](research/phase-2-model-router-research.md)：Gemini、GPT Image、FLUX.2 的可部署邊界與 Router 決策。
- [`docs/phase-2-agent-design.md`](docs/phase-2-agent-design.md)：Agent 資料模型、錯誤／fallback、品質、Anchor、版本與聊天室設計。
- [`docs/phase-3-capability-audit.md`](docs/phase-3-capability-audit.md)：第三階段 Provider、Agent、品質、Preview 與安全驗收基線。
- [`docs/phase-3-delivery.md`](docs/phase-3-delivery.md)：第三階段已交付能力、不可宣稱能力、無 migration 判斷、測試紀錄與真實 API 限制。
- [`docs/phase-4-preview-component-audit.md`](docs/phase-4-preview-component-audit.md)：正式工作室與公開 Preview 的共用元件盤點及去除平行 UI 的決策。
- [`docs/phase-4-preview-delivery.md`](docs/phase-4-preview-delivery.md)：公開 Preview／Inspection 的流程覆蓋、安全邊界與驗收紀錄。

## 重要限制

外部圖像服務可能回傳額度、速率、內容安全或暫時性錯誤。系統必須將這些錯誤視為可恢復狀態，而非刪除專案或覆蓋已完成貼圖。每個模型的角色一致性與中文視覺文字都有機率失敗，因此最終輸出使用固定角色錨點、多參考圖片、單張版本史、伺服器端中文後製與 LINE 規格檢查的組合策略。
