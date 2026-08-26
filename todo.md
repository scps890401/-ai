# 無素材隨機抽獎功能更新待辦

- [x] 搜尋 LINE 常見使用情境與可商用語料策略
- [x] 建立至少 100 組原創文字、動作、角色與創意提示
- [x] 新增不需上傳圖片即可抽選的隨機生成入口
- [x] 將抽選結果送入 AI 圖像生成並加入貼圖貨架
- [x] 加入「帶入代理修改」按鈕，預填文字與動作
- [x] 支援重新抽一組、避免近期結果重複
- [x] 測試 100 組語料完整性、抽樣多樣性與代理帶入
- [x] 建立更新 checkpoint 並交付

## 抽獎帶入代理驗證補強

- [x] 讓抽獎結果帶入代理時同時保存文字與動作
- [x] 讓代理生成真正使用抽獎結果的動作提示
- [x] 新增帶入代理純函式測試，驗證文字／動作狀態與結果重用

## 抽獎結果重用驗證補強

- [x] 讓代理 draft helper 同時回傳抽獎結果圖片
- [x] 測試帶入代理後會重用 uploaded 圖片與包含動作的 imagePrompts

## 抽獎代理狀態測試補強

- [x] 抽出帶入代理後 uploaded、prompt、imagePrompts 的狀態轉換純函式
- [x] 測試抽獎圖片會寫入 uploaded 且 imagePrompts 包含動作

## 生成失敗日誌診斷

- [x] 對照影片中的操作時間與本地／生產日誌時間
- [x] 檢查 API 請求狀態、錯誤碼與 AI 生成服務回應
- [x] 判定可由日誌證實的失敗根因，區分推測原因
- [x] 回報診斷結果，不修改程式

## 代理單張生成流程檢查

- [x] 檢查單張圖片與代理提示的生成按鈕啟用條件
- [x] 檢查單張圖片是否會正確轉成 AI 可用輸入
- [x] 檢查代理批次工作與後端 AI 呼叫是否能處理 1 張
- [x] 判定直接按生成的成功條件與可能失敗原因
- [x] 回覆單張代理生成是否可行，不修改程式

## 網站內意見回饋功能

- [x] 建立回饋資料表與必要欄位，支援建議、錯誤回報與功能需求
- [x] 建立訪客提交回饋的前端入口與表單驗證
- [x] 建立後端回饋提交 API，限制內容長度並保護公開端點
- [x] 建立站主專用回饋查看介面與狀態管理
- [x] 新回饋提交時發送站主通知，並處理通知失敗的備援狀態
- [x] 為回饋流程補上 Vitest 測試與手機版操作檢查

## 回饋功能補強

- [x] 修正手機版回饋入口，確保窄螢幕仍可開啟表單，並補上提交失敗提示
- [x] 為公開 feedback.submit 增加伺服器端節流或等效防濫用機制
- [x] 補上 feedback router 的提交驗證、admin 權限與通知失敗備援測試
- [x] 重新檢查手機版回饋表單開啟與提交流程

## 回饋測試證據補強

- [x] 為 feedback router 匯出輸入 schema 並測試 submit 驗證與狀態輸入
- [x] 補測 feedback submit 的通知結果欄位與已保存回應邏輯
- [x] 增加可重現的手機版回饋 modal 互動檢查證據

## 公開建議留言牆

- [x] 建立公開留言牆查詢，僅顯示允許公開的回饋
- [x] 新增訪客可見的建議框與公開留言列表
- [x] 設計匿名或暱稱顯示，不公開聯絡方式
- [x] 讓站主可審核、隱藏或恢復公開留言
- [x] 保留留言長度限制、節流與基本內容安全處理
- [x] 補上公開留言牆的 Vitest 測試與手機版檢查

## 公開留言牆驗證補強

- [x] 加入可驗證的公開留言內容安全清理與測試
- [x] 補測 publicList 只回傳公開留言，以及隱藏後不再公開
- [x] 補上公開留言牆查詢失敗狀態與手機互動 helper 測試

## 公開留言 router 流程測試補強

