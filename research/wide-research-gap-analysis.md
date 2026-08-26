# 對話優先 LINE 貼圖工作室：研究對照與能力缺口

本盤點以 `research/wide-research-2026.md` 的官方研究來源為準，並直接檢閱現有 `server/studio.ts`、`server/geminiImage.ts`、資料模型與手機介面。目標不是重建既有功能，而是找出會影響「真正可用」貼圖工作室的資料保存、角色一致性與錯誤恢復缺口。

| 使用者最高優先級 | 現有能力 | 證據／限制 | 改良優先級 |
| --- | --- | --- | --- |
| 極簡對話介面 | 已完成 | 首頁以單一對話輸入、附件、訊息歷史與任務卡為中心。 | 維持；不加回大型設定表單。 |
| AI 理解與角色設定 | 部分完成 | LLM 可從當次訊息與最多 4 張新附件建角色設定，但後續對話會以新訊息覆寫專案 `characterProfile`，且不會把既有 reference 全部再次送入規劃。 | 高。 |
| 多張獨立生成 | 已完成 | 每個腳本有獨立 `stickerJobs`、狀態、重試與結果 URL。 | 維持；補上 retry 排程 metadata。 |
| 角色一致性 | 部分完成 | Gemini 優先讀前 4 張 reference，提示中含 profile；但未保存 provider interaction ID、已用 reference 順序、模型／尺寸或角色錨點版本。 | 最高。 |
| 對話式單張修改 | 部分完成 | 可解析「第 N 張」並只改指定圖、保留版本。額度不足時原圖不被覆蓋。 | 高；額度中斷時應保存修改 instruction checkpoint。 |
| 專案保存與中斷續作 | 大致完成 | 對話、附件、腳本、任務、版本、匯出已落 DB；生成中斷會保存 `paused_quota`。 | 高；補 provider retry-after、interaction ID 與所有 job stage。 |
| LINE 輸出與中文 | 已完成 | 伺服器用繁中字型後製文字、輸出透明 PNG、main／tab、ZIP 和品質報告。 | 中；補文字 bbox／安全邊距與品質檢查資料回寫。 |
| Android 體驗與 HEIC | 已完成 | 受控與真實額度中斷回歸已驗證 HEIC 轉 JPEG、多檔佇列、任務與下載。 | 中；維持真機生成驗收。 |

## 優先改良：角色錨點與可恢復 Provider Context

Gemini 官方文件支持以最多 4 張角色 reference 維持一致性，而多輪編輯可使用 interaction ID。[1] 現在程式僅保存透明 PNG 結果與 draft URL；它沒有把 Gemini 回傳的 interaction ID、實際使用的 reference IDs 或選用模型儲存在 job checkpoint。因此，最先應做的非破壞性改良是把這些 metadata 加入 `checkpointJson`，且在每張生成、retry、edit 都沿用相同角色錨點。

同時，後續訊息不應以「最新一句話」取代角色設定。若使用者輸入「第 3 張眼睛大一點」，應保留先前 character profile，僅建立 edit intent；如果使用者上傳更多參考圖，系統才合併、版本化 profile，並清楚說明新增參考圖會影響未完成貼圖，不會靜默改寫已完成版本。

## 優先改良：區分短暫 429 與需人工處理的額度耗盡

Google 與 OpenAI 文件都將短暫速率限制和需等待／處理的配額狀態區分處理。[2] [3] 現有 `isQuotaError` 將 429、412 和關鍵字一律歸為 `paused_quota`，這已能保護使用者進度，但缺少 `retryAt`、provider retry-after 與可預期的輕量重試。下一輪應為 job checkpoint 加入 `errorKind`、`retryAfterSeconds`、`nextRetryAt`、`resumeCommand`，短暫率限才使用受限指數退避；用量或計費限制只顯示「繼續製作」且不自動狂重試。

## 優先改良：修改 checkpoint 與 LINE 品質報告回寫

生成工作已保存 pause checkpoint，但 `editStudioSticker` 在配額耗盡時只記錄錯誤訊息。應保存原始版本 URL、修改指令、目標 position 和既有角色 profile，讓使用者輸入「繼續製作」時也能完成待處理的修改，而不只續跑 generate 工作。

LINE 輸出應維持目前的程式後製繁中；新增的品質欄位應回寫到 script 或 export record，例如文字 bounding box、最小透明邊距、alpha 比例、像素尺寸、位元組數、RGB／PNG、規格版號。這能把「可下載」提升為「可追溯地符合目標 LINE 靜態貼圖規格」。

## 本輪實作範圍

本輪將優先以不破壞資料庫 schema 的方式，擴充 `stickerJobs.checkpointJson` 與現有品質報告 JSON，並以單元／server route／Android 受控流程測試驗證：角色錨點保存、指定修改中斷後續作、單張 retry 不影響其他貼圖、繁中後製與 ZIP 規格資料仍正確。

## 參考資料

[1]: [Google AI for Developers — Nano Banana image generation](https://ai.google.dev/gemini-api/docs/image-generation)
[2]: [Google AI for Developers — Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
[3]: [OpenAI Developers — Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
