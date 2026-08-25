# Sticker Muse AI 貼圖工作室研究基線

## 研究結論

Sticker Muse 應採用「文字／視覺規劃模型 + 角色設定檔 + 圖像生成／編輯模型 + 確定性輸出處理」的分層架構，而不是把每張圖當成獨立的單次 prompt。角色一致性要靠可重用的角色設定、固定的參考圖集合、每張貼圖的結構化規劃與編輯時只傳入目標貼圖，不應只依賴模型記憶。

目前內建 `generateImage()` 預設使用 GPT Image 2，中等品質，且支援 `originalImages` 圖片輸入；內建模型清單可動態查詢，因此第一階段可保留現有服務並抽象化 provider。OpenAI 官方文件明確支援由文字生成，也支援以一張或多張來源圖片進行編輯。[1] 

Google Gemini 官方文件將 Nano Banana 2 Lite 定位為速度與成本優先、且不適合多參考圖或複雜多輪編輯；Nano Banana 2 支援較多參考圖處理與一致性；Nano Banana Pro 適合高品質、複雜定位與更高等級一致性。[2] 因此 Gemini 適合作為規劃／視覺理解與多輪編輯候選，但不可在沒有實際 connector、金鑰與成本驗證前直接寫死。

Black Forest Labs 官方 FLUX.2 頁面主打 production-grade 生成與編輯、multi-reference control，並宣稱最多可參考 10 張圖片及強一致性。[3] 這使 FLUX.2 適合作為外部高一致性 provider 候選；實作上應以 provider adapter、超時、重試、熔斷與額度事件處理隔離外部 API。

## LINE 輸出基準

LINE Creators Market 官方靜態貼圖規格是主圖 1 張 240×240、貼圖 8／16／24／32／40 張且單張最多 370×320、聊天縮圖 1 張 96×74。全部使用 PNG，尺寸應為偶數，至少 72 dpi、RGB，單檔不超過 1 MB，整包 ZIP 不超過 60 MB，背景必須透明。[4] 官方也建議裁切內容與邊緣保留約 10 px 邊距，並要求日常溝通中容易理解與使用。[4]

目前網站已有多尺寸轉換與 ZIP，但升級時應把輸出檢查變成可保存的 export report，明確記錄每張圖片的尺寸、alpha、色彩模式、檔案大小、修正動作與失敗原因。

## HEIC／HEIF

MDN 的瀏覽器圖片格式指南列出網頁常用格式與 fallback 策略，但不把 HEIC／HEIF 列為一般跨瀏覽器圖片格式。[5] 因此手機上傳必須接受 HEIC／HEIF MIME 與副檔名，前端先嘗試解碼；若瀏覽器不能解碼，應把原檔上傳到 server 轉成 JPEG/PNG，並保留原始檔引用。不能只依靠 `<img>` 預覽成功與否判定上傳成功。

## 建議模型分工

| 工作 | 第一階段建議 | 備選／研究對象 | 原因 |
|---|---|---|---|
| 需求理解、貼圖套組規劃、修改意圖 | 內建 LLM 結構化輸出 | Gemini／其他可用 LLM | 需要可測試的 JSON，不應讓圖像模型決定資料結構 |
| 角色特徵分析 | 內建 LLM 視覺輸入 + 結構化 character bible | Gemini Pro Image／視覺模型 | 先產生可保存設定，再供每張圖使用 |
| 初次貼圖生成 | 內建 GPT Image 2 adapter | FLUX.2／Gemini Nano Banana 2 | 先利用現成整合，provider 可替換 |
| 角色一致性與多參考圖 | provider adapter，優先評估 FLUX.2 多參考能力 | Gemini Nano Banana 2／Pro | 多參考圖比單一 prompt 更適合固定外觀 |
| 指定單張修改 | image edit adapter，只傳目標圖與角色參考 | GPT Image edit／Gemini conversational edit | 只更新指定 sticker job，避免重做整套 |
| 貼圖文字 | AI 產生文字與版面意圖；輸出層做可編輯文字與檢查 | 圖像模型直接繪字作為視覺備援 | LINE 可讀性與繁中正確率需要可檢查、可重做的流程 |

## 架構原則

1. 先建立資料庫專案模型，再把目前 Home.tsx 的暫存 state 逐步投影到專案狀態。
2. 每個 sticker job 必須有獨立狀態與錯誤事件；批次只是一組 job，不可用一個 boolean 代表全批次。
3. 任何 provider 回傳 quota、rate limit、timeout、content policy 或 network error，都要先保存 checkpoint，再更新 job 狀態；繼續製作只挑選 pending／failed-retryable job。
4. 角色設定與對話歷史是專案資料，不是只存在 React state 或 localStorage；匿名模式可先使用本機 draft，但要明確標示跨裝置保存需要登入。
5. 使用者介面保持單一 AI 對話入口；細節放在可展開的「製作進度」與「角色設定」抽屜，不在首頁堆欄位。

## 來源

[1] OpenAI, Image generation: https://developers.openai.com/api/docs/guides/image-generation
[2] Google AI for Developers, Gemini API image generation: https://ai.google.dev/gemini-api/docs/image-generation
[3] Black Forest Labs, FLUX.2: https://bfl.ai/models/flux-2
[4] LINE Creators Market, Sticker creation guidelines: https://creator.line.me/en/guideline/sticker/
[5] MDN, Image file type and format guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
