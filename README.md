# -ai

## 隨心所遇 — Phase 1 Chat-first UI

> **目前狀態：完成可互動的前端 Chat-first 框架，尚未發布，且未串接正式 AI 服務。**

本分支保存「隨心所遇」第一階段的完整前端原始碼。產品在首次開啟時僅呈現一個極簡 AI Composer 與品牌引導；送出第一則訊息後，畫面進入對話狀態，Composer 會平滑固定至底部。此階段刻意不包含貼圖製作、Dashboard、任務面板、Character / Style Anchor、Model Router、生圖或複雜設定。

| 範圍 | 已完成內容 |
| --- | --- |
| Landing State | 品牌、極簡標語、核心 Composer、暖紙質感背景與「靜水編輯室」視覺方向。 |
| Active Chat State | 訊息串、平滑狀態轉換、底部固定 Composer、訊息自動捲動。 |
| Composer | 自動增高多行輸入、Enter 送出、Shift + Enter 換行、附件選取與預覽、送出／停止狀態。 |
| 訊息 UI | 使用者訊息、Mock Streaming、標題／粗體／列表／程式碼區塊等基本 Markdown、複製與重新產生控制項。 |
| 響應式 | 已按桌面與行動裝置的安全區域、欄寬與觸控操作進行調整。 |

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `client/src/pages/` | 頁面層與 Landing / Active Chat 狀態流程。 |
| `client/src/components/chat/` | `AIComposer`、`AttachmentPreview`、`ChatMessage`、`MessageList` 與訊息型別。 |
| `client/src/components/ui/` | 可重用的基礎 UI 元件。 |
| `client/src/index.css` | 全域樣式、設計 Token、字體、動態與響應式規則。 |
| `server/`、`shared/` | 靜態專案模板的相容性結構，保留供後續階段擴充。 |
| `package.json`、`vite.config.ts`、`tsconfig*.json`、`components.json` | 建置、型別、元件與工具設定。 |

## 本機啟動

```bash
pnpm install
pnpm dev
```

如需建立正式產物，可執行：

```bash
pnpm build
```

## 安全與同步原則

此分支**不包含** `.env`、API Keys、Secrets、建置產物、執行記錄、平台專案設定或私人資料。介面中的抽象品牌素材以受管理的靜態資產 URL 參照；正式產品接管或外部部署前，應換成自有的資產託管位置。

## 尚未完成

Phase 1 僅提供前端互動與 Mock Streaming。正式串流 AI API、持久化對話、使用者帳號、檔案上傳儲存、真實附件解析、錯誤狀態與 Phase 2 的 Agent／圖片能力均尚未實作。