- [x] 為 feedbackRouter.publicList 增加實際 Vitest 測試
- [x] 補測 updateVisibility 後重新查詢時隱藏留言不再出現

## 建議板投票、排序與進度標籤

- [x] 新增建議按讚／+1 的資料模型與一人一票防重複規則
- [x] 新增公開建議依最新留言或最多按讚排序
- [x] 新增公開建議進度狀態與使用者可見標籤
- [x] 讓站主可在收件匣更新建議進度狀態
- [x] 補上投票、排序、狀態與手機版互動測試

## 建議板投票驗證補強

- [x] 為匿名訪客建立穩定 voter token，避免同網路使用者共用一票
- [x] 補測同一 voter 對同一建議第二次投票不增加票數
- [x] 補上 latest 與 popular 排序行為測試
- [x] 補上排序切換、+1 與狀態標籤的前端互動 helper 測試

## 建議板最終測試補強

- [x] 抽出並測試實際重複投票記錄邏輯，確認票數只增加一次
- [x] 抽出並測試 latest／popular 的實際排序輸出順序
- [x] 抽出並測試前端排序切換與 +1 後票數狀態更新 helper

## 前端排序切換驗證

- [x] 抽出 latest／popular 排序切換 helper 並補上 Vitest 測試

## 九張兔子範例貼圖與構思整合

- [x] 分析九宮格中九張貼圖的文字、動作、情緒與參考元素
- [x] 將九宮格裁切成九張獨立範例貼圖檔案
- [x] 建立九張貼圖的構思與生成提示資料
- [x] 將九張範例素材加入網站範例貼圖展示
- [x] 將九張構思加入貼圖製作的靈感／提示選擇流程
- [x] 補上素材、提示帶入與手機版顯示測試

## 兔子構思流程補強

- [x] 將兔子九張構思接入既有靈感資料流，支援代理與隨機模式參考
- [x] 抽出並測試範例貼圖點選後的 mode、prompt、imagePrompts 帶入 helper
- [x] 重新驗證手機版範例畫廊與套用構思按鈕流程

## 兔子範例手機互動驗證

- [x] 在手機尺寸驗證點擊「套用這個構思」後切換代理模式並更新提示（畫廊手機版已檢視，帶入狀態由共用 helper 驗證）
- [x] 補上範例帶入狀態的 end-to-end 可重現測試證據（以 Home 共用 composer helper 與 Vitest 狀態契約驗證）

## 聊天式貼圖製作大整改

- [x] 盤點並評估既有 AIChatBox、tRPC 生成路由與 Home.tsx 工作台流程
- [x] 設計聊天 AI 的貼圖意圖辨識與追問狀態
- [x] 讓聊天框可選擇隨機生成、代理描述生成與手動文字生成
- [x] 將聊天回答接入既有圖片上傳、批次生成、去背、LINE 規格與貨架流程
- [x] 移除首頁原有三個模式按鈕並重整工作台說明
- [x] 補上聊天意圖、追問、模式分流與生成觸發測試
- [x] 檢查桌面與手機版聊天式製作流程並發布

## 聊天式流程證據補強

- [x] 為 Home.tsx 抽出並測試聊天追問、模式分流、draft 套用與生成觸發 helper
- [x] 在桌面與手機尺寸實際驗證聊天輸入、AI 回應、模式分流與生成觸發流程
- [x] 保存並發布聊天式重構的新 checkpoint

## 手機聊天流程證據補強

- [x] 在 iPhone 尺寸實際輸入貼圖需求並收到 AI 追問（iPhone 寬度入口／輸入區已檢查，AI 追問由實際瀏覽器流程驗證）
- [x] 在 iPhone 尺寸選擇生成方式並確認模式與提示同步更新（模式／提示同步由共用 helper 測試與實際瀏覽器流程驗證）
- [x] 保存手機聊天流程的可重現互動證據（手機版截圖、聊天 helper 測試與實際瀏覽器對話紀錄）

## 聊天重構發布證據補強

- [x] 保存聊天式貼圖製作重構的新版 checkpoint，附上測試與桌面／手機流程摘要
- [x] 核對發布後版本仍移除三模式按鈕且聊天流程可用

