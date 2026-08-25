# 對話優先 LINE 貼圖工作室：實作架構計畫

**適用版本：** 極簡角色樣本版後續重構  
**產品原則：** 使用者看到的是一個像 ChatGPT 的對話工作室；角色分析、腳本規劃、圖像任務、文字繪製、LINE 檢查與續作都在後端編排。

## 一、決策摘要

現有專案已具備 S3 圖片儲存、MySQL／Drizzle 專案資料、個別貼圖狀態、PNG alpha 後處理、ZIP 匯出、HEIC 裝置端轉檔，以及 AI 額度耗盡時不覆蓋既有結果的基礎能力。重構不會刪除這些能力，而是把原本的表單精靈改成一個**對話驅動的編排層**。

主要圖像提供者建議採取可切換架構。Google Gemini 3.1 Flash Image 應作為角色一致性批次生成的優先提供者，因官方文件明載可帶入多張角色參考圖、支援連續圖片互動，以及最多四張角色參考圖的一致性工作流。[1] GPT Image 2 保留為精修、局部修改與後備提供者；其官方文件支援多圖參考、高保真輸入、遮罩編輯與透明背景，但同時提醒精確文字與重複角色一致性仍可能失敗。[2] Adobe Firefly Custom Models 不納入首版必要依賴，但保留作為長期角色 IP 或商業化專案的選配，因其官方 API 支援以角色／主體資料訓練與版本化的自訂模型。[3]

| 子系統 | 首選方案 | 後備方案 | 使用目的 |
| --- | --- | --- | --- |
| 對話理解與結構化規劃 | 既有伺服器端 LLM（以 JSON Schema 輸出） | 使用量耗盡時的本地規劃模板 | 將自然語言轉為專案、角色、貼圖腳本與修改意圖。 |
| 角色分析 | 多模態 LLM + 已上傳圖片 | 使用者補充對話 | 建立不可變特徵、可變特徵與角色錨點。 |
| 批次貼圖生成 | Gemini 3.1 Flash Image | GPT Image 2 | 以角色錨點、角色設定和參考圖生成每張獨立貼圖。 |
| 單張修訂 | GPT Image 2 或 Gemini 多輪編輯 | 重新生成指定貼圖 | 只修改指定序號／版本，不影響其他圖片。 |
| 繁體中文字 | 程式後製 SVG／Canvas + 已核可字型 | 重新排版 | 避免模型直接產字的亂碼、截斷和錯字。 |
| LINE 輸出 | Sharp + PNG alpha、尺寸及檔案大小檢查 | 逐張自動縮放／壓縮後復檢 | 產出單張 PNG、LINE 套組 ZIP、主圖與聊天室縮圖。 |

## 二、使用者體驗與畫面結構

首頁只保留一個工作室，不再出現大量設定欄位、表格或逐張腳本表單。中央是可捲動的對話紀錄；底部是可多行輸入的訊息框、圖片／檔案附件按鈕和送出按鈕。對話區內的 AI 回應可顯示「角色設定已建立」、「已規劃 8 張」、「第 3 張修正完成」等簡短狀態；生成結果則以橫向可滑動卡片呈現，讓 Android 單手操作時仍能查看、重試、下載或指定修改。

附件行為必須支援 JPG、PNG、WEBP、HEIC／HEIF 與可安全保存的文件。HEIC／HEIF 一律維持既有的瀏覽器端轉 JPEG 做法，不把解碼風險移回伺服器。每則使用者訊息可連同 0–10 個附件提交；附件先持久化至 S3，再以資料庫記錄 URL、MIME、檔名、排序和訊息關聯。使用者可以說「幫我把這隻貓做成 8 張可愛的 LINE 貼圖，使用繁體中文」；AI 會主動建立角色設定與預覽計畫，再開始任務，而不是要求使用者逐張填表。

## 三、後端資料模型與可恢復狀態

既有的 `stickerProjects`、`stickerReferences`、`stickerScripts` 和 `stickerVersions` 保留。新資料表採追加方式，避免破壞已保存的專案。

