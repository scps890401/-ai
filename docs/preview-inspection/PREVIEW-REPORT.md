# Preview 實際畫面報告

> **範圍：** 本文件只描述目前實際運行的 `/preview` 與 `/preview/inspection`。所有畫面證據均由 `scripts/capture-preview-inspection.mjs` 在目前瀏覽器渲染的頁面擷取，非設計稿、Figma 或人工繪圖。

## 版本與預設畫面

| 項目 | 實際狀態 |
| --- | --- |
| Preview URL | `https://stickertyco-wsz8yoes.manus.space/preview` |
| Inspection URL | `https://stickertyco-wsz8yoes.manus.space/preview/inspection` |
| 預設 Demo stage | `export`；初次載入已呈現完整八張結果與 LINE 匯出末段，不是空白起始頁。 |
| 固定示範角色 | 三個附件與八張貼圖卡都使用固定非個資兔子圖 `/manus-storage/preview-demo-rabbit_4aabab59.png`。 |
| 狀態邊界 | Preview 的控制僅改變 React 記憶體中的 `stage`、`input`、`notice`、`selected`；不建立專案、不登入、不上傳、不呼叫 tRPC 或影像 Provider。 |

於 2026-08-26（GMT+8）以未登入瀏覽器重新開啟公開 Preview 並以瀏覽器 `performance` 資源清單篩選 `/api/trpc`、Gemini、GPT Image、Forge、FLUX 等端點，結果為空陣列。此為當次公開頁的網路邊界觀察；固定 Demo 的成功文案不代表任何真實影像 API 成功。

## 依使用者看到的順序

