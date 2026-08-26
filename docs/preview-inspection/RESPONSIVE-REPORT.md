# Preview 響應式實際檢查報告

## 檢查方法

本報告採用目前 CSS 斷點與真實瀏覽器擷取畫面：Desktop 1280×900、Tablet 768×1024、Android Mobile 390×844。截圖位於 `PREVIEW-SCREENSHOTS/`，不是設計稿。

| 範圍 | CSS 實際規則 |
| --- | --- |
| 大於 900px | `.chat-layout` 為左側彈性對話欄與右側 `310–390px` 任務面板的兩欄 grid。 |
| 900px 以下 | `.chat-layout` 改單欄；任務面板移至對話區下方；`.task-grid` 為兩欄。 |
| 560px 以下 | Topbar 高度 61px、左右 padding 14px；`.task-grid` 改一欄；任務卡圖片欄為 92px。 |

## Desktop：1280×900

| 項目 | 實際觀察 | 狀態 |
| --- | --- | --- |
| 導航 | Topbar 左側品牌，右側 DEMO badge 與 Inspection；sticky。 | **通過** |
| 對話與輸入框 | 左欄顯示訊息、Agent Workspace、Composer；textarea 與附件按鈕可見。 | **通過** |
| 圖片與貼圖 Grid | 右欄顯示 Preflight、Anchor 與單欄任務卡；同畫面可見多張結果。 | **通過** |
| 按鈕／Download | LINE ZIP、PNG、每張 PNG、修改、版本可見；僅 Demo notice，不下載。 | **符合 Demo 邊界** |
| 水平滑動 | 擷取畫面未見主內容水平捲動。 | **所見範圍通過** |

證據：`01-home.png`、`06-results.png`、`09-quality-check.png`、`10-export.png`。

## Tablet：768×1024

| 項目 | 實際觀察 | 狀態 |
| --- | --- | --- |
| 導航 | 品牌、DEMO badge 與 Inspection 仍可見於同列。 | **通過** |
| 對話與輸入框 | 依 CSS 轉為任務面板在對話後的單列流程；本擷取聚焦任務區。 | **可用** |
| 圖片與貼圖 Grid | 八張任務為兩欄，卡片內容、PNG、修改與版本按鈕可見。 | **通過** |
| Download | 輸出按鈕為 Demo only。 | **符合 Demo 邊界** |
| 水平滑動 | `tablet-01-workspace.png` 未見水平捲動列或卡片截斷。 | **所見範圍通過** |

證據：`tablet-01-workspace.png`。

## Android Mobile：390×844

| 項目 | 實際觀察 | 狀態 |
| --- | --- | --- |
| 導航 | 高度縮至 61px，左右 padding 縮小；Inspection 連結保留。 | **通過** |
| 對話與輸入框 | 對話單欄；Composer 具附件按鈕、textarea、送出按鈕。 | **通過** |
| 圖片與貼圖 Grid | 任務卡改一欄，固定兔子圖與各控制在卡內換行。 | **通過** |
| 按鈕 | 每張任務卡仍有 PNG、修改、版本；觸控按鈕較小但可見。 | **可用；建議後續實機檢查觸控間距** |
| Download | 可見匯出控制，但不產生檔案。 | **DEMO_ONLY** |
| 水平滑動 | `mobile-03-results.png`、`mobile-05-export.png` 的所見範圍未見水平捲動。 | **所見範圍通過** |

證據：`mobile-01-home.png`、`mobile-02-chat.png`、`mobile-03-results.png`、`mobile-04-edit.png`、`mobile-05-export.png`。

## Inspection 的 Mobile View

Inspection 的 Mobile View 是在桌面頁面中以 `.inspection-device.mobile` 顯示窄欄容器，不是瀏覽器真的改成 390px viewport。`inspection-mobile.png` 可見容器置中與任務卡，但在此擷取位置出現對話文字與任務區重疊／裁切感。此項列為**待修正的實際視覺發現**，不可標記為無缺陷。

| 風險 | 影響 | 建議驗證 |
| --- | --- | --- |
| Inspection Mobile View 的內容重疊／裁切感 | 外部 AI 或開發者閱讀模擬手機畫面時可讀性下降。 | 調整 `.inspection-device.mobile` 的 overflow／內嵌工作區尺寸後，重新擷取 `inspection-mobile.png`。 |
| Android 按鈕密度 | 任務卡小型控制在實機觸控時可能偏密。 | 用 Android 真機或 390px 自動化逐一點擊 PNG、修改、版本與 Composer。 |