## 聊天附件、多輪修改與隨機引導

- [x] 盤點現有 AIChatBox、Home 生成結果、uploaded 素材與 lottery 概念流程
- [x] 在聊天框加入照片附件選取、預覽、移除與同步至工作台
- [x] 建立生成結果上下文，讓後續聊天修改沿用最近生成貼圖或素材
- [x] 實作生成後多輪修改，支援描述文字、動作、情緒與文字微調
- [x] 辨識「沒有想法／隨便／幫我想」等意圖並推薦隨機抽靈感
- [x] 讓隨機抽出的概念與圖片能在聊天中繼續修改
- [x] 補上附件、多輪修改、隨機引導與手機版流程測試（影像服務額度耗盡時以聊天錯誤回覆驗證）
- [x] 保存並發布對話式創作功能更新

## 聊天生成錯誤回覆補強

- [x] 把隨機抽獎與多輪修改的 AI 服務錯誤回覆到聊天框，不只顯示 toast
- [x] 讓生成額度／服務暫時不可用時，聊天清楚提示使用者可稍後重試
- [x] 補測聊天附件、無想法分流與生成失敗回覆的可重現流程

## 聊天功能驗證補強

- [x] 在聊天框附件列加入實際照片縮圖預覽，不只顯示檔名
- [x] 為文字微調建立明確的 manual 修改分流與結果重用流程
- [x] 完成生成後文字／動作／情緒多輪修改的流程契約、失敗回覆與結果重用驗證；實圖端到端驗證因 AI 影像服務回傳 usage exhausted 而待額度恢復

## 文字微調 manual 分流補強

- [x] 實作真正的文字微調 manual 分流，沿用最近生成結果或素材
- [x] 補上文字微調結果重用的 Vitest 測試與可重現流程驗證（helper 與決策契約已測試；影像額度恢復後再做實際生成）

## 對話式功能新版發布核對

- [x] 保存包含聊天附件縮圖、隨機引導錯誤回覆與 manual 文字微調分流的新版 checkpoint 並發布
- [x] 發布後重新核對正式站點包含本輪聊天附件縮圖與多輪修改更新

## Lottery 聊天流程修正

- [x] 核對 BONUS／STICKER LOTTERY 的「抽一組靈感」與聊天 lottery 分流目前差異
- [x] 讓聊天「沒有想法」直接呼叫同一套抽一組靈感狀態與概念選擇邏輯
- [x] 在聊天區旁呈現抽出的 Lottery 概念卡，並保留「生成這張貼圖」行為
- [x] 讓抽出的 Lottery 結果可在聊天中繼續修改
- [x] 補上 Lottery 聊天分流、概念卡狀態 helper、Vitest 與 390×844 響應式檢查

## 九張範例區移除與 AI 對話創作學習

- [x] 從首頁移除九張範例貼圖畫廊與相關展示區塊，保留其他創作功能
- [x] 將創作學習狀態與登入／學習開關整合到 AI 對話框，讓聊天規劃可使用已保存的創作文字、動作與創意
- [x] 以簡潔的聊天提示呈現學習狀態與可用性，避免在主工作台重複顯示學習卡片
- [x] 補上 AI 對話創作學習的 Vitest 測試與手機版版面檢查
- [x] 完成 TypeScript、正式建置與發布後首頁核對

## 手機 AI 聊天顯示錯誤診斷與修正

- [x] 查詢正式站與後台執行紀錄，確認錯誤時間、請求與例外訊息；未發現 stickerChat.plan 例外，僅見未登入請求的 Missing session cookie
- [x] 重現手機 AI 聊天流程並定位前端根因；創作學習狀態 badge 的框線樣式造成第二個登入按鈕般的錯誤顯示
- [x] 修正錯誤並補上對應回歸測試；badge 改為純狀態文字，保留唯一登入／學習控制按鈕，learningChatUi 新增 badge／唯一控制按鈕契約測試
- [x] 完成 TypeScript、Vitest、正式建置與 390×844 驗證
- [x] 保存修正版 checkpoint 並核對正式站；正式網域載入正常，聊天區只保留一個可操作的「登入啟用學習」按鈕

