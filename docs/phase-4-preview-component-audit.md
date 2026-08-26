# 第四階段：公開 AI Inspection Preview 元件盤點

## 結論

既有 `/preview` 已具備固定資料、匿名路由與零 Studio API 回歸，但使用獨立 `preview-demo.css` 與平行卡片結構，未能充分反映正式 `/` 工作室的聊天、任務、版本與 Preflight 視覺。第四階段將 Preview 改為以正式 `chat-studio.css` 的版面類別和抽出的共用視覺元件渲染，僅替換資料供應層與事件處理。

| 正式工作室面向 | 原 Preview 狀態 | 第四階段處置 |
| --- | --- | --- |
| Topbar、品牌、Preview 導覽 | 視覺相近但為獨立 markup | 抽出共用 `StudioTopbar`，正式頁與 Preview 使用同一元件。 |
| Chat message 與附件 | 獨立 `.chat-note` | 抽出共用 `StudioMessage`；Demo 以固定 user／assistant 內容、附件列與 Anchor 事件填入。 |
| Composer | 獨立單行 input | 抽出共用 `StudioComposer`；Demo 使用相同上傳按鈕、textarea、送出按鈕，但事件只更新本機狀態。 |
| Agent Workspace | 獨立 timeline | 抽出共用 `StudioAgentWorkspace`；顯示 8／16／24／32／40、上傳角色、AI 規劃、開始製作與 Router health。 |
| Sticker task、版本、編輯、下載 | 僅聚焦單張結果 | 抽出共用 `StudioStickerTask`，Preview 呈現八張任務與 V2、重試、下載、版本本機互動。 |
| LINE Preflight | 獨立 Preview 版卡片 | 抽出共用 `StudioPreflight`，正式工作室與 Demo 呈現同一摘要。 |
| Inspection | 純資訊卡 | 嵌入同一 Demo 工作室，以 Desktop／Mobile 容器切換，同時顯示 Router、Retry、Quality、quota checkpoint 觀測資料。 |

## 安全不變量

Preview 與 Inspection 不引入 tRPC hook、fetch、檔案 input 或 Provider 呼叫。所有按鈕只更新 React 記憶體狀態；示範兔子是固定原創素材，所有訊息、品質、版本、Router 與 checkpoint 都是預先定義的非個資資料。每次回歸都必須攔截並拒絕 `/api/trpc`、外部影像端點與未預期網路請求。