| 順序與實際 UI | 使用者看到什麼 | 可操作什麼 | Preview 狀態 | 真實連接狀態 |
| --- | --- | --- | --- | --- |
| 1. 首頁／Topbar | 深海藍殼層、貼圖大亨、`AI Inspection Preview`、`DEMO / PREVIEW` 與 `Inspection` 連結。 | `Inspection` 連結可切換至 `/preview/inspection`。 | **IMPLEMENTED** | 路由連結為真實前端導覽；不讀登入狀態。 |
| 2. DEMO notice | 固定顯示「這是 AI Inspection Preview，不代表真實 AI API 生成結果」與不登入、不上傳、不呼叫 Provider 說明。 | 無。 | **IMPLEMENTED** | 是真實可見安全提示。 |
| 3. Chat-first 對話區 | 使用者訊息「我想製作 LINE 貼圖」、助理引導、兔子附件、Character Anchor、八張規劃、V2、姿勢、風格、品質、quota 與輸出訊息。 | 隨 Demo stage 顯示不同訊息。 | **DEMO_ONLY** | 訊息由固定 JSX 依 `stage` 顯示，不使用 LLM。 |
| 4. 輸入框 | 有 `示範聊天輸入` textarea、送出按鈕及附件列。 | 可輸入「第3張多一隻腳」、「姿勢」、「風格」、「繼續」等文字並送出。 | **DEMO_ONLY** | 僅解析少數字串並切換固定 stage；沒有聊天 API。 |
| 5. 圖片／檔案按鈕 | 左側圖示按鈕標示「上傳圖片或檔案」；下方固定顯示兔兔角色、HEIC 姿勢、風格附件。 | 點擊會顯示 Demo notice 或切至分析畫面。 | **DEMO_ONLY** | Preview 沒有 `<input type="file">`，不開啟檔案選擇器、不上傳。 |
| 6. AI 回覆與快捷操作 | `AGENT WORKSPACE`、Gemini／GPT Image 可用、FLUX.2 未設定；8／16／24／32／40 張、整套修改、繼續製作，以及 AI 自動規劃、開始製作、查看品質循環、Quota checkpoint。 | 可點擊按鈕切換示範訊息、完成數與 notice。 | **DEMO_ONLY** | 計數按鈕仍固定只呈現前八張任務；不建立真實 job。 |
| 7. 貼圖規劃 | 助理訊息說明已規劃八張；右側顯示八張貼圖卡。 | 「開始製作」可切至 `generating`；8 張、16 張等可改示範 notice。 | **DEMO_ONLY** | 無後端貼圖規劃或批次排程。 |
| 8. Character Anchor | Anchor 區顯示 `Character Reference · 已接受`，並有角色／姿勢／風格按鈕。 | 任一按鈕將 stage 切換至 anchors 並顯示 notice。 | **DEMO_ONLY** | 不寫入角色檔案、不儲存 Anchor。 |
| 9. Style Anchor | 顯示 `Style Reference · 已更新`，聊天訊息含「Style Anchor 已更新」。 | 點擊風格或輸入含「風格」的文字可更新 Demo notice。 | **DEMO_ONLY** | 不更新真實專案的 Style Anchor。 |
| 10. 生成進度 | Agent 標題顯示 `0 / 8`、`5 / 8` 或 `8 / 8`；任務卡可呈現等待中、正在生成、已完成。 | 「開始製作」與張數按鈕會變更固定 completed 值。 | **DEMO_ONLY** | 沒有真實產生或輪詢。 |
| 11. 貼圖結果 | 八張卡顯示固定兔子圖、文字、動作、Router 字串、品質字串與完成標籤。 | 每張提供 PNG 圖示、告訴 AI 修改、V1／V2；符合錯誤狀態時才會出現重試。 | **PARTIALLY_IMPLEMENTED** | 任務卡與按鈕的真實元件已渲染；Preview handler 只切換本機 notice／stage，不修改影像或下載檔案。 |
| 12. 修改與重新生成 | 點選「告訴 AI 修改」會聚焦指定卡片、將輸入值設為「第 N 張請修改：」，並把 Demo 切到 `edited`。 | 可點選修改；預設完成卡不顯示重試，Demo 中沒有實際重生影像。 | **DEMO_ONLY** | 沒有 image edit、retry job 或 S3 結果更新。 |
| 13. 版本 | 第 3 張在 `edited` 以後顯示 `V2`，其他卡片顯示 `V1`。 | 版本按鈕切換選取卡片並顯示 notice。 | **PARTIALLY_IMPLEMENTED** | 可見 V1／V2 標籤與按鈕；Preview 未渲染可回復版本歷史列，亦不實際還原檔案。 |
| 14. Quality Check | 助理訊息與第 6 張卡顯示 `Fail → Auto Fix → Regenerate → Pass`／`Fix → Pass`。 | 「查看品質循環」切換固定 quality stage。 | **DEMO_ONLY** | 無實際視覺模型分析、修圖或 Recheck。 |
| 15. Model Router／Fallback | Preview 卡片固定顯示 `Gemini → GPT Image`；Inspection 另有 Selected Model／Fallback 說明，FLUX.2 為 disabled。 | 無模型設定控制。 | **DEMO_ONLY** | Preview 不查詢 Provider health，不做 Router 或 fallback。 |
| 16. Quota／Checkpoint／Resume | 聊天中顯示 `Quota exhausted → Checkpoint saved`；工作區有「繼續製作」與 `Quota checkpoint`。 | 按鈕將 stage 或 notice 變更為固定續作訊息。 | **DEMO_ONLY** | 不保存 checkpoint，不從資料庫／佇列續作。 |
| 17. LINE Preflight | 右側 LINE PREFLIGHT 顯示 PNG 370×320、透明背景、安全邊距、繁中 SVG 後製與 ZIP 就緒。 | `LINE ZIP`、`PNG` 按鈕會顯示 Demo notice。 | **DEMO_ONLY** | 不進行檔案檢驗，也不建立 PNG／ZIP。 |
| 18. ZIP／Download | 任務卡有每張 PNG 圖示，面板有 LINE ZIP／PNG。 | 可點擊並看到「僅展示下載操作」notice。 | **DEMO_ONLY** | 不觸發檔案下載。 |
| 19. Inspection | Inspection 以同一套工作區嵌入 Desktop View／Mobile View 容器，底部顯示 Router、Quality、Quota 摘要。 | Desktop View／Mobile View 切換為真實前端 state。 | **IMPLEMENTED** | 視圖切換和路由為真實 UI；其中展示的模型／品質／quota 內容仍為固定 Demo。 |

