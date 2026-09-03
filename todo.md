# GitHub 同步工作清單

- [x] 檢查目標儲存庫、分支與目前專案檔案狀態。
- [x] 確認同步內容不含 `.env`、API Keys、Secrets 或私人資料。
- [x] 補上 Phase 1 README 完成狀態與範圍說明。
- [x] 建立 `phase1-chat-ui` 分支並提交完整原始碼。
- [x] 推送後核對遠端 commit 與檔案清單。

# Phase 2 AI Core 工作清單

- [x] 升級為全端專案並建立 `phase2-ai-core` 的 GitHub 工作分支。
- [x] 設計並套用 threads、messages 的 Drizzle 資料模型與遷移。
- [x] 實作 Server-side Provider Router、逾時 Fallback 與 Tool Registry。
- [x] 建立 `/api/chat` SSE 串流端點與對話讀取端點。
- [x] 將 Composer 串接真實串流、對話載入與持久化流程。
- [x] 驗證貼圖企劃工具意圖、跨訊息 Context、重新整理資料保留與無敏感資料外洩。
- [x] 推送並核對 GitHub `phase2-ai-core` 分支。

# Phase 2.5 修正完成記錄

- [x] 三方比對完成：對話／附件施工指令、GitHub phase2-ai-core 與本地工作區基線已核對。
- [x] 建立六種 ProviderState 與 Provider Adapter 契約。
- [x] 實作 ZERO_SPEND_GUARD，所有本階段 AI Request 入口在 streamText 前執行 Fail-Closed 檢查。
- [x] 移除 Gemini 失敗後自動切換 OpenAI；OpenAI Adapter 固定 PAID_NOT_ALLOWED 且不加入 candidates。
- [x] 以最小 JSON 欄位補足 threads.characterProfile 與 messages.textLayers 保存／讀取契約。
- [x] 將既有 Provider 憑證測試改為離線測試，禁止測試向 OpenAI／Google 發送請求。
- [x] 新增 Guard 與 Profile／Text Layer contract tests；pnpm check 與 pnpm test 通過。
- [x] 產生並套用 Drizzle migration 0001_nappy_senator_kelly.sql。
- [ ] Phase 3 保持暫停，等待明確開發指令。

> 本記錄不代表開始 Phase 3；生圖 API、FLUX、Inpainting、Gallery、ZIP、付款、Credit 與無限 Retry 均未實作。
