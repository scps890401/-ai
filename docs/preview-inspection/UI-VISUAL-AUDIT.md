# UI 視覺稽核：目前實際 Preview

> **證據範圍：** 本稽核根據 `PREVIEW-SCREENSHOTS/` 內 18 張由真實瀏覽器開啟 `/preview` 與 `/preview/inspection` 所擷取的 PNG，以及同一組畫面的 manifest 與報告。它不是設計評估稿，也不推論未實作的功能。

## 稽核結論摘要

目前 Preview 是一個**深色、工作室取向的 Chat-first 介面**。Desktop 以對話欄加任務側欄呈現，Android 則將任務卡改為單欄瀏覽。它在「以自然語言開始、在訊息旁查看 Agent 狀態、接著操作產出物」的概念上接近 ChatGPT、Gemini 與 Manus 的工作習慣；但其明確的 LINE 貼圖任務面板、Anchor、Preflight 與卡片式素材操作，使它不是其中任何產品的複製品。

## 12 項實際視覺觀察

| 面向 | 截圖中的實際呈現 | 客觀評估 | 證據 |
| --- | --- | --- | --- |
| 1. 整體 UI | 深海藍底、青藍／紫色點綴、圓角卡片、細描邊與發光漸層；桌面採左對話、右工作成果。 | 視覺語言一致，產品辨識度清楚；資訊密度在完整 Demo 狀態偏高。 | `01-home.png`、`06-results.png` |
| 2. Chat-first 介面 | 使用者訊息靠右，助理訊息靠左，圖示 avatar 與對話氣泡清楚分離。 | 對話主軸可辨識，但預設直接進入完整 export-stage，首看會同時看到大量歷史訊息與成果。 | `01-home.png`、`02-chat.png` |
| 3. 輸入框 | Composer 包含左側附件圖示、textarea 與漸層送出按鈕；固定附件列在其上方。 | 結構接近一般 AI 對話輸入模式；Preview 字樣已說明其只改本頁 Demo 狀態。 | `02-chat.png`、`mobile-02-chat.png` |
| 4. 圖片／檔案按鈕 | 附件圖示、角色／HEIC 姿勢／風格 chips 與訊息中的兔子縮圖均可見。 | 視覺上容易理解為上傳工作流；但 Preview 是 **DEMO_ONLY**，按鈕不開啟真實檔案選擇器。 | `01-home.png`、`03-ai-response.png` |
| 5. AI 回覆區 | 助理以完整句子說明 Character Anchor、姿勢、Style、品質與 quota 流程。 | 文案流程完整，易供稽核；固定流程訊息也使其不像真實流式聊天。 | `01-home.png`、`09-quality-check.png` |
| 6. 快捷操作 | Agent Workspace 有 8／16／24／32／40 張、整套修改、續作、規劃、開始與品質／quota 按鈕。 | 適合快速探索貼圖工作流；同一張卡有多組操作，初次使用者可能需要更強的主要／次要動作層級。 | `04-sticker-plan.png`、`08-version.png` |
| 7. 圖片展示 | 所有示範縮圖使用同一固定白兔素材，保留透明棋盤底。 | 能清楚說明圖卡位置與透明背景概念；不能作為角色一致性或生成品質的證據。 | `01-home.png`、`06-results.png` |
| 8. 貼圖展示 | 每張卡都有序號、動作、文字、Router／品質列、完成狀態、PNG、修改、版本；第 3 張是 V2，第 6 張顯示 Fix → Pass。 | 資訊與操作靠近各卡，利於逐張核對；Desktop 右欄卡片高度使一次只能查看部分八張。 | `06-results.png`、`mobile-03-results.png` |
| 9. 修改操作 | 「告訴 AI 修改」與 V1／V2 直接置於每張卡；編輯截圖帶出第 3 張 V2。 | 可辨識單張修改入口；Preview 按下後只改本機示範狀態，沒有真實影像變更或版本回復列。 | `07-edit.png`、`08-version.png`、`mobile-04-edit.png` |
| 10. 生成進度 | Agent 標題與卡片狀態呈現 0／5／8 張以及等待、生成、完成。 | 進度狀態具備可見層級；這些數字是固定 stage，不是後端 job 進度。 | `04-sticker-plan.png`、`05-generation.png` |
| 11. 手機版 | 390px 寬度改單欄卡片，品牌與 Inspection 連結保留；卡片內操作換行。 | 所見結果區未有水平捲動；小型 PNG／修改／版本控制密度偏高，建議實機再驗證觸控間距。 | `mobile-01-home.png` 至 `mobile-05-export.png` |
| 12. Desktop 版 | 1280px 顯示兩欄、固定上方導覽、完整 Chat／Task 工作流。 | 適合檢查對話與成果並列；右欄較窄，長 Router／品質文案以小字呈現。 | `01-home.png` 至 `10-export.png` |

## 與 ChatGPT、Gemini、Manus 的概念比較

| 比較面向 | 相似之處 | 不同之處 |
| --- | --- | --- |
| ChatGPT | 以單一自然語言 Composer 開始、左右訊息氣泡、助理回覆帶引導。 | Preview 同時固定露出任務管理、貼圖卡與輸出面板；不是純對話串。 |
| Gemini | 以多模態附件作為工作流入口，並以提示與快捷操作協助規劃。 | Preview 的附件、Provider 與生成說明全為 Demo，不執行多模態分析或模型呼叫。 |
| Manus | 有 Agent Workspace、任務狀態、輸出／檢查導向的工作台概念。 | Preview 不顯示真正工具執行日誌、檔案處理或可續作 job；只模擬其視覺流程。 |

> 結論：目前在**互動概念**上接近上述 AI 工作介面的「對話驅動工作流」，但不應宣稱與任一產品「完全一樣」，更不應把 Preview 的固定資料視為實際 Agent 執行。

## 可改善項目

| 優先級 | 可觀察問題 | 具體改善方向 |
| --- | --- | --- |
| 高 | Inspection 的 Mobile View 在 `inspection-mobile.png` 可見對話與任務區有重疊／裁切感。 | 調整嵌入容器的 overflow、寬度與內部斷點後，重新擷取同一張證據。 |
| 高 | Preview 預設在 export-stage，首次畫面同時出現大量對話、八張任務與 Preflight。 | 增加「從起始需求觀看」與「查看完成範例」兩個明確 Demo 入口，減少首屏認知負荷。 |
| 中 | Android 任務卡內的 PNG、修改、版本控制較小且密集。 | 提高觸控目標至約 44px，或以卡片的更多操作面板收納次要按鈕。 |
| 中 | 固定兔子素材重複出現在所有卡片，容易被誤讀為真實八張生成結果。 | 在每張卡加上簡短 `固定示範圖` 標籤，並在輸出區保留已有的 Demo 提示。 |
| 中 | 快捷操作多且並列，規劃／開始／品質／quota 均有相近權重。 | 將「開始製作」設定為主要按鈕，其餘收於次級操作或以流程階段逐步顯示。 |
| 低 | Desktop 右欄 Router／品質文字較小。 | 在卡片展開或 tooltip 顯示完整 Router／品質資訊，保留列表掃讀效率。 |

## 本稽核的邊界

此檔只檢查已截取的視覺與前端互動概念。它**沒有**驗證真實 LLM、影像生成、檔案上傳、Provider fallback、版本還原或 PNG／ZIP 下載；這些在 Preview 中維持 `DEMO_ONLY` 或 `NOT_IMPLEMENTED`，詳見 [`PREVIEW-REPORT.md`](PREVIEW-REPORT.md)。