## 實際可測試的固定狀態

| 操作 | 實際反應 | 分級 |
| --- | --- | --- |
| 輸入「第3張多一隻腳」後送出 | 第 3 張切為 V2，notice 說明未呼叫影像 API。 | **DEMO_ONLY** |
| 輸入含「姿勢」或「風格」後送出 | 顯示 Character + Pose 或 Style Anchor 的固定示範說明。 | **DEMO_ONLY** |
| 輸入含「繼續」後送出／點繼續製作 | 回到 `export` stage，顯示完成狀態。 | **DEMO_ONLY** |
| 點 AI 自動規劃 | 進入 `analysis` stage。 | **DEMO_ONLY** |
| 點開始製作或 8／16／24／32／40 張 | 進入 `generating` stage，五張完成、一張生成、其餘等待；畫面只固定列八張。 | **DEMO_ONLY** |
| 點查看品質循環 | 進入 `quality` stage，第 6 張顯示 `Fix → Pass`。 | **DEMO_ONLY** |
| 點 Quota checkpoint | 進入 `quota` stage，顯示 checkpoint 文案。 | **DEMO_ONLY** |
| 點 Inspection 的 Mobile View | 同頁切換 `.inspection-device.mobile` 容器。 | **IMPLEMENTED** |

## Preview 中未實作的真實功能

| 功能 | Preview 狀態 | 實際原因 |
| --- | --- | --- |
| 檔案選擇與上傳 | **NOT_IMPLEMENTED** | Preview 沒有檔案 input，也不把固定附件送往伺服器。 |
| 使用者登入與專案資料 | **NOT_IMPLEMENTED** | 路由不讀取登入、個人專案、對話或私有素材。 |
| tRPC／外部 AI Provider 請求 | **NOT_IMPLEMENTED** | 公開頁的資源清單未出現 Studio tRPC、Gemini、GPT Image、Forge 或 FLUX 請求。 |
| 真實貼圖生成、單張修改與重試 | **NOT_IMPLEMENTED** | 生成、V2、Quality 與 retry 只改變本頁記憶體中的固定 stage。 |
| 真實版本還原 | **NOT_IMPLEMENTED** | Preview 顯示 V1／V2 標籤但不保存檔案或渲染回復版本列。 |
| 真實 LINE 檢查與 PNG／ZIP 下載 | **NOT_IMPLEMENTED** | Preflight、PNG、LINE ZIP 按鈕只顯示 Demo notice，不檢驗或建檔。 |

## 已知畫面觀察

桌面截圖使用 1280×900，預設為兩欄：左側對話與 Composer、右側任務面板。768px 平板在實際擷取時轉為單列工作區，但八張任務仍是兩欄；390px Android 則為一欄任務卡，所檢視的結果與匯出區沒有水平捲動。Inspection 的窄欄 Mobile View 截圖在容器轉換範圍有對話文字與任務區重疊／裁切感，這是目前應保留給後續修正的真實發現，而不是已通過的視覺品質結論。

完整畫面索引位於 [`PREVIEW-MANIFEST.json`](PREVIEW-MANIFEST.json) 與 [`SCREENSHOT-INDEX.md`](SCREENSHOT-INDEX.md)，人工檢視註記位於 [`CAPTURE-NOTES.md`](CAPTURE-NOTES.md)，客觀視覺稽核位於 [`UI-VISUAL-AUDIT.md`](UI-VISUAL-AUDIT.md)。
