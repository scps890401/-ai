# 第三階段：AI 核心能力盤點與驗收基線

**日期：** 2026-08-26
**範圍：** 現有 `phase2-agent-router` 版本與第三階段需求的差距盤點。

> 本文件區分「可接通並已測試」、「程式骨架已存在但尚未滿足驗收」與「未設定／未實作」。它不將未提供憑證的 Provider 或受額度限制的外部呼叫誤列為可用能力。

| 能力 | 現況 | 驗收判定 | 第三階段處置 |
| --- | --- | --- | --- |
| Gemini Image | `generateGeminiImage()` 已以 Gemini interactions API 實接，支援最多四張參考圖、timeout 與 quota 分類。 | **部分實作**：尚無統一 edit、analyze、healthCheck Adapter 方法。 | 封裝為 Adapter；以模型目錄／輕量端點 healthCheck；edit 依 Gemini 能力安全降級。 |
| GPT Image | Forge ImageService 已實接生成與附原圖編修；ImageService 模型清單可見 `gpt-image-2`。 | **部分實作**：尚無統一 Provider 健康／成本 metadata 或一致錯誤表面。 | 封裝為 Adapter；區分 generate、edit、analyze 與 healthCheck。 |
| FLUX | Session 內有 `Flux`／`Flux API` 連接器，但均為 disabled，且未提供使用者 BFL 憑證或商業授權。 | **未實作**。 | 提供明確 `disabled_unconfigured` Adapter；不得呼叫或宣稱 fallback 已啟用。 |
| Router | 既有 `routeImageTask()` 可依 generate／edit／cutout 與參考圖決定 Gemini、GPT 候選。 | **部分實作**：尚未整合 health、quota、速度、成本、文字與生成數量。 | 將 Provider capability／health 快照納入 Router 決策與 job checkpoint。 |
| Fallback | 生成迴圈有受限 fallback 與錯誤分類；edit 目前偏向單一路徑。 | **部分實作**。 | 統一受限嘗試次數、可轉移錯誤規則、原因與終態保存。 |
| 參考圖與 Anchor | 角色、已確認角色、姿勢、風格、目前圖、Character／Style Anchor 與優先序已存在。 | **部分實作**：缺少 scene 角色與自然語言「這張最像」提升流程的完整證據。 | 新增 scene、明確提升 accepted 生成圖與語意動作解析。 |
| 版本 | V1→V2、活動版切換與回復已由 tRPC 和瀏覽器回歸驗證。 | **已實作**。 | 保留 prompt、reference 快照、provider、quality 報告的一致版本 metadata。 |
| 品質與自動修正 | 已檢查 alpha、尺寸與輸出準備度；LINE 匯出有文字／安全邊距檢查。 | **部分實作**：尚無可測試的 fail→fix→recheck 有限循環。 | 引入 Quality Agent verdict、suggestedFix、最多一次安全自動修正與停損。 |
| 中文文字 | 伺服器端 Noto Sans CJK TC／Sharp SVG 後製與 LINE bounds 檢查已存在。 | **已實作**。 | 讓 Agent 明確將正式繁中文字路由至程式後製。 |
| Preview／Demo／Inspection | 目前僅有主工作室路由，沒有公開唯讀 Preview。 | **未實作**。 | 建立無 API、無資料庫讀取、無私人素材的 `/preview` 與 `/preview/inspection` 固定示範頁。 |
| 安全 | 既有 `.gitignore` 與手動敏感掃描；Secrets 保持在 server env。 | **部分實作**。 | 將可重複執行的 secret scan 納入測試／驗收腳本，Demo 不經真實 Provider。 |

## 實際 Provider 可用性觀察

內建 Forge ImageService 的模型清單目前回傳 `gemini-2.5-flash-image-preview` 與 `gpt-image-2`。此結果只代表平台 ImageService 能列出模型，**不代表帳戶在當下擁有可用生成額度**。既有真實呼叫已觀察到 Gemini 429 與 Forge 412 usage exhausted，因此必須以 provider health／quota 狀態保存與 resume，而非宣稱外部圖像生成已成功。

## 驗收策略

第三階段的 Adapter、Router、Quality Agent、Demo 及 Preview 均須有決定性單元／整合測試。Demo 與 Inspection 僅使用固定、非個資、非 API 的示範資料；它們展示工作流，不冒充真實模型輸出。真實 Provider 僅在 server-side Adapter 中呼叫，並保留原本的 checkpoint 與安全 fallback 行為。
