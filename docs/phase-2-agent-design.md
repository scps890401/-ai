# 第二階段 AI 對話式 LINE 貼圖 Agent：升級設計

**狀態：實作前設計，2026-08-26**

## 目標與相容原則

本設計在既有 Chat-first 工作室上加入 Agent 決策層，而非更換成設定表單。既有的對話、HEIC 裝置端轉檔、獨立生成、指定修改、`paused_quota` checkpoint、LINE PNG／ZIP、繁中 SVG 文字後製與 `projectKey` 續作均保留。任何 Provider 額度不足時，工作流程必須保存可重現的選擇結果、prompt、參考圖和未完成項目；不以測試模式偽裝外部模型成功。

## 資料模型增量

| 實體 | 新資料 | 用途 |
|---|---|---|
| `stickerReferences` | `role`、`priority`、`accepted`、`metadataJson` | 把任意上傳圖明確分類為角色、姿勢、風格、目前修改圖或接受圖，並保存可重現優先序。 |
| `stickerScripts` | `planJson` | 保存貼圖的結構化規劃：文字、情緒、姿勢、物件、構圖與行為狀態，保留舊欄位供現有輸出流程使用。 |
| `stickerVersions` | `parentVersionId`、`isActive`、`qualityReportJson`、`provider` | 建立 V1→V2→V3 關係，讓「回復 V2」只切換目前使用版本，不會遺失較新版本。 |
| `stickerJobs` | `routerJson`、`qualityReportJson` | 保存 Provider 候選、已嘗試 Provider、錯誤分類、參考圖快照與品質結論，供 resume 與 UI 顯示。 |
| `stickerStyleAnchors` | 新表 | 保存使用者確認的畫風、配色、線條、構圖和代表圖。 |
| `stickerAgentEvents` | 新表 | 保存低技術噪音的 Agent 工作步驟，供聊天內顯示「分析角色／建立設定／生成第 n 張／檢查／完成」。 |

所有新欄位均可為空或設有預設值，因此既有專案可無資料遷移風險地讀取；圖片原始位元組仍只留在 S3，資料庫只保存 URL／key 與 metadata。

## Agent 指令與工具決策

意圖分析回傳嚴格 JSON，新增下列自然語言意圖：`accept_image`、`use_as_style`、`use_as_pose`、`restore_version`、`download_pack` 與既有的建立、規劃、生成、修改、重試、續作。動作均轉換成 server-side function，不把模型名稱、prompt 或 Provider 操作暴露為一般使用者表單。

| Agent 動作 | 伺服器工具 | 產出 |
|---|---|---|
| 建立／修訂規劃 | Planner + `planJson` | 多張不重複的貼圖腳本與角色摘要。 |
| 選擇參考圖 | `selectReferencesForTask` | 角色原照、接受圖、目前圖、姿勢、風格的有序快照。 |
| 決定 Provider | `routeImageTask` | 可用候選、理由、錯誤可否 fallback、最高重試次數。 |
| 生成／修改 | `runImageTask` | 逐張 draft、透明化、版本、品質報告與事件。 |
| 品質檢查 | `evaluateStickerQuality` | alpha、尺寸、文字規則、檔案、主體安全邊距與明確 retry 理由。 |
| 回復版本 | `restoreStudioVersion` | 將選定版本設為活動版本、更新 script 結果並新增事件。 |

## Model Router 與錯誤政策

Router 只挑選「目前已設定且符合任務能力」的 Provider：具備可用 API 的 Gemini、Forge GPT Image 2，及未來有憑證後的 FLUX.2。每個 job 保存 `routerJson`，其中包含 `taskKind`、`referenceSnapshot`、`candidates`、`attempts`、`selectedProvider`、`reason` 與 `resumeSafe`。

| 錯誤類別 | 結果 |
|---|---|
| 短暫 429、逾時、5xx | 一次有限退避，若另一已啟用 Provider 能完成同類任務則 fallback；每次嘗試均寫入路由歷程。 |
| `usage exhausted`、長期 quota | 不忙等、不連續重送；將工作設為 `paused_quota` 並保存 checkpoint。 |
| 安全政策拒絕 | 保留原圖與錯誤原因，要求使用者改寫需求；不可跨 Provider 企圖繞過政策。 |
| 品質不通過 | 僅在有具體、可修正理由時嘗試一次；否則標示人工確認，保留成功圖。 |

## 品質與文字策略

視覺品質無法被自動化判定為絕對正確，因此品質 Agent 採**可解釋、有限、自動化檢查**：PNG／alpha、370×320 LINE 成品、字數與兩行換行、10px 邊界、檔案大小、版本可追溯及可見主體基本完整性。正式繁中用語仍由 Noto Sans CJK TC SVG／Sharp 後製繪製，不以模型生成的中文作驗收依據。

## 對話內介面設計

聊天室每次助理回覆會依儲存的 intent 與 Agent events 顯示輕量 Action Card：初始卡可提供「上傳角色照片」、「8／16／24／32／40 張」、「交給 AI 規劃」；進行中卡展示目前步驟與完成數；完成卡展示縮圖與操作；圖片卡提供「修改」、「重試」、「下載」、「查看版本」、「設為角色／風格參考」。右側工作區仍保留為桌面快速總覽，在 Android 版折疊為聊天內容後方的任務抽屜。

## 驗收範圍

驗證將覆蓋：多角色／姿勢／風格附件分類、接受圖升級為錨點、8 張生成、40 張規劃、單張 retry、V2/V3 及回復、Provider route 記錄、quota checkpoint／resume、LINE 預檢與 ZIP、Android 行動聊天室、TypeScript、Vitest、production build、敏感資訊掃描與 GitHub 分支內容。真實 Provider 額度不足時，驗證結果將清楚記載為 `paused_quota`，而非宣稱外部生成成功。
