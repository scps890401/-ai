# Model Router

`server/imageRouter.ts` 將生成任務映射成能力與故障策略，而不是暴露模型下拉選單。現行順序為內建 GPT Image 2，再到內建服務預設模型；兩者都可使用既有 Forge ImageService。Gemini 與 FLUX registry 項目預設為未配置，只有站主安全輸入專案 API 憑證並完成健康檢查後才能啟用。

| 情況 | Router 行為 |
| --- | --- |
| 新圖或 edit | 優先內建 GPT Image 2；最終貼圖使用 high quality |
| timeout／5xx／暫時 unavailable | 對同一 job 有限 fallback，並記錄 provider health cooldown |
| 429 rate limit | 可有限退避／fallback，但不重複無限制呼叫 |
| credit、quota、usage exhausted | 立即停止、保存 job、顯示續作；不切換到可能造成意外計費的 provider |
| 內容或安全拒絕、無效輸入 | 不 fallback；回覆具體可修正原因 |

選型根據官方文件與多參考圖 benchmark：GPT Image 支援多圖 edit；Gemini 3 Image 支援角色與風格參考；FLUX.2 主打多參考圖／角色與姿勢組合；MultiBanana 顯示多參考圖會受數量、風格與尺度差異影響，不能只依模型名稱假設一致性。[研究來源](../research-studio-refresh.md)
