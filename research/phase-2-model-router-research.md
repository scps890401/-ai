# 第二階段：多模型貼圖 Agent Router 研究

**作者：Manus AI**
**更新日期：2026-08-26**

## 結論摘要

本工作室不應把使用者操作綁定至任一圖像模型，而應以**任務能力、可用參考圖、Provider 健康狀態與錯誤類型**作為路由依據。Gemini 3.1 Flash Image 適合以多張角色／風格參考建立整套貼圖的一致性；GPT Image 2 是已整合的精細圖像編修與高保真參考輸入後備；FLUX.2 應設計為可插拔候選 Provider，但在尚未提供 Black Forest Labs 或相容平台的 API 憑證、商業授權與配額前，不得標示為已啟用或納入真實 fallback。[1] [2] [3]

> Router 的目標不是「三個模型的下拉選單」，而是讓 Agent 根據工作種類自行選擇並記錄決策理由；使用者仍只需以自然語言對話。

## 候選能力比較

| Provider | 目前角色 | 實作優勢 | 已知限制／風險 | Router 決策 |
|---|---|---|---|---|
| Gemini 3.1 Flash Image | 角色／風格一致性優先 | 官方文件列出可用多張角色與風格參考，支援多輪 interaction；適合作為角色錨點、姿勢變體與整套生成的首選。[1] | 當前專案 API 可能回傳 `429 RESOURCE_EXHAUSTED`；圖片中文字不可作為繁中正式字稿唯一來源。 | 角色新建、姿勢／情境變體時優先；長期額度耗盡直接 checkpoint。 |
| GPT Image 2（Forge） | 影像修改與後備生成 | 支援單張與多參考圖的圖像生成／編修；官方說明多輪圖像工作流與透明輸出。已由既有服務整合。[2] | 當前 Forge 可能回傳 `412 usage exhausted`；官方仍承認角色一致性、精準構圖與字位有侷限。 | 單張精修、重試與 Gemini 暫時不可用時的可用後備；同樣於額度耗盡時保存而非無限重試。 |
| FLUX.2 | 預留可插拔 Provider | 官方宣稱多參考控制、姿勢引導、可達 4MP 與 JSON 控制；獨立報導指出可同時處理多張參考圖，適合未來評估角色／風格工作流。[3] [4] | 本專案未提供 BFL 或相容代理憑證，且不同權重／供應商的商業授權不同；不可假稱已串接。 | 建立 Provider 介面與健康狀態欄位，預設 `disabled_unconfigured`；取得憑證與授權後才啟用。 |

## 路由與 fallback 原則

| 情況 | Agent 動作 | 不應做的事 |
|---|---|---|
| 新建角色套組、角色／姿勢／風格參考齊全 | 選擇具有多參考能力的可用 Provider，依角色、接受圖、風格、姿勢優先序組合輸入。 | 僅憑文字重建角色，或把所有上傳圖未分類地一起傳送。 |
| 指定單張修正、延續已存在圖像 | 優先使用能接受目前圖片與修改指令的 Provider；保存版本父子關係與可復原版本。 | 重新生成全套貼圖，或覆蓋既有成功版本。 |
| 429、短暫網路／逾時、5xx | 記錄 provider attempt 與可退避資訊；僅在備援 Provider 已啟用且錯誤可轉移時，進行有限次 fallback。 | 無上限重試或將同一額度錯誤迅速重送。 |
| 412 usage exhausted 或所有可用 Provider 均不可用 | 將 job 標記為 `paused_quota`，保留參考圖快照、Router 決策、prompt、版本與未完成清單。 | 把 API 限制宣稱成生成成功，或丟失任務狀態。 |
| 生成後品質不通過 | 以輕量規則檢查 LINE 規格、alpha、文字邊界、可見主體；再以有明確失敗理由的單張 retry。 | 把視覺判斷包裝成絕對正確，或自動重做已被使用者接受的圖片。 |

## Character 與 Style Anchor 優先序

每一張貼圖在送往 Provider 前，將建立可序列化的 `ReferenceSelection`：**使用者原始角色照片 → 已確認角色 anchor → 使用者接受的代表性生成圖 → 目前修改的圖 → 姿勢參考 → 風格參考**。每筆輸入都保存 `role`、`priority`、`accepted` 與來源，令續作與版本還原能重現同一決策。姿勢圖只傳達動作／構圖，不應當作角色身份來源。

## 文字與品質策略

繁中貼圖文案持續以既有 Noto Sans CJK TC／Sharp SVG 後製為正式輸出，模型只生成角色、場景、動作與表情。這個決策同時避免模型文本的拼寫與排版變異，並讓 LINE 370×320、透明背景、10px 安全邊距、字數與換行檢查可以以確定性規則驗證。OpenAI 官方文件亦提醒，GPT Image 的精確字位與一致性仍有侷限。[2]

## 實作邊界與可驗證承諾

本輪會實作真實的 Agent 路由介面、Provider 能力／健康紀錄、可用 Provider fallback、參考優先序、版本還原、品質檢查與 checkpoint。Gemini 與 Forge 的真實外部呼叫會保留；若其帳戶額度不足，系統應測得並顯示「已保存、可續作」，不會用測試模式輸出冒充真實 API 成功。FLUX.2 將以明確未設定狀態保留介面；取得使用者授權之憑證後才安排安全啟用。

## 參考資料

[1]: [Google Gemini API — Image generation](https://ai.google.dev/gemini-api/docs/image-generation)
[2]: [OpenAI — Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
[3]: [Black Forest Labs — FLUX.2 model overview](https://bfl.ai/models/flux-2)
[4]: [The Decoder — FLUX 2 multi-reference feature report](https://the-decoder.com/black-forest-labs-launches-flux-2-with-a-new-multi-reference-feature/)
[5]: [MindStudio — GPT Image 2 vs Gemini comparison, 30-prompt third-party test](https://www.mindstudio.ai/blog/gpt-image-2-vs-gemini-image-generation)
[6]: [YouTube — How to Create Consistent AI Characters, ComfyUI + Nano Banana](https://www.youtube.com/watch?v=JNJt1OjpX0Y)
