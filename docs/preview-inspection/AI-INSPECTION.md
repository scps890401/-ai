# AI Preview 檢查說明

> **以下內容描述的是目前實際 Preview 版本，不是未來規劃。**

## 如何查看

| 頁面 | URL | 用途 |
| --- | --- | --- |
| Preview | `https://stickertyco-wsz8yoes.manus.space/preview` | 檢查公開 Chat-first UI、固定 Demo 對話、Anchor、八張任務、品質、quota 與 LINE 輸出外觀。 |
| Inspection | `https://stickertyco-wsz8yoes.manus.space/preview/inspection` | 檢查同一工作區的 Desktop View／Mobile View，以及 Router、Quality、Quota 摘要。 |

兩頁不需要登入。進入後應先看到 `DEMO / PREVIEW` 與「這是 AI Inspection Preview，不代表真實 AI API 生成結果」。若未出現此 notice，請將結果標記為部署版本不一致。

## 可安全測試的畫面與操作

| 測試 | 操作 | 預期結果 | 分級 |
| --- | --- | --- | --- |
| 需求對話 | 在 `示範聊天輸入` 輸入「第3張多一隻腳」後送出。 | Notice 表示第 3 張切到 V2；不呼叫影像 API。 | **DEMO_ONLY** |
| 姿勢／風格 | 輸入含「姿勢」或「風格」的文字後送出。 | 顯示固定 Character + Pose 或 Style Anchor notice。 | **DEMO_ONLY** |
| 自動規劃 | 點「AI 自動規劃」。 | 進入固定分析／Anchor 畫面。 | **DEMO_ONLY** |
| 生成 | 點「開始製作」或 8／16／24／32／40 張。 | 進入固定 `generating` stage；僅前八張卡片變更完成／生成／等待顯示。 | **DEMO_ONLY** |
| 品質 | 點「查看品質循環」。 | 顯示第 6 張 Fail → Auto Fix → Regenerate → Pass。 | **DEMO_ONLY** |
| quota | 點「Quota checkpoint」或「繼續製作」。 | 顯示固定 Checkpoint／Resume 文案。 | **DEMO_ONLY** |
| Inspection 視圖 | 在 Inspection 點 Desktop View／Mobile View。 | `.inspection-device` class 在 `desktop` 和 `mobile` 間切換。 | **IMPLEMENTED** |

## 功能分級

| 狀態 | 目前項目 |
| --- | --- |
| **IMPLEMENTED** | 公開 `/preview`、`/preview/inspection` 路由；不登入頁面；真實共享的 Studio UI 元件與 CSS；固定示範素材渲染；Inspection Desktop／Mobile View 的前端切換；DEMO notice。 |
| **PARTIALLY_IMPLEMENTED** | Preview 任務卡的 UI、PNG／修改／版本按鈕與第 3 張 V2 標示皆存在，但 Preview handler 僅操作本頁 state，沒有真實影像、版本還原或下載。 |
| **DEMO_ONLY** | 對話理解、附件、張數規劃、生成進度、任務結果、單張修改／重試、Anchor 更新、Quality Fix、Model Router／Fallback、Quota checkpoint／Resume、LINE Preflight、PNG／ZIP。 |
| **NOT_IMPLEMENTED** | Preview 中的檔案選擇與上傳、tRPC／專案建立、登入／使用者資料讀取、真實 Provider health、真實 Gemini／GPT Image／FLUX 呼叫、真實圖片生成或修改、S3 結果更新、真實 PNG／ZIP 建檔下載、真實版本回復。 |

## AI 檢查時不可做的推論

1. 不得因 Preview 顯示「Gemini 可用」或「GPT Image 可用」就判定外部 Provider 已成功產生圖片；這些是固定示範標籤。
2. 不得因有 HEIC 附件列就判定 Preview 已上傳或轉檔；Preview 沒有檔案 input。
3. 不得因有 LINE Preflight 綠色勾選或 ZIP／PNG 按鈕就判定已建立檔案；按鈕只顯示 notice。
4. 不得把正式首頁的後端能力套用到 Preview；本檢查包只報告公開 Preview route 的實際行為。

## 建議 AI 輸出格式

其他 AI 檢查此版本時，應至少回報：可見 notice、可見任務數、是否可見第 3 張 V2、是否可見第 6 張 `Fix → Pass`、是否可見 LINE Preflight、Inspection 視圖切換結果、網路請求是否包含 `/api/trpc` 或 Provider、以及任何文字重疊、裁切或水平捲動。請將未真正執行的 API／下載／生成標為 **DEMO_ONLY** 或 **NOT_IMPLEMENTED**，而不是通過。