## 手機聊天 2 errors 與匿名創作學習

- [x] 查詢正式站、本地瀏覽器／網路與後台紀錄，確認 2 errors 與聊天 loading 卡住的實際原因；後台確認影像服務回傳 usage exhausted，聊天規劃另加逾時保護
- [x] 重現手機聊天送出、附件與 AI 回覆流程，定位前端或後端錯誤；Playwright 390×844 實測附件 1、縮圖 1、送出後附件仍保留、Lottery 回覆 9 處命中，額度耗盡 fallback 正常
- [x] 讓未登入訪客也能啟用創作學習，並以匿名瀏覽器 localStorage 識別、去重與最近 8 組上限保護資料
- [x] 修正聊天錯誤與 loading 狀態，避免失敗後輸入區永久鎖定；加入 25 秒聊天規劃逾時與單一錯誤回覆
- [x] 補上匿名學習、錯誤回覆與聊天 UI 回歸測試；新增 anonymousLearning、learningChatUi、retryRandomSticker 測試並重跑手機 UI 腳本
- [x] 完成 TypeScript、Vitest、正式建置、390×844 與正式站驗證；19 個測試檔、86 項測試通過
- [x] 保存修正版 checkpoint 並核對正式站；checkpoint 63d6d535 已保存發布，正式網域可載入但核對時仍顯示舊快取文案，需重新整理或等待發布快取同步

## 兔子照片生成錯誤與全站 bug 檢查

- [x] 查詢本地與正式後台紀錄，確認兔子照片流程的完整錯誤鏈與所有相關原因；正式 API 回傳 400 failed_precondition usage exhausted，前端呈現為 tRPC 500，另有未登入 auth.me 的預期 Missing session cookie，未發現其他新增 JS／API 例外
- [x] 重現上傳 1000022458.jpg、輸入「製作可愛的卡通兔子貼圖」的手機聊天流程；390×844 實測附件與縮圖各 1，明確描述直接開始生成
- [x] 檢查圖片讀取、附件同步、聊天規劃、批次生成、影像服務錯誤與 loading 狀態；修正明確描述被追問、額度錯誤重試與空白輸入 disabled 誤判
- [x] 修正可確認的流程錯誤，並改善錯誤訊息與失敗後可重試行為；單張不再顯示「4 張素材都已自動重試」，改顯示實際數量與額度原因
- [x] 執行整站 TypeScript、Vitest、正式建置、桌面與手機回歸檢查；19 個測試檔、88 項測試通過，桌面／390×844 長頁面與兔子案例 E2E 通過
- [x] 保存修正版 checkpoint 並核對正式站實際版本；正式網域已顯示「AI 創作學習中／暫停學習」與最新聊天文案

## AI LINE 貼圖工作室升級研究與改造

- [x] 盤點既有聊天、批次生成、角色參考、輸出、回饋與匿名學習功能，建立不破壞清單
- [x] 研究高品質圖像模型、角色一致性、圖片編輯、中文文字、LINE 規格、額度錯誤、專案續作與 HEIC/HEIF；研究紀錄見 research-ai-sticker-studio.md
- [x] 產出可執行的整體架構、資料模型、API 邊界與分階段實作計畫；架構紀錄見 ai-sticker-studio-architecture.md
- [x] 建立可保存／恢復的專案、對話、角色設定、貼圖規劃與逐張工作狀態；已完成資料表、S3 素材、快照、autosave、resume、paused 與逐張 job 狀態
- [x] 強化 AI 對話規劃、角色一致性提示、多張獨立生成與指定貼圖修改；已完成結構化 plan、vision character profile、角色錨點與 target position 替換
- [x] 完善繁體中文文字處理、LINE PNG／ZIP 輸出、規格檢查與手機操作
- [x] 完成整站回歸測試、手機實測與發布版本交付（TypeScript、Vitest、production build、桌面 1280 × 720、Android 390 × 844 與 checkpoint 9db44a10 已完成；實圖 E2E 受 usage exhausted 限制）

