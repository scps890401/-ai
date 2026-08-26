# 完整 AI 貼圖工作流整合

- [x] 讀取現有 AI 路由、前端工作室、圖片儲存與測試，確認可沿用架構。
- [x] 檢查並處理 10 張 HEIC 參考照片，建立可供 AI 使用的安全圖片輸入。
- [x] 建立專案精靈：需求對話、方案規劃、角色設定、多張照片、張數選擇。
- [x] 建立角色一致性資料與文字／情境腳本編輯。
- [x] 建立獨立貼圖批次生成、逐張進度、續作與重試狀態。
- [x] 建立透明背景與品質檢查，包括尺寸、alpha、文字與結果狀態。
- [x] 整合單張對話式修改與修改歷史。
- [x] 建立檔名、編號、排序與 ZIP 匯出。
- [x] 更新首頁與工作室介面，呈現完整專案流程。
- [x] 用 10 張使用者照片實測批次生成並保存結果（5/10 成功；5 張因 AI 使用量限制待重試）。
- [x] 若實測失敗，記錄原因、修正程式並重新驗證。
- [x] 執行 TypeScript、測試、production build 與桌面／手機視覺驗證。
- [x] 建立最終 checkpoint 並交付更新預覽與生成結果。

- [x] 在批次結果中清楚顯示部分成功與失敗張數。
- [x] 將 usage exhausted 顯示為可理解的 AI 服務使用量限制，而不是空白圖片。
- [x] 加入只重試失敗貼圖的按鈕與流程。
- [x] 修正批次測試腳本的成功判定，避免部分失敗仍輸出 GENERATED_10_OK。

- [x] 前端保存並載入 projectKey，恢復既有專案腳本與生成結果。
- [x] 提供恢復未完成貼圖與只重試失敗項目的續作入口。
- [x] 為貼圖腳本與結果加入上移、下移排序操作。
- [x] 確保排序後編號、下載檔名與 ZIP 順序同步更新。
- [x] 將實測結果明確記錄為 5/10 成功，5 張受 AI 使用量限制待重試，不宣稱十張全部完成。

# HEIC 上傳與全流程診斷

- [x] 重現使用者提供 HEIC 多照片上傳時的前端錯誤。
- [x] 修正 HEIC 轉換、檔案大小與多檔上傳的相容性問題。
- [x] 改善上傳失敗訊息，逐張顯示可操作的失敗原因。
- [x] 測試專案建立、AI 規劃、批次生成、品質檢查、修改、排序、續作與 ZIP 匯出。
- [x] 修正檢查發現的流程錯誤並完成手機／桌面驗證。
- [x] 保存診斷修正 checkpoint 並交付更新預覽。

- [x] 在真實瀏覽器中上傳使用者提供的 5 張 HEIC，驗證裝置端轉檔與多檔加入。
- [x] 加入過大照片的檔案大小限制與清楚提示。
- [x] 驗證聊天修改、排序、載入既有專案與 ZIP 匯出操作。
- [x] 在最新 HEIC 修正後完成桌面與手機視覺驗證。

- [x] 用既有成功貼圖在瀏覽器驗證 ZIP 按鈕、下載與排序後檔名順序。
- [x] 驗證聊天修改在外部 AI 額度耗盡時保留原圖並提供清楚訊息。

# GPT 交接文件

- [x] 將可見開發對話、功能狀態、驗證結果與可分享原始碼彙整為單一 GPT 交接檔案。

# 極簡角色樣本工作室

- [x] 將工作室重構為僅輸入角色需求、動作與文字的樣本生成表單，保留既有深海藍、青藍與紫色視覺語言。
- [x] 建立「確認角色樣本」後才開放更多同款動作／文字圖片的兩階段流程。
- [x] 調整生成提示與前端狀態，確保後續圖片沿用已確認樣本作為角色參考。
- [x] 撰寫或更新測試並完成桌面／手機流程驗證。
- [x] 保存極簡工作室 checkpoint 並交付更新預覽。

# 極簡版 GPT 交接文件

- [x] 重新產生包含極簡角色樣本流程、最新驗證結果與可分享程式碼的 GPT 交接包。

# 對話優先 LINE 貼圖工作室

