# Sticker Muse AI LINE 貼圖工作室升級架構

## 一、改造目標

本次不重做現有網站，而是把目前以 `Home.tsx` React state 為中心的工作台，逐步升級成真正可中斷、可恢復、可逐張處理的 AI 貼圖工作室。使用者看到的主入口維持單一 AI 對話框；專案細節、角色設定與逐張進度收進可展開的側欄或抽屜，避免回到大量表格與設定欄位。

現有聊天、Lottery、匿名創作學習、去背、LINE 尺寸檢查、拖曳排序、聊天室預覽、單張重試、ZIP 匯出與公開回饋均列為保留功能。升級優先以「將暫存狀態持久化」和「把單一批次布林值拆成逐張狀態」為核心，不另建第二套生成流程。

## 二、目標資料模型

資料庫需要新增專案與工作單位，但不把圖片 bytes 放進資料庫；原始圖、角色參考圖、生成 PNG 與 export ZIP 都存到現有 S3 storage，資料庫只保存 key、URL、mime、尺寸、大小與 hash。

| 實體 | 核心欄位 | 用途 |
|---|---|---|
| `sticker_projects` | `id`, `ownerUserId` nullable, `guestKey` nullable, `name`, `status`, `packSize`, `activeJobId`, `createdAt`, `updatedAt`, `lastOpenedAt` | 支援登入帳戶與匿名瀏覽器 draft，記錄續作入口 |
| `project_assets` | `id`, `projectId`, `kind`, `storageKey`, `mimeType`, `width`, `height`, `fileSize`, `sha256`, `createdAt` | 原始素材、角色參考圖、生成圖與輸出檔案的 metadata |
| `character_profiles` | `id`, `projectId`, `name`, `visualBibleJson`, `referenceAssetIdsJson`, `version`, `createdAt`, `updatedAt` | 保存臉部／毛色／服裝／配件／比例／畫風等角色設定 |
| `conversations` | `id`, `projectId`, `title`, `createdAt`, `updatedAt` | 一個專案可有一條主要對話，未來可支援分支 |
| `conversation_messages` | `id`, `conversationId`, `role`, `content`, `attachmentAssetIdsJson`, `createdAt` | 保存使用者、AI、系統訊息及對話附件 |
| `sticker_plans` | `id`, `projectId`, `version`, `brief`, `language`, `style`, `createdAt` | 保存 AI 產生的整套規劃版本 |
| `sticker_plan_items` | `id`, `planId`, `position`, `text`, `action`, `emotion`, `composition`, `prompt`, `targetStickerId` nullable | 每張貼圖的結構化規劃，可由聊天修改 |
| `sticker_jobs` | `id`, `projectId`, `planItemId`, `position`, `status`, `attemptCount`, `provider`, `errorCode`, `errorMessage`, `startedAt`, `completedAt`, `updatedAt` | 每張貼圖的 generating／completed／failed／retrying 狀態 |
| `sticker_job_versions` | `id`, `jobId`, `version`, `assetId`, `editPrompt`, `changeSummary`, `createdAt` | 保存每張貼圖的修改歷史，不覆蓋舊版本 |
| `project_checkpoints` | `id`, `projectId`, `reason`, `snapshotJson`, `createdAt` | 額度中斷、批次完成、使用者手動保存時的可恢復快照 |
| `project_exports` | `id`, `projectId`, `type`, `storageKey`, `status`, `validationJson`, `createdAt` | PNG／ZIP 輸出與檢查報告 |

所有 business timestamp 以 UTC timestamp 儲存。匿名專案只由不可逆的瀏覽器 `guestKey` 讀取，不公開給其他訪客；登入後提供「同步到帳戶」動作，不能默默把匿名資料暴露給帳戶以外的人。

## 三、API 邊界

所有新增後端操作使用 tRPC，不在前端自行建立 Axios 或繞過既有合約。第一階段 API 建議如下：

| Procedure | 權限 | 職責 |
|---|---|---|
| `projects.create` | public／guest key | 建立匿名或登入專案 |
| `projects.list` | protected | 顯示帳戶的可續作專案 |
| `projects.get` | project owner／guest key | 讀取專案、對話、角色、計畫、工作與輸出 |
| `projects.saveSnapshot` | project owner／guest key | 寫入完整狀態快照，供中斷續作 |
| `projects.resume` | project owner／guest key | 只回傳 pending／retryable jobs 與現有完成結果 |
| `character.analyze` | project owner／guest key | 以參考圖呼叫視覺 LLM，產出結構化 character bible |
| `stickerPlanner.plan` | project owner／guest key | 將自然語言轉成 8／16／24／32／40 張計畫 |
| `stickerPlanner.revise` | project owner／guest key | 解析「第 3 張」「文字」「腳」「眼睛」等局部修改意圖 |
| `stickerJobs.generateOne` | project owner／guest key | 只生成一張 job，寫入狀態與錯誤事件 |
| `stickerJobs.retryOne` | project owner／guest key | 只重試指定 job，不影響其他 job |
| `stickerJobs.resumePending` | project owner／guest key | 從第一個未完成 job 繼續，不重做 completed |
| `exports.validate` | project owner／guest key | 驗證尺寸、PNG、alpha、RGB、dpi、大小與數量 |
| `exports.createZip` | project owner／guest key | 將已驗證的檔案打包並保存 S3 key |

後端必須以 ownership guard 驗證 project id；不要只相信前端傳來的 owner 欄位。所有 provider 錯誤正規化為 `quota_exhausted`、`rate_limited`、`timeout`、`content_rejected`、`invalid_input`、`network_error` 與 `unknown`，前端依類型給人類可理解的中文訊息。