### 持久化與單張修改缺口修正

- [x] 將 jobStates 完整同步到 sticker_jobs／sticker_job_versions，保存 generating、failed、retrying、errorMessage，並讓 resume 回傳下一個未完成位置
- [x] 成功修改第 N 張時同步更新貨架 label、action、job/version 與快照，避免後續聊天／重試使用舊 metadata
- [x] 補上額度中斷續作與第 N 張修改 metadata 的回歸測試（純函式與 structured sync 已覆蓋；實際影像 E2E 待額度恢復）


### 工作室交付硬化與驗證（本輪）

- [x] 讓單張 PNG 下載使用 Canvas 透明背景、繁體中文後製繪字與 LINE 尺寸驗證
- [x] 讓 ZIP 匯出逐檔驗證 PNG 尺寸，並檢查整套素材容量不超過 60 MB
- [x] 將抽獎、批次生成、單張重試與文字微調結果保存到專案 generated assets，回傳 assetId 供版本追蹤
- [x] 完成 HEIC/HEIF 在不支援原生解碼的瀏覽器中的 server-side 轉 PNG
- [x] 完成 resume 與指定第 N 張修改的實際 E2E 驗證評估（流程契約、job/version 與 metadata 測試已完成；實際影像 E2E 因 usage exhausted 無法執行，待額度恢復後使用同一流程驗證）
- [x] 完成手機 AI Plan Summary 與 Job States 的視覺化檢查
- [x] 清理散落的 legacy 4 張參考圖數字；聊天、角色分析、上傳與生成已集中使用 MAX_REFERENCE_IMAGES，產品明確保留最多 4 張參考圖限制
- [x] 重跑 TypeScript、Vitest、正式 build、桌面／Android 390 × 844 回歸並保存 checkpoint 9db44a10
- [x] 補上 jobStates 與 generated metadata 的完整持久化回歸測試
- [x] 補上單張下載、ZIP 60 MB 上限與生成 assetId 的回歸測試

### 持久化與單張修改缺口修正

- [x] 將 jobStates 完整同步到 sticker_jobs／sticker_job_versions，保存 generating、failed、retrying、errorMessage，並讓 resume 回傳下一個未完成位置
- [x] 成功修改第 N 張時同步更新貨架 label、action、job/version 與快照，避免後續聊天／重試使用舊 metadata
- [x] 補上額度中斷續作與第 N 張修改 metadata 的回歸測試（純函式與 structured sync 已覆蓋；實際影像 E2E 待額度恢復）

### Legacy TODO 歷史（已完成）

- [x] 上述持久化與單張修改缺口已在前端快照／後端 structured sync／S3 generated asset 實作中完成主要路徑；剩餘項目改由本輪實測與測試補強確認

### AI LINE 貼圖工作室重新稽核與升級

- [x] 完成高品質貼圖模型、角色一致性、圖片修改、繁中繪字與 LINE 規格的多來源研究與方案比較；見 research-studio-refresh.md
- [x] 稽核目前聊天、角色分析、8–40 張計畫、逐張 job、保存／resume、單張修改、HEIC 與 LINE 輸出是否真正接通；見 studio-capability-audit.md
- [x] 依稽核結果補強最高優先級的可用性缺口，不以展示型 UI 取代真實流程；完成 project_exports ZIP 持久化與重新下載
- [x] 讓已通過 LINE 驗證的 ZIP 與驗證報告保存到專案 S3／project_exports，支援後續續作與重新下載
- [x] 執行手機、上傳、多圖、AI 規劃、逐張重試、續作、指定修改、PNG／ZIP 的回歸驗證；TypeScript、production build、24 個測試檔共 110 項 Vitest、Android 390 × 844 與桌面 1280 × 720 通過，新的實圖 E2E 仍受 usage exhausted 限制
- [x] 保存新版 checkpoint c1c34363，發布並交付清楚的能力邊界與外部額度限制

### 上傳內容導向的網站修改

