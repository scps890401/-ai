# AI LINE 貼圖工作室：模型與輸出研究補充

更新日期：2026-08-26

## 研究結論摘要

Sticker Muse 應維持「**聊天規劃與角色視覺設定 → 逐張獨立圖像工作 → 程式繪製繁體中文 → LINE 驗證與可恢復匯出**」的分工，而不把正確繁中貼圖文字完全交給圖像模型。這可將角色一致性、文字正確性與 LINE 合規性拆成能分別驗證的步驟。

| 任務 | 候選方案 | 可驗證優勢 | 建議角色 |
| --- | --- | --- | --- |
| 現有核心生成／編輯 | Manus 內建 ImageService（預設 GPT Image 2） | 已接入現有 tRPC、S3、job retry 與 quota fallback | 預設供應者；不破壞目前可用流程 |
| 高一致性參考圖編輯 | FLUX.2 | 官方文件指出多參考圖編輯可保留角色身份，API 支援至多 8 張參考圖；其 `max`、`pro`、`flex` 可在品質、產能與文字控制間分工 [1] [2] [3] | 建議作為可選的高一致性 provider，需由站主新增自己的 API 憑證後啟用 |
| 多圖融合與自然語言修改 | Gemini 2.5 Flash Image | Google 宣告支援角色一致性、同一角色多場景、自然語言定向修改與多圖融合 [4] | 可作為第二供應者；需獨立 API 金鑰與成本／品質實測後才開啟 |
| 繁體中文文字 | Canvas 文字圖層 | 可由本地字型與程式確認實際字串、位置與截斷，不受圖像模型拼字漂移影響 | 維持目前 LINE 輸出繪字流程，不把重要文字直接交給影像模型 |

## 角色一致性工作流

建議把上傳圖像先存為可重用 reference assets，使用視覺模型建立角色設定（物種／臉部特徵／毛色或髮型／服飾／配件／比例／禁忌），再把這份設定與同一批 reference assets 帶入每一張獨立 job。對「第 N 張」修改，使用**該張目前版本**與角色設定做局部重繪或語義修改，完成後建立新的 job version，而不是覆寫整套貼圖。

這種設計符合 FLUX.2 以多參考圖進行身份保留與迭代編輯的官方做法 [1]，也與 Gemini 官方示範的「先建立角色素材，再用素材產生一系列圖像」一致 [5]。

## LINE 靜態貼圖輸出基準

LINE Creators Market 的一般貼圖指南規定：貼圖組數為 8、16、24、32 或 40；貼圖圖檔最大 370 × 320 px；主圖 240 × 240 px；聊天室縮圖 96 × 74 px；所有圖檔為 PNG、RGB、至少 72 dpi、透明背景；單圖最大 1 MB，整包 ZIP 最大 60 MB [6]。現有輸出流程應以這些值為 validation source of truth，並在下載前阻止違規輸出。

## 架構決策

本輪不會把未設定憑證的第三方模型偷偷接入產品。先保留已可用的內建 ImageService，並將「provider adapter」作為後續擴充點：只有當站主安全新增 Google 或 Black Forest Labs API 金鑰、且完成真實角色一致性基準測試後，才讓使用者在聊天工作流中選用該 provider。此做法可避免把展示性模型比較誤當成可生產功能。

## 限額、中斷與續作策略

圖像工作必須逐張持久化為獨立 job。當供應者回傳短暫性速率限制、逾時或 5xx 時，可標記為 `retrying` 並採取有限次退避重試；當回傳信用額度、專案支出上限或使用量耗盡時，則必須立即停在 `paused`，不可持續重送。OpenAI 官方指南明確區分「速率限制」與信用／支出／使用額度耗盡，且指出重試後者不會恢復存取 [7]。Gemini 文件也把 `429 RESOURCE_EXHAUSTED` 列為支出型限制，建議降低昂貴請求或等待後再試 [8]。

因此，Sticker Muse 的 resume 應只挑選未完成、失敗或重試中的 position，已完成圖片與其 asset version 維持不變。聊天顯示應直接告知使用者：草稿已保存，額度恢復後輸入「繼續製作」即可從下一個未完成 position 再次提交。

## 參考資料

[1] [Black Forest Labs：Character & Style Consistency](https://docs.bfl.ai/guides/usecases_editing_character_consistency)

[2] [Black Forest Labs：FLUX.2 Image Editing](https://docs.bfl.ai/flux_2/flux2_image_editing)

[3] [Black Forest Labs：FLUX.2 Overview](https://docs.bfl.ai/flux_2/flux2_overview)

[4] [Google Developers Blog：Gemini 2.5 Flash Image](https://developers.googleblog.com/introducing-gemini-2-5-flash-image/)

[5] [Google Codelab：Generating Consistent Imagery with Gemini](https://codelabs.developers.google.com/gemini-consistent-imagery-notebook)

[6] [LINE Creators Market：Sticker Guidelines](https://creator.line.me/en/guideline/sticker/)

[7] [OpenAI API：Error Codes](https://developers.openai.com/api/docs/guides/error-codes)

[8] [Google AI for Developers：Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
