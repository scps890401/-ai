# 對話優先 LINE 貼圖工作室：廣泛研究與技術選型更新

**研究日期：** 2026-08-26（GMT+8）  
**目的：** 以官方文件為主，重新檢核現有工作室在角色一致性、圖片修改、LINE 輸出、額度中斷與手機上傳方面的技術選擇；本文件不將尚未啟用的外部服務宣稱為既有功能。

## 結論摘要

目前工作室採用的「**Gemini 3.1 Flash Image 優先，GPT Image 2 作為編輯、透明化與後備**」仍是適合以多張角色照片產生一整套貼圖的可落地基線。Gemini 官方將 Flash Image 定位為支援多參考圖與一致性的通用模型；其文件更具體標示最多 4 張角色參考圖。GPT Image 2 則適合高保真參考圖修改、遮罩式局部修正與透明背景輸出，但官方仍提醒跨多次生成的一致性與精確文字位置可能不穩定。[1] [2]

因此，**繁體中文字不可由圖像模型作為唯一來源**。現有伺服器端 SVG／Noto Sans CJK TC 疊字流程應保留，並擴充為「模型先產生無字角色與情境，程式後製文字、安全邊距與 LINE 尺寸」的唯一正式匯出路徑。LINE 的靜態貼圖需為透明 PNG、單張不超過 370×320、主圖 240×240、聊天室縮圖 96×74、每張不超過 1 MB、ZIP 不超過 60 MB，且可選數量為 8／16／24／32／40 張。[3]

| 決策層 | 建議 | 目前狀態 | 改良重點 |
| --- | --- | --- | --- |
| 自然語言理解與計畫 | 結構化 LLM 規劃角色設定、張數、動作、情境與文字 | 已有結構化規劃與備援腳本 | 新增規劃版本與差異確認，避免後續對話覆蓋既有完成貼圖。 |
| 角色一致性主生成 | Gemini 3.1 Flash Image，最多 4 張角色參考圖 | 已採 Gemini 優先，限制前 4 張 | 保存 provider interaction ID、角色參考圖排序與每張腳本的角色鎖定提示。 |
| 高難度／高價值生成 | Gemini 3 Pro Image 或已訓練的 Firefly Custom Subject Model | 未啟用 | 僅在使用者提供合規外部憑證、同意成本與訓練資料治理後評估。 |
| 指定修改與去背 | GPT Image 2 + alpha 檢查；必要時使用遮罩 | 已採用 | 儲存修改前圖、目標區域遮罩與修改版本鏈，並避免把非目標圖片重跑。 |
| 繁體中文 | 伺服器端 SVG 字型後製 | 已採用 | 增加字數、溢出、禁用字與 10 px 安全邊距檢查。 |
| 額度中斷 | 逐張任務、checkpoint、明確暫停與續作 | 已採用 | 保存 Retry-After／provider interaction ID，節流與延遲排程改為可觀察任務欄位。 |

## 模型與 API 比較

Gemini 3.1 Flash Image 支援文字與圖片的對話式生成／修改，官方將其定位為大量、多參考圖與一致性的通用模型；Gemini 3 Pro Image 則定位於更複雜的控制與品牌一致性。對角色貼圖而言，應優先保留 1–4 張能清楚覆蓋正面、側面、服裝／配件與毛色的參考圖，而不是盲目把所有照片一起送入模型。官方文件同時指出 Flash Image 支援 4 張角色參考圖、最多 10 張物件參考圖與 3 張風格參考圖；因此產品 UI 應讓 AI 自動挑選參考組合，並在對話中向使用者說明已採用哪些照片。[1]

> Gemini 官方將 Gemini 3.1 Flash Image 描述為「在多參考圖處理與一致性方面表現出色」的通用工作模型。[1]

OpenAI 的 GPT Image 文件顯示，Images Edits 支援一張或多張來源圖；Responses API 允許以先前 response／image ID 延續多輪圖像對話。對「第 3 張多了一隻腳」這種操作，系統應把第 3 張既有成圖、原始角色參考與明確修改提示一併送入編輯，而不是重新規劃整套貼圖。文件同時指出 GPT Image 2 對輸入圖採高保真處理、可要求透明背景，但仍可能在跨多張生成時失去角色一致性或無法精確放置文字，支持本產品採取雙模型與文字後製策略。[2]

Adobe Firefly Custom Models 是值得保留的進階選項：官方明示可訓練 subject model 來捕捉特定角色、產品或物件，並用 asset ID 在不同請求間維持一致。其 style／structure reference 也提供 1–100 強度控制與非同步工作。這條路徑可在未來為高價值、長期角色專案提供更強的一致性，但它需要額外 Adobe client credentials、訓練資料治理、費用與使用者同意；目前不應在沒有這些條件下硬整合。[4] [5] [6]

