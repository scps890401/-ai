# 第四階段公開網域驗證紀錄

## 驗證範圍

第四階段 checkpoint `9b391b17` 建立後，已在受管開發預覽以桌面 1280px 與 Android 390px 執行 `/preview`、`/preview/inspection` 回歸。回歸驗證固定 Demo 的完整流程、八張任務、V2、Anchor、Quality Fail → Fix → Pass、quota checkpoint、LINE Preflight、Inspection Desktop／Mobile 切換，以及零 `/api/trpc` 與零影像 Provider 請求。

## 公開網域觀察

於 2026-08-26（GMT+8）首次以未登入瀏覽器開啟 `https://stickertyco-wsz8yoes.manus.space/preview` 與快取旁路 URL 時，網域可匿名開啟，但暫時回傳舊版公開示範頁。隨後收到部署成功通知後再以快取旁路 URL 重試，`/preview` 已顯示「DEMO / PREVIEW · 這是 AI Inspection Preview，不代表真實 AI API 生成結果」與 `Demo 製作進度`；`/preview/inspection` 亦已顯示 Desktop View／Mobile View、Selected Model／Fallback、Quality Check／Retry 與 Quota／Resume／Export。

公開部署日誌端點在初次觀察時未提供目前服務的容器日誌，因此本紀錄保留初始傳播延遲作為追蹤脈絡。最終匿名瀏覽器結果確認 checkpoint `9b391b17` 的第四階段 UI 已傳播至公開網域。

## 後續重新驗證清單

| 項目 | 成功條件 |
| --- | --- |
| `/preview` | **已通過。**未登入可開啟，並顯示 DEMO／PREVIEW notice、完整聊天、八張共用 Sticker Task、V2、Quality、quota 與 LINE Preflight。 |
| `/preview/inspection` | **已通過。**未登入可開啟，Desktop／Mobile View 可切換，並有 Selected Model／Fallback、Quality Check／Retry、Quota／Resume／Export 摘要。 |
| 網路邊界 | **已通過自動回歸。**桌面與 Android 瀏覽器回歸均顯示 0 個 `/api/trpc` 與 0 個 Gemini、GPT Image、Forge、FLUX 等影像 Provider 請求。 |
| 安全 | **已通過匿名頁面檢查。**不顯示使用者資料、API Key、token、預簽 URL 或登入流程。 |