- [x] 研究可用高品質圖像模型、角色一致性與圖片修改能力，並記錄模型分工取捨。
- [x] 查核 LINE Creators Market 最新貼圖輸出規格、中文文字可靠繪製流程、手機上傳與 HEIC 支援策略。
- [x] 盤點既有專案可保留的 AI、透明背景、ZIP、projectKey、失敗保留與儲存能力，形成不破壞既有功能的架構方案。
- [x] 提出並確認 AI 對話框為核心的手機優先介面、資料模型、批次任務狀態與「繼續製作」恢復流程。
- [x] 實作對話歷史、多檔上傳、角色理解、AI 自動規劃與可透過對話修改的工作室主流程。
- [x] 實作獨立貼圖任務狀態、指定單張重試／修改、角色一致性參考與中斷時自動保存及續作。
- [x] 實作 LINE 規格檢查、透明 PNG／文字後製、單張下載與 ZIP 匯出。
- [x] 在 Android 手機視窗新增受控後端成功路徑回歸：上傳、自然語言規劃、至少一張生成、指定修改、單張 PNG 與 ZIP 輸出。
- [x] 為 server route 整合測試補上 paused_quota checkpoint 保存與「繼續製作」僅續跑未完成貼圖的驗證，並保留生成、修改與 LINE 輸出覆蓋。
- [x] 建立適合 GitHub 的 README、交接包與安全推送指引，並保存最終 checkpoint。

# GitHub 遠端交接

- [x] 確認 GitHub 授權、目標遠端倉庫與目前 Git 工作樹狀態。
- [x] 將最新版安全交接包置入可提交目錄並建立包含最新程式碼的 Git commit。
- [x] 經使用者確認目標遠端後推送並驗證 GitHub 分支內容。

# 對話優先工作室廣泛研究與持續改良

- [x] 廣泛研究現行圖像模型、角色一致性、圖片修改、批次生成與繁中可靠文字的最佳實務及 API 能力。
- [x] 查核 LINE Creators Market 最新靜態貼圖規格、手機瀏覽器上傳／HEIC 相容性及 API 額度中斷處理建議。
- [x] 對照研究結果盤點現有對話工作室的既有能力與可量化缺口，形成不破壞既有流程的優先改良方案。
- [x] 依優先級強化 AI 對話理解、角色設定、獨立貼圖任務、修改、保存續作與 LINE 輸出。
- [x] 以 Android 真實／受控路徑驗證上傳、規劃、生成、指定修改、暫停續作、PNG／ZIP 與 LINE 檢查。
- [x] 保存研究與改良版本，更新交接包並交付結果。
- [x] 向使用者交付本輪廣泛研究與改良結果，附上最新 checkpoint 與測試摘要。

# 最新原始碼 GitHub 同步

- [x] 確認 `chat-first-studio` 目標分支的遠端狀態與本機未同步檔案，並掃描敏感資訊。
- [x] 建立包含最新完整原始碼、研究文件與安全交接包的 Git commit。
- [x] 經使用者確認後推送至 GitHub 並驗證遠端最新提交與文件完整性。

# 第二階段：AI 對話式 LINE 貼圖 Agent

- [x] 研究可用的 Gemini、GPT Image、FLUX.2 與候選影像 Provider，完成可替換 Model Router 決策與限制記錄。
- [x] 擴充資料模型與儲存層，保存 Style Anchor、參考圖角色／姿勢／風格角色、接受圖優先序、品質檢查、路由歷程與版本還原狀態。
- [x] 實作 Agent 指令解析、模型 Router、錯誤分類 fallback、品質檢查、可續作 checkpoint 與單張版本還原。
- [x] 升級 Chat-first 介面，加入對話內快捷操作、簡潔工作狀態、內嵌成果操作、版本與參考圖操作，並維持 Android 優先體驗。
- [x] 驗證 `studio.restoreVersion` 與 `studio.setReferenceRole` 的 tRPC 真實整合行為，包含 active version、貼圖結果與參考圖接受狀態。
- [x] 擴充桌面／Android 瀏覽器回歸，實際操作參考圖角色切換、版本回復與對話內貼圖成果操作。
- [x] 完成 migration、單元／整合／手機瀏覽器回歸、production build 與安全掃描。
- [x] 更新 README、架構與 Router 文件、測試報告、GitHub 交接包，並依使用者選擇同步完整可執行原始碼到新安全分支 `phase2-agent-router`（未改動既有 `chat-first-studio`）。
- [x] 將第二階段摘要固化至可提交的交接包產生器，重新生成交接包並驗證輸出不需手動修補。
- [x] 驗證 GitHub 新安全分支上的 README 與交接包內容為最新且可讀取。

