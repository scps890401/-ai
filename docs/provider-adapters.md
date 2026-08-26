# 第三階段 Provider Adapter 與路由稽核

`server/imageRouter.ts` 定義所有圖片 provider 必須遵循的統一介面：`generate()`、`edit()`、`analyze()` 與 `healthCheck()`。Router 根據任務、語義 reference role、批量、品質、速度／成本偏好與健康度選擇 adapter，並在每次嘗試記錄 provider、model、選擇原因、錯誤分類與 fallback 原因。

| Provider | 當前狀態 | 實際用途 |
| --- | --- | --- |
| internal-gpt-image-2 | IMPLEMENTED | 預設高品質生成與 edit |
| internal-service-default | IMPLEMENTED | 暫時性故障時的內建 fallback |
| Gemini adapter | PARTIALLY IMPLEMENTED | 介面與健康度已存在；需安全提供 server-side key 後才可呼叫 |
| FLUX adapter | PARTIALLY IMPLEMENTED | 介面與健康度已存在；需安全提供 server-side key 後才可呼叫 |

quota／usage exhausted 不會被盲目 fallback，因為這可能造成非預期計費；會保存 job 供「繼續製作」使用。timeout、429 或暫時服務錯誤才會啟動有限 fallback。`sticker_jobs` 會保存 provider、model、routing JSON 與 quality JSON；`sticker_job_versions.metadataJson` 保存 prompt、reference context、routing 與品質快照。
