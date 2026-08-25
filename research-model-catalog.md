# 內建模型目錄快照

查詢時間：2026-08-26（使用專案內建 Forge `/v1/models`）。

目前可查到的文字／多模態規劃模型包括：`claude-haiku-4-5`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-sonnet-4-6`、`gemini-3.1-pro-preview`、`gemini-3-flash-preview`、`gpt-5`、`gpt-5.5`、`gpt-5-mini`、`gpt-5-nano`。本次目錄回應主要列出 LLM 模型，沒有在截取結果中列出可直接替換 `generateImage()` 的外部圖像模型；因此目前影像生成仍應透過現有 ImageService adapter，並把 provider 介面抽象化，以便日後接入 Gemini／FLUX／其他有正式 connector 的服務。

目前實作決策：規劃與結構化 JSON 使用內建 LLM；影像生成保留現有內建 GPT Image 2 adapter 作為可運作基線；角色一致性、多參考圖與外部模型不在沒有金鑰／connector／實測前硬接，先建立可替換的 provider contract、錯誤事件與專案保存機制。
