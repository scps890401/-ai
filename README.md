# Sticker Muse：AI LINE 貼圖工作室

Sticker Muse 是一個 **Chat-first、可保存、可續作** 的 AI LINE 貼圖製作工作室。使用者可以直接用繁體中文描述需求、上傳 1–4 張角色照片，讓系統規劃 8／16／24／32／40 張貼圖，並在單一貼圖上重試、修改、回復版本與輸出 LINE 格式素材。

## 使用者操作

使用者只要在聊天框輸入，例如「幫我的貓做 8 張日常 LINE 貼圖，使用繁體中文」，再上傳角色照片。AI 會分析角色、規劃貼圖並逐張生成。生成後可直接說「修改第 3 張的眼睛大一點」、「我喜歡第 2 張，以後全部照這個風格」、「查看第 3 張版本歷程」或「回復第 3 張 V2」。

貼圖檔案會保存至專案，進度／對話／角色設定／已完成圖片／版本／ZIP 都能在中斷後回復。LINE 匯出會執行 PNG、尺寸、透明背景、單檔大小與 ZIP 容量檢查。

## 開發

```bash
pnpm install
pnpm dev
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

本專案為 React、tRPC、Drizzle／MySQL、S3 與內建 Forge AI 的全端應用。影像生成與 LLM 僅在伺服器端執行；使用者素材與生成資產以 S3／project asset metadata 保存。

## 第二階段文件

| 文件 | 說明 |
| --- | --- |
| [Agent 架構](docs/architecture.md) | Chat-first orchestration、資料流與資料模型 |
| [Model Router](docs/model-router.md) | provider 選擇、健康度、retry／fallback 邊界 |
| [Character／Style Anchor](docs/character-style-anchor.md) | 多參考圖與一致性優先順序 |
| [Edit 與版本](docs/editing-versions.md) | 指定貼圖修改、version history 與回復 |
| [Quality／Fallback](docs/quality-fallback.md) | deterministic gate、vision review 與人工確認 |
| [Quota／Resume／Safety](docs/quota-resume-safety.md) | 中斷保存、續作與資料安全 |
| [GitHub 交接](docs/github-handover.md) | `scps890401/-ai`／`chat-first-studio` 同步流程 |
| [Provider Adapter](docs/provider-adapters.md) | 第三階段多模型介面、路由 audit 與 fallback 邊界 |
| [語義 Reference／Edit](docs/reference-and-edit.md) | Character／Style／Pose／Scene／Current 的輸入角色 |
| [Preview／Demo](docs/preview-demo.md) | 公開唯讀 `/preview`、`/preview/inspection` 與 secret scan |
| [Preview Inspection Package](docs/preview-inspection/PREVIEW-REPORT.md) | 18 張真實瀏覽器 PNG、功能分級、DOM／響應式報告、視覺稽核與截圖索引 |

> 外部 Gemini／FLUX adapter 已保留於 Model Router 設計，但不會在沒有專案擁有的 API 憑證時假裝可用。內建 ImageService 是目前可用基線；影像額度耗盡時系統會保存而非盲目重試。

## 公開 UI 檢查

`/preview` 與 `/preview/inspection` 是不登入、不讀取使用者專案、不呼叫 AI 的固定展示頁，供 UI 檢查、截圖與 Android 回歸使用。提交前可執行 `pnpm security:scan`，檢查可提交原始碼與文件是否含常見憑證模式。

目前實際畫面的可讀取檢查包位於 [`docs/preview-inspection/`](docs/preview-inspection/)；其中 [`PREVIEW-REPORT.md`](docs/preview-inspection/PREVIEW-REPORT.md) 明確標示 IMPLEMENTED、PARTIALLY_IMPLEMENTED、DEMO_ONLY 與 NOT_IMPLEMENTED，`PREVIEW-SCREENSHOTS/` 保留 18 張非設計稿的真實瀏覽器 PNG。
