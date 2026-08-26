# 公開 Preview／Inspection 與安全邊界

| 路徑 | 用途 | 資料邊界 |
| --- | --- | --- |
| `/preview` | 唯讀 Demo，展示 Chat-first、上傳、Agent 進度、8 張網格、修改、品質與輸出 UI | 固定測試資料；不登入、不呼叫 API、不讀取 project／S3／個資 |
| `/preview/inspection` | 截圖與 UI inspection 專用版本，額外顯示 desktop／mobile checklist | 與 `/preview` 相同，清楚標示 DEMO／PREVIEW |

Preview 不是正式生圖流程，頁面明確標示為展示。`pnpm security:scan` 會掃描可提交的 source、document 與 preview 檔案中的常見 OpenAI、Google、AWS、GitHub token 或私鑰模式；掃描不會讀取或提交 `.env`。