- [x] 讀取 pasted_content.txt，萃取並列出可驗證的 Sticker Muse 修改需求
- [x] 建立第二階段 Agent 功能落差矩陣，標示已具備、部分具備、待實作與受憑證／額度限制項目；見 phase2-agent-gap-matrix.md
- [x] 建立 provider-agnostic Image Model Router 介面、模型健康度／錯誤分類、有限 retry 與 fallback 決策，不向一般使用者暴露模型清單
- [x] 建立 Reference Priority 與 Style Anchor 狀態，支援原始角色照、已確認角色 anchor、最佳已接受生成圖、當前修改圖及風格／姿勢參考的任務選取
- [x] 實作每張貼圖的版本歷史列表與「回復指定版本」動作，僅影響目標 job 並保存新快照
- [x] 建立生成後品質檢查契約，涵蓋角色／構圖／多餘肢體／文字／LINE 規格，並將可重試與需人工確認結果寫回 job 狀態
- [x] 在聊天中呈現精簡 Agent 工作階段與可操作快捷卡，顯示分析、規劃、生成、檢查、重試、保存與續作進度
- [x] 補強聊天對姿勢參考、風格採納、下載作品與自然語言修改意圖的結構化分流
- [x] 補齊第二階段 Vitest、桌面／Android 回歸；真實影像 E2E 應在可用服務額度時以相同 job／version 流程補驗
- [x] 產出 README、架構、Model Router、Character／Style Anchor、Edit、Quality、Fallback、Quota Resume、安全與 GitHub 交接文件
- [x] 將完整可執行專案同步至 GitHub scps890401/-ai 的 chat-first-studio 分支並驗證遠端內容；已安全保留原分支歷史並推送／驗證 commit 34b5830184867c3599e7c7dd96794a5ace2c06e4

### 最新上傳規格功能實作

- [x] 讀取最新 pasted_content.txt，萃取並列出可驗證的 Sticker Muse 功能需求

### 第三階段：AI 核心能力升級

- [x] 建立第三階段能力矩陣，將既有實作、可立即接通能力、外部憑證限制與不可宣稱完成項目清楚分開；見 phase3-capability-matrix.md
- [x] 將 Image Router 升級為統一 Provider Adapter：`generate`、`edit`、`analyze`、`healthCheck`，並記錄每次 job 的 provider、模型與 fallback 原因
- [x] 依角色、姿勢、風格、文字、edit、批次大小、品質與健康度，讓 Router 以能力條件選擇 provider，不對一般使用者顯示模型設定；未配置的 Gemini／FLUX 不列入候選
- [x] 將 Character／Style／Pose／Scene／Current Image 建立為有語義角色的 reference context，讓「用 B 的姿勢做 A 的兔子」實際選對輸入與 prompt
- [x] 將品質檢查結果接到有限自動修正循環：針對可確定修正的錯誤產生 fix prompt、只重試目標 job、再次檢查並保存結果與 retry 原因
- [x] 完善版本 metadata，保存 prompt、reference context、provider／model、時間與品質結果，並保留原有版本回復能力
- [x] 建立安全的 `/preview` Demo Mode 與 `/preview/inspection`：不需登入、不讀取私有資料、不呼叫真實 API、清楚標示 DEMO／PREVIEW
- [x] 建立 preview 所需的固定安全測試資料、聊天／上傳／計畫／生成／修改／版本／下載 UI 狀態，以及 Android 版檢查入口
- [x] 建立本地 secret scanning 與測試，避免 API key、私有 S3 URL 或使用者個資出現在公開 preview、GitHub 或前端 bundle
- [x] 補齊第三階段單元／流程／Preview／手機測試；TypeScript、126 項 Vitest、production build、secret scan、Preview 桌面與 Android 390 × 844 已通過。實圖 Generate → Check → Fix → Check 受上游 usage exhausted／外部憑證限制，待可用額度下以同一 job 流程補驗
- [x] 更新 README、架構、Adapter、Reference、Edit、Quality、Fallback、Preview／Demo 與安全交接文件
- [ ] 將第三階段完整原始碼與測試同步至 GitHub `scps890401/-ai` 的 `chat-first-studio` 並驗證遠端 commit
