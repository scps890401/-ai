# 聊天附件、多輪修改與隨機引導驗證

## 已驗證

以真正 390 × 844 viewport 執行 `tools/verify_chat_attachments_and_revision.mjs`。聊天框可選取 `/home/ubuntu/upload/1787063087666.jpg`，附件標籤顯示 1 筆，送出「我沒有想法，幫我抽一張靈感」後附件仍保留 1 筆。聊天 planner 回覆已進入抽獎分流，前端也執行 lotteryGenerate。

## 外部限制

本次測試的 `stickers.lotteryGenerate` 回應 HTTP 500，後端錯誤為 `failed_precondition: your account has hit a usage exhausted`。因此未能在目前額度狀態下取得新的 AI 圖片；聊天框已顯示「AI 圖片服務暫時無法生成，可能是服務忙碌或額度已用完」的可理解錯誤提示。這是外部影像服務額度限制，不是附件或意圖分流錯誤。

## 程式驗證

`pnpm test` 通過 15 個測試檔、73 項測試；TypeScript 與正式建置通過。純函式測試涵蓋無想法關鍵字、lottery/refine 計畫、生成後沿用最近結果的決策，以及附件／生成結果上下文 schema。
