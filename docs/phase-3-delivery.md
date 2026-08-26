# 第三階段：可驗收多模型貼圖 Agent 交付紀錄

**版本目的。** 本階段將第二階段的 Router 原型收斂為可測試的 Provider Adapter、可解釋路由、有限品質修正、整套自然語言修改，以及不存取私人資料的公開 Preview／Inspection。所有描述均以目前程式與測試可驗證的範圍為準。

## 能力矩陣

| 項目 | 交付狀態 | 可驗證行為 | 刻意不宣稱的能力 |
| --- | --- | --- | --- |
| Gemini Adapter | 已實作 | `generate`、多參考圖、health 快照、interaction metadata。 | 外部 API 額度耗盡時不保證即時生成。 |
| GPT Image Adapter | 已實作 | `generate`、`edit`、`cutout`、`analyze`、Forge 模型清單 health。 | 不保證模型能穩定生成正確繁中文字。 |
| FLUX.2 | Disabled | Router 清楚回傳未設定憑證與商業授權，不會假裝 fallback 可用。 | 未整合、未呼叫、未宣稱已啟用。 |
| Router | 已實作 | 依工作類型、參考圖、批次量、速度／成本偏好和 Provider health 保存候選及每次嘗試。 | 不以盲目無限重試處理 quota。 |
| 角色與參考圖 | 已實作 | `character`、`accepted_character`、`pose`、`scene`、`style`、`accepted_style`、`current_edit` 具可重現優先序。 | 不宣稱已完成生物特徵辨識或人臉鑑別。 |
| Quality Agent | 已實作 | 透明覆蓋、尺寸、畫布邊界、文字長度檢查；失敗時最多 Fix 一次後重新檢查。 | 未執行視覺模型時，不把臉部／肢體語意檢查標為通過。 |
| 整套修改 | 已實作 | 「全部變可愛一點」與「全部去背」從聊天入口建立獨立 edit job／版本；跳過已合格或有衝突生成工作的貼圖。 | 不覆寫既有版本、不吞掉 queued／retrying／paused 任務。 |
| Preview／Inspection | 已實作 | `/preview`、`/preview/inspection` 使用固定原創兔子、唯讀附件與本機狀態；回歸驗證零 `/api/trpc` 呼叫。 | 不讀取私人專案、不上傳檔案、不呼叫真實圖像 API。 |

## 執行鏈

> 生成或修改工作採用有限且可追溯流程：**路由決策 → Provider 嘗試 → 透明化／品質檢查 → 至多一次 Fix → 重檢 → 版本保存或 quota checkpoint**。

當所有設定中的 Provider health 都標示為 quota exhausted，工作會保存為 `paused_quota`，而非一般 `failed`。使用者可輸入「繼續製作」，僅續跑未完成項目。每次整套修改也採用每張獨立 job、獨立版本與獨立狀態，因此重試或回復單張不影響其他圖片。

## 資料與 migration 判斷

本階段沒有更動 `drizzle/schema.ts`。新增的 Provider health、候選、品質、scene role、pack scope、品質修正次數與事件都儲存於既有 `routerJson`、`qualityReportJson`、`checkpointJson`、`metadataJson`、`planJson` 與 `stickerAgentEvents`，因此**不需新增或套用 migration**。既有第二階段 migration `drizzle/0003_grey_sentinel.sql` 仍是最新已套用 schema 遷移。

## 驗證紀錄

| 驗證層 | 結果 | 覆蓋內容 |
| --- | --- | --- |
| TypeScript | 通過 | 前後端 Router、tRPC、Preview routes 與 UI 型別。 |
| Vitest | 33 / 33 通過 | Provider Adapter、FLUX disabled、health／quota fallback、品質 fail→Fix→Recheck、Scene Reference、版本、整套修改、queued／retrying／paused 保留、LINE 匯出。 |
| 桌面瀏覽器 | 通過 | 主工作室與 Preview／Inspection，含 Provider health、Preflight、版本、下載及零 Studio API Demo。 |
| Android 瀏覽器 | 通過 | 390×844 主工作室與 Preview／Inspection，含附件／HEIC 示範、規劃、輸出與互動。 |
| Production build | 通過 | `NODE_OPTIONS=--max-old-space-size=1024 pnpm build`。輸出存在既有大 chunk 警告，並非建置失敗。 |
| 提交前安全掃描 | 通過 | 無 `.env`、實際 token、預簽 URL、使用者上傳路徑、`dist/`、`node_modules/` 或回歸輸出被納入待提交來源。 |

## 已知限制與後續驗收

外部 Gemini／Forge API 的真實呼叫仍可能因帳戶額度回傳 `429`、`412` 或其他可恢復錯誤。這不會被受控 E2E 或 Preview 成功路徑誤稱為真實生成成功；系統會保存 checkpoint。要驗收真實視覺品質、角色一致性、臉部／肢體與模型內中文字，必須在有可用外部額度及取得使用者授權測試素材時，執行獨立的真實多圖 E2E。