# 第三階段：AI 核心能力升級

- [x] 盤點 Gemini、GPT Image、FLUX 與既有 Router 的實際可接通能力、憑證與限制，明確標示已實作／部分實作／未實作。
- [x] 建立統一 Provider Adapter 契約（generate、edit、analyze、healthCheck）與實際 Gemini／GPT 實作，為未設定的 FLUX 保留明確 disabled adapter。
- [x] 讓 Model Router 依任務、參考圖、文字、數量、速度／成本偏好與 Provider health／quota 自動決策，保存選擇與受限 fallback 原因。
- [x] 強化 Image Editing Agent，支援角色／姿勢／場景／目前圖語意角色、Character／Style Anchor 優先序與單張／整套自然語言修改。
- [x] 實作可測試的 Generate → Quality Check → 有限 Fix／Retry → Check 工作流，回傳 pass／fail、reason、suggestedFix，並保留 LINE 文字後製作為可靠策略。
- [x] 實作並測試整套貼圖的自然語言修改流程（例如「全部變可愛一點」「全部去背」），讓 Agent 僅對需要更新的貼圖建立 edit jobs、保存各自版本與狀態。
- [x] 為整套修改新增 tRPC／Studio 整合測試，驗證未指定張數時會批次排程修改且不影響其他任務。
- [x] 為整套修改加入可驗證目標篩選規則，並測試「全部去背」在部分貼圖已符合透明條件時只排程必要項目。
- [x] 測試整套修改與 queued／retrying／paused_quota 的其他任務並存時，不會誤改、重排或吞掉非目標任務狀態。
- [x] 為 `sendMessage` 新增整套自然語言修改整合測試，驗證「全部變可愛一點／全部去背」會產生 `edit_pack`、建立對應 edit jobs，並可由 `runPending` 自動續跑。
- [x] 新增整套修改與 `queued`、`retrying` 生成任務並存的整合測試，確認非目標任務狀態會完整保留且不被重排。
- [x] 為 `sendMessage` 補上「全部去背，背景改透明」整合測試，驗證 assistant intent／reply、僅排程透明檢查未通過項目、pack scope checkpoint 與非目標不建立 edit job。
- [x] 建立公開唯讀 `/preview`、`/preview/inspection` 與明確標示的 Demo Mode，安全展示聊天、上傳、規劃、進度、版本、修改與輸出 UI，不呼叫真實 API 或暴露私人資料。
- [x] 在 `/preview` 補上明確的唯讀上傳示範 UI（附件按鈕、示範檔案列、HEIC／多圖標示），但保持不實際上傳與不呼叫 API。
- [x] 擴充 Preview 回歸腳本，驗證桌面與 Android 都可見聊天、上傳、規劃、進度、版本、修改與輸出全流程示範。
- [x] 完善 Chat-first／Android 介面，以精簡操作呈現 Agent 狀態、8／16／24／32／40 規劃、圖片結果、修改、版本與 LINE Preflight。
- [x] 在主 Chat-first／Android 工作室加入明確 LINE Preflight 摘要，顯示 PNG 尺寸、透明背景、安全邊距、繁中後製與可匯出狀態。
- [x] 擴充主工作室桌面／Android 回歸，明確驗證 24／32／40 張快捷規劃、Provider health 與 LINE Preflight 區塊均可見且可操作。
- [x] 確認第三階段未變更資料 schema、無需 migration；增加 Provider／fallback／品質修正／Preview／Demo／秘密掃描的自動測試，並完成全套測試、production build、桌面與 Android 回歸。
- [x] 更新 README、Provider／Anchor／品質／Preview 文件、安全交接包與 GitHub 同步紀錄；因 `chat-first-studio` 已分岔，依使用者選擇同步至新安全分支 `phase3-provider-preview`，未改動既有分支。

