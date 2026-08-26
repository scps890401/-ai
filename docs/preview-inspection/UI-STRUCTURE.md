# Preview 實際 UI／DOM 結構

> 下列結構依 `client/src/App.tsx`、`client/src/pages/Preview.tsx` 與 `client/src/components/StudioSharedUI.tsx` 的目前程式碼整理；名稱優先採用實際 React 元件與實際 CSS class。

```text
App
└── ErrorBoundary
    └── ThemeProvider → TooltipProvider → Toaster → Router (wouter Switch)
        ├── / → Home（正式工作室，不是本檢查包的 Preview 行為依據）
        ├── /preview → PreviewPage → <Preview />
        │   └── DemoWorkspace
        │       └── main.chat-studio-shell.preview-shell
        │           ├── StudioTopbar(demo)
        │           │   ├── .chat-brand
        │           │   └── .topbar-actions
        │           │       ├── .preview-mode-badge
        │           │       └── Link(/preview/inspection)
        │           ├── Notice[DEMO / PREVIEW]
        │           ├── section.chat-layout.preview-chat-layout
        │           │   ├── div.conversation-column
        │           │   │   ├── DemoConversation(stage)
        │           │   │   │   └── div.message-list.preview-message-list
        │           │   │   │       └── StudioMessage × stage-dependent count
        │           │   │   │           ├── article.chat-message.user
        │           │   │   │           └── article.chat-message.assistant
        │           │   │   ├── StudioAgentWorkspace(demo)
        │           │   │   │   ├── section.agent-inline-card
        │           │   │   │   ├── .provider-health
        │           │   │   │   └── .agent-quick-actions (附件、8/16/24/32/40、整套修改、續作)
        │           │   │   ├── div.demo-workflow-actions
        │           │   │   │   ├── AI 自動規劃
        │           │   │   │   ├── 開始製作
        │           │   │   │   ├── 查看品質循環
        │           │   │   │   └── Quota checkpoint
        │           │   │   └── StudioComposer(demo)
        │           │   │       ├── div.queued-files (3 個固定附件)
        │           │   │       └── div.composer
        │           │   │           ├── button.attach-button
        │           │   │           ├── textarea[aria-label="示範聊天輸入"]
        │           │   │           └── button.send-button
        │           │   └── aside.task-panel
        │           │       ├── .task-panel-head + StudioDemoExport
        │           │       ├── StudioPreflight(demo)
        │           │       ├── section.reference-tray (stage ≥ analysis)
        │           │       │   └── .reference-card × 3（Character／Pose／Style）
        │           │       ├── div.task-grid
        │           │       │   └── StudioStickerTask × 8
        │           │       │       ├── .task-image + .task-status
        │           │       │       ├── .task-meta + .task-router
        │           │       │       └── .task-actions（PNG、修改、V1/V2；必要時重試）
        │           │       └── div.preview-selected-note
        │           ├── Notice[互動結果；只在 notice 非空時出現]
        │           └── footer.preview-footer
        │               └── Link(/preview/inspection)
        └── /preview/inspection → PreviewInspection → <Preview inspection />
            └── main.chat-studio-shell.inspection-shell
                ├── StudioTopbar(demo)
                ├── Notice[Inspection 安全邊界]
                ├── section.inspection-intro
                │   └── div.inspection-switch
                │       ├── Desktop View button
                │       └── Mobile View button
                ├── section.inspection-device.desktop | .mobile
                │   └── DemoWorkspace(embedded)
                ├── section.inspection-details
                │   ├── Selected Model／Fallback
                │   ├── Quality Check／Retry
                │   └── Quota／Resume／Export
                └── div.inspection-footer
```

## 真實狀態資料流

`DemoWorkspace` 只有四個本頁 React state：`stage`、`input`、`notice`、`selected`。`pushStage()`、`sendDemo()`、各按鈕 handler 只更新這些 state；`scriptRows` 由固定片語、固定動作與 stage 推導。此路徑沒有 tRPC hook、`fetch`、登入 hook、`localStorage`、檔案 input 或 Provider Adapter 呼叫。

| 元件 | Preview 中的資料來源 | 真實 I/O |
| --- | --- | --- |
| `StudioMessage` | 固定 JSX 文案與 `previewAttachments` | 無。 |
| `StudioComposer` | `input` state、三個固定附件 | 無；attach handler 只切換 stage。 |
| `StudioAgentWorkspace` | 固定 Provider 狀態與 button handler | 無；8/16/24/32/40 只改 Demo stage／notice。 |
| `StudioStickerTask` | `scriptRows`、固定兔子圖、固定 V1/V2 文案 | 無；修改、版本、PNG 按鈕只改本頁 state。 |
| `StudioPreflight` | stage 推導的數字與固定 Demo 項目 | 無；不分析真實 PNG。 |
| `StudioDemoExport` | `onPng`、`onZip` notice handler | 無；不建立下載檔。 |

## 與正式工作室的邊界

Preview 與正式首頁共用 `StudioTopbar`、`StudioMessage`、`StudioAgentWorkspace`、`StudioComposer`、`StudioPreflight`、`StudioStickerTask` 與 `chat-studio.css`，因此視覺元件是真實共用元件。**這不代表 Preview 的資料操作等同正式首頁。**正式首頁才注入真實 tRPC、檔案選擇、上傳、專案、任務、版本與匯出 handler；Preview 明確傳入 `demo` 與本頁 handler。