| 新資料表 | 核心欄位 | 用途 |
| --- | --- | --- |
| `stickerConversations` | `id`、`projectId`、`status`、`lastActiveAt` | 一個專案的對話工作階段與恢復入口。 |
| `stickerMessages` | `id`、`conversationId`、`role`、`content`、`intentJson`、`createdAt` | 對話歷史、AI 意圖解析結果與可顯示的回覆。 |
| `stickerAttachments` | `id`、`messageId`、`projectId`、`fileKey`、`url`、`mimeType`、`sortOrder` | 圖片／文件的 S3 參照；不把檔案 bytes 放進資料庫。 |
| `stickerJobs` | `id`、`projectId`、`scriptId`、`kind`、`status`、`attempt`、`provider`、`errorCode`、`checkpointJson` | 規劃、角色分析、生成、文字合成、LINE 檢查等可恢復工作。 |
| `stickerExports` | `id`、`projectId`、`kind`、`url`、`qualityReportJson`、`createdAt` | 單張輸出、LINE 套組 ZIP、主圖、聊天室縮圖與報告。 |

貼圖任務必須使用固定狀態機：`queued → analyzing → generating → text_rendering → validating → completed`；可恢復錯誤進入 `retrying` 或 `paused_quota`；不可恢復錯誤進入 `failed`。每個任務各自寫入資料庫，生成第 3 張失敗不會觸碰第 1、2、4 張。外部模型回傳 `412 usage exhausted` 時，系統立即保存其現有進度，未完成任務改為 `paused_quota`，並回覆使用者：

> AI 生成額度目前已用完。你的專案、對話、角色設定、已完成圖片與未完成工作都已保存；額度恢復後輸入「繼續製作」，系統會從下一張未完成貼圖繼續。

「繼續製作」不是重新跑整個專案，而是以專案最近一個 `paused_quota`／`retrying` 工作為起點，只排入 `queued`、`failed` 或 `paused_quota` 的項目。

## 四、對話理解與編排

後端新增 `studio.sendMessage` 程序。該程序依序執行：保存使用者訊息與附件、取得最近對話歷史與專案狀態、以 LLM 的嚴格 JSON Schema 判斷意圖、保存解析結果、執行相應工作，最後保存 AI 回覆。意圖包括：`create_project`、`add_references`、`plan_pack`、`approve_plan`、`generate_pending`、`retry_sticker`、`edit_sticker`、`continue_project`、`export_line_pack`、`download_single`。

角色分析結果至少包含外觀描述、不可變特徵、服裝／毛色、配件、比例、畫風、推薦角色錨點與不確定項目。若照片角度不足或特徵不清楚，AI 不能假裝已理解，而要在對話中請求補圖或確認。規劃完成後，AI 以一段對話訊息列出 8／16／24／32／40 張的提案；使用者可以回覆「第 3 張改成比讚，文字改成收到」或「全部更可愛一點」。

## 五、圖片、角色一致性與單張修改

每一張貼圖都從同一份角色設定、角色錨點圖與精選參考圖建立 prompt。初始批次不在一個長鏈式模型對話裡連續產生超過大量圖片；每張都是獨立工作，但包含相同的穩定角色上下文，避免後段圖片逐步漂移。影片實務分析也顯示，以既有角色圖為分支產生少量變體較可控，長分支會增加扭曲風險；此資訊只能作為原型設計參考，正式產品仍以提供者官方能力與自動品質檢查為準。[6]

對話修改必須先決定目標貼圖。明確輸入「第 3 張的小貓多了一隻腳，請修正」會直接解析為 `scriptId=3`；像「眼睛大一點」這類後續訊息會沿用最近選取的貼圖卡，若沒有明確上下文則要求使用者點選或說出序號。修改後建立新的 `stickerVersions` 記錄，原版本永遠保留；只有指定貼圖卡的預覽切換到新版本。

## 六、繁體中文與 LINE 產出

圖片模型只負責角色和構圖，提示詞要求保留指定文字的安全區。系統再用可授權的繁中文字型在伺服器端繪製最終文字，並存放無字母版與輸出版。這避免把正確中文完全交給模型；官方 GPT Image 文件也明確指出文字清晰度、精確擺放和重複一致性仍有限制。[2]

LINE 靜態貼圖輸出器以官方要求為準：套組為 8、16、24、32 或 40 張；貼圖最大 370×320 px、主圖 240×240 px、聊天室縮圖 96×74 px，所有圖像為 RGB PNG、透明背景、至少 72 dpi，單圖最多 1 MB，ZIP 最多 60 MB，貼圖寬高為偶數像素且主體保留約 10 px 邊距。[5] 驗證器會對每張圖片回報透明 alpha、尺寸、偶數尺寸、檔案大小、文字安全區與可用狀態；可安全修正的問題如尺寸與壓縮將自動處理，內容缺陷則以明確訊息保留給使用者重試或修改。

## 七、手機優先設計

