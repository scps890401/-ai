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
| Agent Model Router | 每張任務保存 Provider 候選、已嘗試歷程、參考圖快照、品質報告與 checkpoint。新生成優先 Gemini；單張編修優先 GPT Image；FLUX.2 僅作為尚未設定憑證的候選，不宣稱已啟用。 |
| 參考圖與 Style Anchor | 上傳圖可被設為角色、已確認角色、姿勢或風格參考；已接受圖與畫風錨點會在後續任務中優先排序。 |
| 版本回復 | 每次生成／重試／修改均保存不可覆蓋版本鏈、父版本、活動版本、Provider 與品質結果；可在聊天工作室回復單張舊版本。 |
| 對話內工作狀態 | 聊天欄顯示 Agent 工作事件、最近成果、修改／下載快捷操作與規劃／續作按鈕；桌面與手機均保留獨立任務總覽。 |
| 中文文字可靠性 | 圖像模型不負責最終中文字；伺服器端用 `Noto Sans CJK TC` SVG 後製，避免亂碼、錯字與文字截斷。 |
| LINE 輸出 | 產生透明 PNG、主圖、聊天室縮圖與 ZIP；檢查 370×320、透明 alpha、偶數尺寸、單圖 1 MB、套組 60 MB 等規格。 |

## 技術架構

- **前端：** React 19、Tailwind 4、tRPC React、手機優先 CSS。
- **後端：** Express、tRPC 11、TypeScript。
- **資料：** MySQL／Drizzle，保存專案、對話、附件、角色／風格 Anchor、貼圖腳本、Agent 事件、Router／品質工作紀錄、可回復版本和輸出紀錄。
- **檔案：** S3；資料庫只保存檔案參照，不保存圖片 bytes。
- **圖像：** Gemini Image API 生成角色初稿；GPT Image 2 去背與修改；Sharp 合成 PNG、驗證 alpha、後製 LINE 文字。

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

目前已新增的對話工作室資料表：`stickerConversations`、`stickerMessages`、`stickerAttachments`、`stickerCharacterProfiles`、`stickerStyleAnchors`、`stickerAgentEvents`、`stickerJobs`、`stickerExports`。第二階段 migration 為 `drizzle/0003_grey_sentinel.sql`，僅新增欄位／表格，未刪除既有資料。

## 測試與驗證

```bash
pnpm check
pnpm test
pnpm build

# 瀏覽器回歸
node scripts/verify-chat-studio-flow.mjs
VIEWPORT=desktop node scripts/verify-chat-studio-flow.mjs
HEIC_FIXTURE_PATH=/path/to/sample.heic node scripts/verify-chat-heic-upload.mjs
node scripts/verify-chat-quota-resume.mjs

# 僅用於本機成功路徑驗證；絕不可設定於正式環境
STICKER_E2E_TEST_MODE=1 PORT=3001 NODE_ENV=development npx tsx server/_core/index.ts
BASE_URL=http://localhost:3001 HEIC_FIXTURE_PATH=/path/to/sample.heic node scripts/verify-android-controlled-success.mjs
```

HEIC 回歸腳本不會內建或下載任何使用者照片；請以 `HEIC_FIXTURE_PATH`（單張）或 `HEIC_FIXTURE_PATHS`（五張、以系統路徑分隔符連接）明確提供你有權使用的測試素材。測試覆蓋貼圖提示、Gemini 金鑰連線、LINE PNG／ZIP 產出、聊天建案、八張獨立任務、跨重新載入 projectKey 恢復、指定修改入口、HEIC 多媒體上傳、額度暫停、Model Router、參考圖角色切換、版本 V1→V2→回復、對話內成果操作與 Android 手機回歸。

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

## 重要限制

外部圖像服務可能回傳額度、速率、內容安全或暫時性錯誤。系統必須將這些錯誤視為可恢復狀態，而非刪除專案或覆蓋已完成貼圖。每個模型的角色一致性與中文視覺文字都有機率失敗，因此最終輸出使用固定角色錨點、多參考圖片、單張版本史、伺服器端中文後製與 LINE 規格檢查的組合策略。
