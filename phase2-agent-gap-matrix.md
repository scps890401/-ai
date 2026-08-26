# Sticker Muse 第二階段：對話式 LINE 貼圖 Agent 落差矩陣

更新日期：2026-08-26

## 判定原則

本矩陣不以介面存在與否判定完成，而以「是否能從聊天意圖到可持久化 job／asset／export 完整走完」判定。所有標記為受限的項目，都必須在介面和交接文件中如實說明，不能以模型名稱或示意卡片掩飾。

| 上傳內容要求 | 既有能力 | 落差與第二階段處置 | 驗收方式 |
| --- | --- | --- | --- |
| Chat-first、圖片上傳與快捷操作 | 已有聊天、圖像多選、8–40 組數、無靈感抽獎及自然語言 planner | 補上聊天內的精簡 Agent 工作階段與任務快捷卡 | Android／桌面截圖與聊天 flow 測試 |
| Agent 理解→規劃→生成→保存→續作 | planner、job state、snapshot、resume 已存在 | 補上統一 Agent event／品質檢查／fallback 決策契約 | 事件／狀態／resume 單元測試 |
| Character Anchor 多來源優先權 | 原圖 + character bible + 每張 job 主參考圖 | 加入 Reference Priority、已接受生成圖、當前編輯圖、Style Anchor 與 pose/style reference 類別 | reference selection 單元測試 |
| 不綁死單一模型 | 預設內建 ImageService；研究已列外部候選 | 建立 provider-agnostic router、健康度、有限 retry 與 fallback policy。外部供應者實際呼叫需使用者 API 金鑰 | router policy 測試；有憑證後 E2E |
| 40 張共同記憶 | plan／character bible 已共用，但 reference set 仍不足 | 將 character／style／accepted anchor 注入每一 job 的選參考步驟 | prompt／reference context 測試 |
| Style Anchor | 尚未保存已接受圖片作為風格定錨 | 保存 style anchor asset IDs／視覺規則，並支援聊天「以後照這個風格」 | snapshot／router 測試 |
| 自動品質檢查 | 已有 PNG／alpha／尺寸／容量 preflight；沒有圖像語義 QC | 增加可插拔 quality evaluation contract；無 vision provider 時退化為 deterministic LINE QC 並清楚註記 | deterministic QC 測試；有 provider 後 E2E |
| 版本歷史與還原 | DB 有 job versions；UI 沒有歷史清單／回復動作 | 增加 target-job version timeline 和 restore to new current pointer | 單 job restore 不影響其他 job 的測試 |
| 姿勢／風格參考 | 上傳可用，但未有明確分類與 reference selection | 讓 planner 產出 reference roles，讓 router 選取角色／姿勢／風格／當前修改圖 | planner／router 結構化測試 |
| LINE 下載與保存 | 單張、ZIP、preflight、S3 ZIP 保存已可用 | 將 deterministic preflight 作為 quality pipeline 最後一關 | ZIP／PNG regression |
| GitHub 交接 | GitHub CLI 已可用 | 同步完整專案至 `scps890401/-ai` 的 `chat-first-studio` 並以 `gh` 驗證遠端分支 | `git ls-remote`／branch log |

## 交付邊界

第二階段能先在現有基線上實作**抽象路由、參考選擇、狀態／品質契約、版本回復與聊天工作狀態**。FLUX.2、Gemini 等供應者的真實 fallback 不能在沒有憑證時虛構為可用；要在供應者的 API 金鑰經安全輸入後，再執行真實模型比較與 E2E。
