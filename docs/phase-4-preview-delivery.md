# 第四階段交付：公開 AI Inspection Preview

## 交付目的

`/preview` 與 `/preview/inspection` 是供外部 AI、開發者與測試人員匿名讀取的固定流程檢查頁，不是供使用者建立真實貼圖專案的替代入口。

> **這是 AI Inspection Preview，不代表真實 AI API 生成結果。**

| 公開頁面 | URL | 檢查重點 |
| --- | --- | --- |
| Preview | `https://stickertyco-wsz8yoes.manus.space/preview` | 完整 Demo 對話、附件、Anchor、八張任務、品質、quota 與 LINE 匯出流程。 |
| Inspection | `https://stickertyco-wsz8yoes.manus.space/preview/inspection` | 同一流程的 Desktop View／Mobile View 與僅供開發檢查的 Router 摘要。 |

## 正式 UI 共用方式

Preview 不複製或另寫平行假 UI。正式首頁與公開頁面共同使用 `client/src/components/StudioSharedUI.tsx`：`StudioTopbar`、`StudioMessage`、`StudioAgentWorkspace`、`StudioComposer`、`StudioStickerTask`、`StudioPreflight` 與 `StudioDemoExport`。兩者共用 `client/src/chat-studio.css` 的版型、訊息、Composer、任務卡、Preflight 和匯出樣式；`preview-demo.css` 僅補充 Demo notice、流程控制與 Inspection 裝置框。

正式首頁保留真實 tRPC、檔案選擇、HEIC 裝置端轉檔、專案保存、Provider 路由、版本回復與 PNG／ZIP 匯出。公開頁則明確將所有控制限制為本頁 React state，避免示範頁誤成真實製作入口。

## 固定流程覆蓋

| 流程 | Preview 中的固定示範 |
| --- | --- |
| Chat-first 起點 | 「我想製作 LINE 貼圖」與助理引導；8／16／24／32／40 張、上傳角色、AI 自動規劃、開始製作按鈕。 |
| 附件與 Anchor | 固定兔子角色圖、HEIC → JPEG 姿勢附件、Character／Pose／Style Reference 與 Style Anchor 已更新。 |
| 任務與版本 | 八張獨立 Sticker Cards、每張修改／重新生成／下載／版本；第 3 張為 V2。 |
| 對話修改 | 「第3張多一隻腳」只切換 Demo 的第 3 張 V2；「保留我的兔子」展示 Character + Pose Reference。 |
| 品質與 Router | Quality Fail → Auto Fix → Regenerate → Pass；Inspection 才呈現 Selected Model／Fallback、Quality Check／Retry。 |
| 中斷與輸出 | Quota exhausted → Checkpoint saved → Resume；LINE Preflight、PNG、ZIP 與下載示範控制。 |

## 安全與匿名邊界

固定 Demo 僅含非個資兔子圖，沒有使用者照片、真實 projectKey、cookie 狀態、預簽 S3 URL、API Key、token 或其他秘密。頁面不讀取 `localStorage`，不開啟真實檔案選擇、不上傳檔案、不呼叫 `/api/trpc`，也不呼叫 Gemini、GPT Image、Forge、FLUX 或其他外部影像 Provider。所有按鈕僅改變本頁的示範狀態並顯示 DEMO／PREVIEW notice。

## 驗收紀錄

| 驗收項目 | 結果 |
| --- | --- |
| Preview 桌面 1280px | 通過；八張任務、V2、品質、quota、Preflight、PNG／ZIP 與零 API 斷言成功。 |
| Preview Android 390px | 通過；垂直閱讀順序與任務卡無水平溢位，零 API 斷言成功。 |
| Inspection Desktop／Mobile View | 通過；切換可在同一正式元件流程中運作，Router 摘要只出現在 Inspection。 |
| 正式首頁桌面／Android 回歸 | 通過；共享元件後仍完成八張工作、修改、續作、參考圖更新、版本回復與 ZIP 匯出。 |
| 型別與敏感資訊檢查 | 第四階段變更完成後執行 `pnpm check` 與提交前秘密掃描。 |

真實外部模型是否能完成生成仍取決於伺服器端設定、服務可用性與帳戶額度。Demo 的所有成功結果均為固定流程資料，不應被解讀為實際 Gemini、GPT Image 或 FLUX 生成已成功。
