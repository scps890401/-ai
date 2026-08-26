# 真實 Preview 截圖索引

> 全部 18 張 PNG 由 `scripts/capture-preview-inspection.mjs` 以真實瀏覽器開啟 `/preview` 與 `/preview/inspection` 擷取。它們不是設計稿、mockup 或重新繪製畫面。

| # | 檔名 | 畫面名稱 | 裝置／尺寸 | 路由 | 畫面用途 |
| --- | --- | --- | --- | --- | --- |
| 1 | `01-home.png` | Preview 首頁 | Desktop · 1280×900 | `/preview` | 預設 export-stage、DEMO notice、聊天、Anchor、Preflight 與任務側欄。 |
| 2 | `02-chat.png` | Chat 對話 | Desktop · 1280×900 | `/preview` | 固定使用者／助理訊息與 Composer 流程。 |
| 3 | `03-ai-response.png` | AI 規劃回覆 | Desktop · 1280×900 | `/preview` | 點 AI 自動規劃後的固定角色分析與 Anchor 畫面。 |
| 4 | `04-sticker-plan.png` | 貼圖規劃 | Desktop · 1280×900 | `/preview` | Agent Workspace、張數快捷操作與生成 stage。 |
| 5 | `05-generation.png` | 生成進度 | Desktop · 1280×900 | `/preview` | 固定完成、生成與等待任務狀態。 |
| 6 | `06-results.png` | 貼圖結果 | Desktop · 1280×900 | `/preview` | 八張固定結果卡、PNG、修改與版本控制。 |
| 7 | `07-edit.png` | 單張修改 | Desktop · 1280×900 | `/preview` | 點第 3 張修改後的本機 Demo 狀態。 |
| 8 | `08-version.png` | 版本 | Desktop · 1280×900 | `/preview` | 第 3 張 V2 與其他 V1 按鈕。 |
| 9 | `09-quality-check.png` | 品質檢查 | Desktop · 1280×900 | `/preview` | 第 6 張 Fail → Auto Fix → Regenerate → Pass 訊息。 |
| 10 | `10-export.png` | LINE 匯出 | Desktop · 1280×900 | `/preview` | LINE Preflight、PNG 與 LINE ZIP 的 Demo 控制。 |
| 11 | `tablet-01-workspace.png` | 平板工作區 | Tablet · 768×1024 | `/preview` | 兩欄貼圖 Grid、Anchor 與工作區斷點。 |
| 12 | `mobile-01-home.png` | 手機首頁 | Android · 390×844 | `/preview` | 390px 初始 Preview 視窗。 |
| 13 | `mobile-02-chat.png` | 手機對話 | Android · 390×844 | `/preview` | 單欄對話、Agent 與 Composer。 |
| 14 | `mobile-03-results.png` | 手機貼圖結果 | Android · 390×844 | `/preview` | 單欄任務卡、V2 與 Fix → Pass。 |
| 15 | `mobile-04-edit.png` | 手機修改 | Android · 390×844 | `/preview` | 手機版第 3 張本機修改狀態。 |
| 16 | `mobile-05-export.png` | 手機匯出 | Android · 390×844 | `/preview` | 手機版 Preflight 與固定匯出控制。 |
| 17 | `inspection-desktop.png` | Inspection Desktop View | Desktop · 1280×900 | `/preview/inspection` | 開發者檢查頁的桌面容器與摘要。 |
| 18 | `inspection-mobile.png` | Inspection Mobile View | Desktop host · 1280×900 | `/preview/inspection` | 點 Mobile View 後的窄欄模擬容器；供檢查重疊／裁切觀察。 |

截圖相對路徑均為 `PREVIEW-SCREENSHOTS/<檔名>`。每個畫面對應的固定 Demo 行為與功能分級，請交叉參照 [`PREVIEW-MANIFEST.json`](PREVIEW-MANIFEST.json) 與 [`PREVIEW-REPORT.md`](PREVIEW-REPORT.md)。
