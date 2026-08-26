# Preview 真實畫面擷取註記

## 已檢視證據

| 檔案 | 實際渲染發現 |
| --- | --- |
| `PREVIEW-SCREENSHOTS/01-home.png` | 桌面 1280×900 首屏含深海藍 Chat-first 殼層、DEMO／PREVIEW notice、使用者與助理訊息、固定兔子附件、Character／Pose／Style Anchor、右側 LINE Preflight 與任務卡。預設 Demo stage 為 `export`，因此首屏已呈現完整流程末段的訊息，而非空白起始表單。 |
| `PREVIEW-SCREENSHOTS/mobile-03-results.png` | Android 390×844 以單欄垂直任務卡呈現；每張可見固定兔子結果、完成標籤、動作描述、Router／品質文字、PNG、修改與版本按鈕。第 3 張顯示 V2，第 6 張顯示 `Fix → Pass`；所見範圍無水平溢位。 |
| `PREVIEW-SCREENSHOTS/08-version.png` | 桌面任務區可見第 3 張 `V2` 標籤與其他卡片的 `V1` 按鈕。Demo 版版本按鈕會更新所選卡片／notice 狀態，但不渲染可回復版本歷史列；真實首頁才提供版本回復列。 |
| `PREVIEW-SCREENSHOTS/09-quality-check.png` | 桌面對話中實際顯示「第 6 張安全邊距未通過 → Auto Fix 一次 → Regenerate → Pass」；右側仍可見 LINE Preflight 與 Anchor 卡，品質循環是固定 Demo 文案與狀態。 |
| `PREVIEW-SCREENSHOTS/tablet-01-workspace.png` | 768×1024 平板將 8 張任務改為兩欄格線，Anchor 與 Preflight 位於其上方；卡片控制仍可見，所見範圍未出現橫向捲動列。 |
| `PREVIEW-SCREENSHOTS/inspection-mobile.png` | Inspection 的 Mobile View 以窄欄裝置容器置中顯示同一套元件。此擷取範圍可見對話文字與任務區在容器轉換位置有視覺重疊／裁切感，應在 Responsive Report 列為檢查發現，而非宣稱其無缺陷。 |

這些檔案均由 `scripts/capture-preview-inspection.mjs` 以真實 `/preview` 瀏覽器頁面擷取；它們不是 Figma、設計稿或人工繪製畫面。

另於公開匿名網址重新開啟 Preview，所見 DEMO notice、八張任務、第 3 張 V2、第 6 張 `Fix → Pass`、quota、LINE Preflight 與截圖／報告相符；其瀏覽器資源清單經 Provider／tRPC 關鍵字篩選後為空。

於 2026-08-26（GMT+8）將僅文件、PNG 與擷取腳本正常提交至 `chat-first-studio` 後，再以匿名瀏覽器重新開啟 `/preview` 與 `/preview/inspection`。兩頁仍分別顯示既有 DEMO notice、示範聊天、八張任務、LINE Preflight，以及 Inspection 的 Desktop View／Mobile View；此次文件整合沒有修改 client、server、schema 或網站設定檔。
