# Sticker Muse AI LINE 貼圖工作室能力稽核

稽核日期：2026-08-26

## 結論

目前專案已不是僅展示用網站：核心操作確實以單一 AI 對話入口驅動，具備匿名或登入專案、S3 原始／生成素材、角色分析、8–40 張結構化計畫、逐張狀態、指定貼圖修改、HEIC server-side 轉 PNG、LINE 檢查，以及可保存 ZIP export。本輪補上了最後一個明確的保存缺口：通過驗證的 ZIP 不再只留在瀏覽器下載，而是直接以上傳憑證寫入 S3，並登記於 `project_exports`。

| 能力 | 真實實作證據 | 現況 |
| --- | --- | --- |
| 極簡聊天入口與多圖上傳 | `Home.tsx` 的聊天區、隱藏 file input、`multiple`、JPG/PNG/HEIC/HEIF accept、附件與對話快照 | 已接通 |
| AI 理解與套組規劃 | `server/stickerChatRouter.ts` 輸出結構化 intent、8／16／24／32／40、計畫項目、target positions、resume intent | 已接通 |
| 角色設定 | `character.analyze` 讀取已保存 source assets，生成並保存 visual bible；每張 job prompt 加入一致性錨點 | 已接通；目前預設影像 provider 以單一主參考圖加 character bible 為主 |
| 逐張生成與重試 | `BatchStickerJob`、`jobStates`、`sticker_jobs`／`sticker_job_versions`、retrying／failed／completed | 已接通 |
| 對話式指定修改 | planner 回傳 `targetPositions`；Home 只替換目標 index、保存新 assetId 與 version | 已接通 |
| 中斷與續作 | autosave snapshot、quota paused、`projects.resume` 的 nextPosition、聊天「繼續製作」分支 | 已接通；真實圖像呼叫 E2E 仍受供應者 usage exhausted 影響 |
| LINE 匯出 | Canvas 透明背景／繁中繪字、實際 PNG signature／IHDR／alpha 驗證、單檔 1 MB gate、ZIP 60 MB gate | 已接通，規格依 LINE 官方指南 [1] |
| ZIP 保存與重新下載 | 預簽 PUT 直傳 S3，`project_exports` 登記，resume 回傳最近 export，貨架提供重新下載 | 本輪完成 |
| HEIC／HEIF | 瀏覽器上傳後送 server-side `heic-convert` 轉 PNG，再存 S3 | 已接通 |

## 模型與供應者邊界

現有可運作基線是內建 ImageService（GPT Image 2 預設配置）。研究顯示 FLUX.2 的多參考圖與 Gemini 的角色一致性／自然語言局部修改，適合作為未來 provider adapter 的候選；但目前尚無專案所屬的外部 API 憑證、成本預算或基準測試。因此不會把第三方模型名稱做成無法運作的 UI 選項。選型與來源見 [research-studio-refresh.md](./research-studio-refresh.md)。

## 已知且如實保留的限制

外部影像服務偶爾回傳 `usage exhausted`。對此專案會保存工作狀態並提示「繼續製作」，但在額度恢復前不能宣稱已完成新的實圖生成、實圖 resume 或實圖第 N 張修改端到端測試。OpenAI 官方指南同樣指出，信用／支出／使用額度耗盡不會因盲目重試而恢復存取 [2]。

## 參考資料

[1] [LINE Creators Market：Sticker Guidelines](https://creator.line.me/en/guideline/sticker/)

[2] [OpenAI API：Error Codes](https://developers.openai.com/api/docs/guides/error-codes)