| 方案 | 最適用工作 | 一致性機制 | 主要限制／風險 | 本產品定位 |
| --- | --- | --- | --- | --- |
| Gemini 3.1 Flash Image | 角色參考圖驅動的多張貼圖、日常批次 | 最多 4 張角色參考圖與互動 ID | 受專案級 RPM／IPM／RPD 與 429 限制 | 主要生成模型。 |
| Gemini 3 Pro Image | 複雜構圖與高保真角色成果 | 多參考圖與更高階控制 | 較昂貴、需先確認可用額度與成本 | 選用升級路徑。 |
| GPT Image 2 | 指定單張修改、遮罩、透明輸出 | 高保真輸入與多輪 response state | 文字與跨次一致性仍非完全可靠 | 編輯／後備／透明處理模型。 |
| Firefly Custom Subject Model | 長期固定角色或品牌 IP | 訓練 subject model、asset ID | 外部憑證、成本、訓練資料權利與時間 | 未來付費進階整合候選。 |

## LINE 匯出與文字可靠性

LINE 的官方規範要求 PNG、透明背景、RGB、至少 72 dpi，並建議貼圖內容與裁切邊緣保有約 10 px 間距。圖像模型即使可產生較可讀文字，也不能保證繁中沒有錯字、截斷或歪斜；尤其 OpenAI 官方文件明確列出精確文字位置與清晰度仍是限制。因此，現有的「角色無字圖 → Sharp 正規化與 alpha 檢查 → SVG／Noto Sans CJK TC 疊字 → 370×320 貼圖、240×240 主圖與 96×74 縮圖 → ZIP 品質報告」是正確方向，應加上文字最大字數、行距、換行、避開角色臉部與 10 px 邊距檢查。[2] [3]

## 額度、錯誤與自動續作

Gemini 的限制按專案計算，可能包含 RPM、TPM、RPD 與圖片每分鐘；花費型限制會回傳 `429 RESOURCE_EXHAUSTED`。官方建議短暫等待、降低昂貴請求頻率或申請提高限制。OpenAI 對暫時性 429 建議尊重 `Retry-After` 並加上 jitter 的指數退避，但明確提醒不要重試需要使用者處理的 quota、billing 類錯誤。故系統應把「短暫速率限制」與「額度／計費用盡」分開：前者建立 `retry_at` 排程，後者切為 `paused_quota`、保存 checkpoint 並等待使用者輸入「繼續製作」。[7] [8]

Gemini Interactions API 的背景執行會立刻回傳 interaction ID，可輪詢、串流或在連線中斷後恢復；不過官方現行文件把 background execution 限定於標準 Gemini／Managed Agents，不能在未驗證圖像模型支援前假定可直接用於 Image 工作。產品應先持續使用自己的 MySQL job state 作為唯一真實來源，再把可用的 provider interaction ID 視為補強 checkpoint，而非唯一保存方式。[9]

## 手機上傳與 HEIC

HEIC／HEIF 在瀏覽器的解碼支援並不一致。現有做法以 `heic2any` 在裝置端將 HEIC 轉成 JPEG／PNG，再上傳到 S3，符合該工具的瀏覽器端用途，也避開伺服器 libheif 安全限制。應持續保留逐檔錯誤、12 MB 上限、多檔佇列與原始檔名／轉檔結果的顯示；必須注意此工具不保留原始 HEIC metadata，因此角色理解應依轉換後影像像素，不依賴 EXIF。[10]

## 不破壞現有功能的優先改良清單

1. 將每次 Gemini 生成回應的 interaction ID、使用的參考圖 ID、模型、大小及 provider request ID 存入 `stickerJobs.checkpointJson`，讓單張修改與續作可回到相同模型上下文。
2. 將任務狀態補為 `queued`、`generating`、`removing_background`、`quality_checking`、`completed`、`retrying`、`paused_quota`、`failed`，並在 UI 顯示可理解的下一步。
3. 對「第 N 張」修改新增 LLM 解析信心度與確認追問；解析不確定時禁止誤修改其他貼圖。
4. 匯出前新增文字 bounding-box、安全邊距、透明像素比例、檔案大小與主圖／縮圖缺漏檢查；保留品質報告與可單張修正入口。
5. 只有在取得使用者明確提供的 Adobe 憑證、訓練資料權利說明與成本同意後，才評估 Firefly Custom Models 整合；否則不要將其宣稱為現有能力。

## 參考資料

[1]: [Google AI for Developers — Nano Banana image generation](https://ai.google.dev/gemini-api/docs/image-generation)
[2]: [OpenAI Developers — Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
[3]: [LINE Creators Market — Sticker guidelines](https://creator.line.me/en/guideline/sticker/)
[4]: [Adobe Developer — Firefly API overview](https://developer.adobe.com/firefly-services/docs/firefly-api/)
[5]: [Adobe Developer — Style image reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/style-image-reference/)
[6]: [Adobe Developer — Structure image reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/structure-image-reference/)
[7]: [Google AI for Developers — Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
[8]: [OpenAI Developers — Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
[9]: [Google AI for Developers — Background execution](https://ai.google.dev/gemini-api/docs/background-execution)
[10]: [heic2any — Browser-side HEIC/HEIF conversion](https://github.com/alexcorvi/heic2any)