# 第四階段：公開 AI Inspection Preview

- [x] 盤點正式 Chat-first 工作室與現有 `/preview`、`/preview/inspection` 的元件、CSS、資料流及展示差距。
- [x] 抽取或復用正式 Chat、Composer、訊息、貼圖卡、進度、版本、修改、匯出與 LINE Preflight 視覺元件，使 Preview 不再維護不同風格的假 UI。
- [x] 建立固定、非個資、零 API 的完整 Demo 對話流程：需求、角色／風格／姿勢 Anchor、8 張生成、單張 V2 修改、品質 Fail→Fix→Pass、Router、quota checkpoint 與 LINE 輸出。
- [x] 完善 `/preview/inspection` 的 Desktop／Mobile 視圖、開發者檢查資訊與完整流程導航，同時不外露使用者資料、憑證或實際 Provider 請求。
- [x] 在 Preview 與 README 明確標示「AI Inspection Preview，不代表真實 AI API 生成結果」，列出可匿名開啟的 Preview／Inspection URL 與安全限制。
- [x] 實測 `/preview`、`/preview/inspection`、匿名外部瀏覽器與 Android 尺寸；驗證零登入、零 Studio／影像 API 請求、無秘密外洩、完整載入、測試與 production build。
- [x] 完成 GitHub `chat-first-studio` 分岔分析並徵求使用者選擇；依選項 2 改推安全新分支 `phase4-preview-integration`，保留 `chat-first-studio` 不變且未 force push。
- [x] 依使用者選擇建立並推送 `phase4-preview-integration`，驗證遠端含第四階段完整原始碼、README、公開 Preview／Inspection 文件與交接包，並確認 `chat-first-studio` 未被改動。

# 實際 Preview AI 檢查包

- [x] 以目前實際運行的 `/preview`、`/preview/inspection`、共用元件與 DOM 盤點可見 UI、操作、Demo／實接／部分實接／不存在狀態。
- [x] 使用瀏覽器自動化從真實 `/preview` 擷取指定桌面與 Android PNG 證據畫面並存入 `docs/preview-inspection/PREVIEW-SCREENSHOTS/`。
- [x] 建立 `PREVIEW-REPORT.md`、`UI-STRUCTURE.md`、`RESPONSIVE-REPORT.md`、`AI-INSPECTION.md` 與 `PREVIEW-MANIFEST.json`，明確區分 DEMO_ONLY、IMPLEMENTED、PARTIALLY_IMPLEMENTED、NOT_IMPLEMENTED。
- [x] 更新 README 加入 Preview URL、Inspection URL 與 Preview Inspection Report 路徑，並驗證所有檢查包檔案、截圖、JSON 與公開頁內容一致。
- [x] 比較 GitHub `chat-first-studio` 的最新分岔；在不 force push 前提下取得使用者對合併或新安全分支的選擇，依選項 3 推送專用分支並完成同步驗證。
- [x] 依使用者選項 3 推送 `preview-inspection-package`，驗證遠端含完整檢查文件、18 張 PNG、manifest、README 路徑與擷取腳本，且 `chat-first-studio` 保持不變。

# Preview 檢查包正式整合

- [x] 以既有 18 張真實瀏覽器 PNG、Preview 文件與 `chat-first-studio` 最新遠端為依據，盤點僅文件／截圖整合所需的安全變更與衝突風險。
- [x] 建立 `UI-VISUAL-AUDIT.md` 與 `SCREENSHOT-INDEX.md`，以實際 PNG 客觀稽核 ChatGPT／Gemini／Manus 的相似性、差異與可改善處。
- [x] 將完整 `docs/preview-inspection/` 安全整合至 GitHub `chat-first-studio`，保留該分支既有提交與正式網站程式，不 force push。
- [x] 驗證目標分支可正常顯示 18 張 PNG、全部報告、manifest、README 路徑及最新 commit，並回歸公開 Preview／Inspection 不受文件整合影響。
- [x] 逐一確認 GitHub `chat-first-studio` 的 18 張 raw PNG 皆回傳 200 與 `image/png`，並重新以匿名瀏覽器檢查 `/preview`、`/preview/inspection` 均完整載入。
