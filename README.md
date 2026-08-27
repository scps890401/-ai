# -ai

## 隨心所遇 — Phase 2 AI Core & Agent Framework

> **目前狀態：完成可互動的 Chat-first UI 與伺服器端 AI Core；網站尚未發布。**

本分支以 `phase1-chat-ui` 為基礎，保存「隨心所遇」第二階段的完整原始碼。產品仍維持首次開啟時僅呈現極簡 AI Composer 與品牌引導；送出第一則訊息後，畫面進入對話狀態，Composer 會平滑固定至底部。Phase 2 在不改變這個介面原則下，加入安全的伺服器端 AI Router、資料庫上下文記憶、SSE 串流與企劃層工具呼叫骨幹。

| 範圍 | 已完成內容 |
| --- | --- |
| Chat-first UI | Landing / Active Chat 雙狀態、底部固定 Composer、自動捲動、Desktop 與 Android 尺寸響應式調整。 |
| Composer 與訊息 | 自動增高多行輸入、Enter / Shift + Enter、附件預覽、送出／停止狀態、Markdown 與訊息操作。 |
| 真實串流 | `POST /api/chat` 以 SSE 傳回文字增量、工具事件、Fallback 狀態與完成事件，前端以串流 Hook 渲染。 |
| AI Router | Vercel AI SDK Core；預設 Gemini 主模型、OpenAI 備援模型、12 秒 Provider timeout、失敗時自動切換。 |
| Context Memory | MySQL / Drizzle 的 `threads` 與 `messages`，每次帶入最近 20 則訊息，重新整理後可載回同一 Thread。 |
| Tool Calling | `plan_sticker_pack(topic, character_description, count)` 會回傳結構化企劃草稿，再由 AI 整理自然語言回覆。 |
| 多模態預留 | 附件以 Data URL 或 S3 URL 的中繼資料保存；圖片附件可進入伺服器端模型訊息。 |

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `client/src/pages/` | 頁面層與 Landing / Active Chat 狀態流程。 |
| `client/src/components/chat/` | `AIComposer`、`AttachmentPreview`、`ChatMessage`、`MessageList` 與訊息型別。 |
| `client/src/components/ui/` | 可重用的基礎 UI 元件。 |
| `client/src/index.css` | 全域樣式、設計 Token、字體、動態與響應式規則。 |
| `server/ai/` | System Prompt、Provider Router、Fallback 與可執行／預留 Tool Registry。 |
| `server/chatApi.ts` | 同源 SSE Chat API、Thread 載入與對話持久化協調。 |
| `server/db.ts`、`drizzle/` | Drizzle schema、遷移與資料庫讀寫輔助。 |
| `shared/chat.ts` | 前後端共用的附件、工具呼叫與持久化訊息契約。 |
| `package.json`、`vite.config.ts`、`tsconfig*.json`、`components.json` | 建置、型別、元件與工具設定。 |

## 本機啟動

```bash
pnpm install
pnpm dev
```

啟動前請將 `.env.example` 複製為 `.env`，只在伺服器端設定自己的 Provider 金鑰。請先套用資料庫遷移：

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

如需建立正式產物，可執行：

```bash
pnpm build
```

## 安全與同步原則

此分支**不包含** `.env`、API Keys、Secrets、建置產物、執行記錄、平台專案設定或私人資料。`GOOGLE_GENERATIVE_AI_API_KEY`、`OPENAI_API_KEY` 與模型 Router 設定只會在伺服器環境讀取；瀏覽器不會取得 Provider URL 或金鑰。介面中的抽象品牌素材以受管理的靜態資產 URL 參照；正式產品接管或外部部署前，應換成自有的資產託管位置。

## 尚未完成

本階段**不會**呼叫任何圖片生成、編輯、裁切、去背、透明化、壓縮或 ZIP 匯出服務；`generate_sticker_image` 與 `edit_sticker_image` 只保留為不可執行的介面。貼圖藝廊、畫廊卡片、相簿 UI、Dashboard、任務面板、Character / Style Anchor、Model Router UI 與複雜設定均未加入。

下一階段可擴充受控的檔案上傳至 S3、對話帳號歸屬、工具審核、可觀測性、重試／重新產生流程，以及經確認後的真實圖片生成工作流。