## 四、AI pipeline

### 需求理解與套組規劃

聊天訊息先經結構化 LLM。輸出至少包含 `intent`、`projectAction`、`packSize`、`language`、`style`、`characterUpdate`、`planChanges`、`targetPositions`、`readyToGenerate` 和 `needsClarification`。當使用者已上傳照片且描述足夠具體時直接規劃；只有真正缺資料時才追問。使用者輸入「繼續製作」時不重新規劃，改呼叫 resume。

### 角色設定

第一次上傳一至四張參考圖後，背景工作產生 character bible。結構化欄位至少包含：物種／身份、臉型、五官、毛色／髮色、身體比例、服裝、配件、輪廓、主色、畫風錨點、不可改變特徵、負面限制，以及參考 asset ids。每張貼圖 prompt 都由「角色 bible + 參考圖 + 單張場景規劃 + 透明貼圖限制」組合而成；不可只把上一張自然語言描述當成角色設定。

### 圖像生成與編輯 adapter

建立 `ImageProvider` 介面，統一 `generateOne()`、`editOne()`、`listModels()` 與 `normalizeError()`。現有 ImageService／GPT Image 2 adapter 先作為可運作基線；參考研究後，FLUX.2 的多參考圖能力與 Gemini Nano Banana 2／Pro 的多輪圖片處理列為外部 provider 候選。沒有正式 connector、secret、服務條款與實際費用驗證前不把外部模型硬寫進生產路徑。

每個 job 只傳自己的計畫、角色參考與必要的上一版本圖片。第 3 張修改時，資料庫只把第 3 張設為 retrying／generating，其餘 job 維持 completed；完成後新增 job version 並更新目前 asset pointer。

### 文字策略

AI 先產生短句與版面意圖，避免讓中文長文塞在圖像模型內。第一階段仍可讓模型嘗試直接繪字，但輸出 validator 必須能標記文字疑似錯誤或截斷。第二階段提供「畫面與角色生成」及「文字版面重做」兩種可切換策略；是否把文字改由程式／可編輯 overlay 繪製，要以使用者要求精確可販售文字時的產品決策與實測結果決定，不把未驗證的文字 pipeline 假裝穩定。

## 五、額度中斷與續作

每個 job 更新都採事件順序：先寫 `generating`，呼叫 provider，成功先保存 asset metadata 與 job version，再寫 `completed`；失敗先寫 normalized error，再寫 project checkpoint。批次不因某張失敗而清除已完成圖片。

當 provider 回傳額度耗盡，介面顯示：「AI 生成額度目前已用完。你的專案與製作進度已自動保存；完成的貼圖不會重做。額度恢復後輸入『繼續製作』即可從第 N 張繼續。」resume 依 `completed`／`retryable` 篩選，絕不把 completed job 放回 queue。

## 六、前端極簡介面

首頁維持中央 AIChatBox 與附件列。右側桌面顯示「製作進度」摘要；手機改為底部可展開抽屜，內容依序是「正在製作第幾張」、「角色設定」、「貼圖貨架」、「LINE 輸出」。不把 8／16／24／32／40、每張 action、每張 input 全部永久展開；AI 可從自然語言自行設定，使用者需要時再透過聊天修改。

對話訊息支援計畫卡、生成進度卡、失敗與續作卡、單張修改卡。聊天輸入要能上傳 JPG／PNG／HEIC／HEIF，檔案類型不由瀏覽器 preview 成功與否決定；HEIC 在前端不能解碼時送 server 轉檔，原始檔仍保留 metadata。

## 七、分階段實作順序

第一階段只做「專案／對話／素材／角色／貼圖 job 的 schema 與 save/get/resume」，並把現有 Home state 以 adapter 寫入專案，不改變使用者看到的主要流程。第二階段接入角色分析與結構化 sticker planner，保留現有立即生成 fallback。第三階段將批次生成改為逐 job queue，加入指定第 N 張修改、版本歷史與 quota checkpoint。第四階段補強文字策略、HEIC server conversion、export validation report 與 ZIP 保存。第五階段再評估正式外部 provider connector、模型路由、成本預算與 A/B 實測。

每階段都必須新增 Vitest，並以 390×844 實際瀏覽器測試：新專案、上傳、多圖、規劃、單張生成、單張重試、對話修改、額度中斷、繼續製作、PNG／ZIP 與回饋功能。資料庫 migration 必須先產生 SQL，再用專案資料庫工具依依賴順序套用；不以 `db:push` 取代可審查 migration。

## 八、目前不應假裝已完成的項目

現有專案可產生圖片、輸出與聊天修改，但目前尚未具備資料庫專案／逐張 job／角色 bible／對話持久化，因此不能宣稱已經達到完整續作與角色一致性。內建影像服務曾出現 `usage exhausted`，外部模型也尚未配置；本次改造要把這些限制做成明確的狀態與可恢復流程，而不是只顯示漂亮的 loading。

## 研究來源

[1] OpenAI, Image generation: https://developers.openai.com/api/docs/guides/image-generation

[2] Google AI for Developers, Gemini API image generation: https://ai.google.dev/gemini-api/docs/image-generation

[3] Black Forest Labs, FLUX.2: https://bfl.ai/models/flux-2

[4] LINE Creators Market, Sticker creation guidelines: https://creator.line.me/en/guideline/sticker/

[5] MDN, Image file type and format guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