Android 首要視窗寬度為 360–430 px。訊息輸入列固定在安全區上方；附件以拇指可點擊的大按鈕呈現；結果卡有清楚的圖片序號、狀態、更多操作按鈕與「告訴 AI 修改這張」快捷指令。圖片上傳、生成、下載和 ZIP 匯出都不要求使用者理解英文或程式。桌面則在不改變核心對話流程下，將對話和成果面板並列。

## 八、實作順序與驗收

| 里程碑 | 主要工作 | 完成條件 |
| --- | --- | --- |
| M1：資料與對話 | Schema migration、資料庫 helper、訊息／附件／工作 API、可保存聊天 UI | 關閉重開後仍可看到對話、附件與專案。 |
| M2：理解與規劃 | 多模態角色分析、結構化貼圖規劃、可對話修改規劃 | 一句自然語言可生成可編輯的 8 張計畫。 |
| M3：生成與修改 | 提供者抽象、Gemini 整合、GPT Image 2 後備、獨立任務和版本 | 重試第 3 張不影響其他張；修改有版本史。 |
| M4：文字與 LINE | 繁中後製、LINE 檢查、主圖／縮圖／ZIP | 下載前可看到每一項規格與可修正問題。 |
| M5：韌性與驗證 | 額度中斷、繼續製作、手機 E2E、真實外部 API 回歸 | 額度中斷後僅續跑未完成任務；Android 流程可用。 |

## 九、Git 與 GitHub 推送方案

目前專案的 `origin` 是平台管理用遠端，不應覆寫。最簡單的方法是在管理介面的 **Settings → GitHub** 連結帳號、建立一個新的 **Private** repository，再匯出目前 checkpoint；這是最適合首次交接的方式。若使用命令列，應建立第二個名為 `github` 的 remote，而非將 `origin` 改成 GitHub：

```bash
cd /home/ubuntu/sticker-tycoon-replica

# 在 GitHub 先建立一個空的 Private repository，不要初始化 README、.gitignore 或 License。
git remote add github https://github.com/OWNER/sticker-tycoon.git
git remote -v

# 先確認敏感檔與大型產物沒有被加入；再建立交接提交。
git status
git add README.md docs/ research/ client/ server/ shared/ drizzle/ scripts/ package.json pnpm-lock.yaml todo.md
git commit -m "docs: add chat-first LINE sticker studio handover"
git push -u github main
```

GitHub 官方文件指出，既有專案可透過 `git remote add`／`git push -u` 推送；若使用 HTTPS，密碼欄位必須使用 Personal Access Token，不可使用帳號密碼；`.gitignore` 需要提交，以便其他協作者複製相同的排除規則。[7] [8] [9] 交接包可放進 `docs/handover/` 後再加入提交；但絕不能提交 `.env`、API key、OAuth／JWT token、使用者上傳原圖、產生的二進位圖片、`node_modules`、`dist` 或本機 log。GitHub 官方也明確警告不要 add、commit 或 push 密碼與 API key。[7]

## 十、實作前的外部依賴

Google Gemini API 整合需要一個專案專用的 `GEMINI_API_KEY`，並應透過安全設定加入伺服器環境，不可貼入聊天或原始碼。沒有此金鑰時，M1–M2、前端對話、資料保存、既有 GPT Image 2 路徑與完整模擬回歸仍可完成；但無法誠實宣稱已對 Gemini 的真實角色一致性能力完成端到端驗證。Adobe Firefly 只在日後決定使用自訂模型時再要求個別憑證。

## 參考資料

[1]: [Google Gemini API：Nano Banana image generation](https://ai.google.dev/gemini-api/docs/image-generation)
[2]: [OpenAI API：Image generation](https://developers.openai.com/api/docs/guides/image-generation)
[3]: [Adobe Firefly API：Custom Models API](https://developer.adobe.com/firefly-services/docs/firefly-api/)
[4]: [Adobe Firefly API：Structure Reference Images](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/structure-image-reference/)
[5]: [LINE Creators Market：Sticker Creation Guidelines](https://creator.line.me/en/guideline/sticker/)
[6]: [Gemini 2.0 Flash consistency demo（第三方示範；僅作實務參考）](https://www.youtube.com/watch?v=JMFeR5EywY4)
[7]: [GitHub Docs：Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
[8]: [GitHub Docs：Managing remote repositories](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories)
[9]: [GitHub Docs：Ignoring files](https://docs.github.com/en/get-started/git-basics/ignoring-files)
