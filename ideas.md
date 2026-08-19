# Sticker Tycoon 重建設計規格

## Reference Ground Truth

本專案以使用者提供的 https://sticker-tycoon.netlify.app/ 為視覺與互動基準，優先重現其首頁的結構、資訊層級、色彩語言與可操作流程，不採用另一套風格改造。重建範圍包含：固定深色導覽列、AI 貼圖創作主視覺、免費開始與作品展示 CTA、功能特色、LINE Store 作品卡片與預覽牆、下載貼圖說明、張數方案、優惠碼說明、使用指南入口與頁尾導覽。

## Ground-truth Style

- **Design Movement**：深色科技品牌落地頁，混合玻璃擬態、霓虹藍紫光暈與產品導覽式資訊編排。
- **Core Principles**：高對比深色背景；青藍至紫色的品牌光譜；以卡片、膠囊按鈕與細緻描邊建立層次；內容由「立即體驗」向「信任與方案」逐步展開。
- **Color Philosophy**：深海藍承擔專業與沉浸感，電光青代表 AI 與即時生成，紫色代表創意與想像，暖黃色僅用於提示與優惠，避免搶走主要 CTA 的注意力。
- **Layout Paradigm**：採用寬幅不對稱英雄區塊，左側敘事與行動、右側產品示意；其後以節奏明確的交錯區段與橫向展示牆延伸閱讀，不使用單一中央卡片堆疊。
- **Signature Elements**：品牌貼圖機器人/電視圖示；藍紫光暈與微粒星點；帶有狀態標籤與外部商店箭頭的作品卡片。
- **Interaction Philosophy**：所有主要 CTA 都有清楚的按壓回饋與輕微上浮；導覽錨點平滑滾動；作品卡片可點擊並開啟 LINE Store；方案按鈕與優惠碼區塊提供即時提示或引導。
- **Animation**：英雄區的光暈緩慢漂移，裝飾粒子低頻閃爍；首屏內容以 30–70ms 階梯淡入；卡片 hover 只使用 transform/opacity，不改變版面；尊重 prefers-reduced-motion。
- **Typography System**：標題使用 Noto Sans TC 900，正文使用 Noto Sans TC 400/500；英文品牌名稱以 Space Grotesk 700 輔助，建立中英混排的科技感。標題以 48–76px 建立階層，手機版降至 40–48px。
- **Brand Essence**：為想把日常照片變成可分享 LINE 貼圖的創作者提供快速、低門檻的 AI 創作入口；個性為聰明、熱情、可靠。
- **Brand Voice**：直接、鼓勵創作、以成果為導向。示例：「用 AI 創造，讓每個表情都有你的名字。」、「一張照片，三分鐘後就是一套貼圖。」
- **Wordmark & Logo**：使用方形復古電視／貼圖機器人符號搭配中英文雙層字標，符號需在導覽列與 favicon 中清楚可辨識。
- **Signature Brand Color**：#24C7F3 電光青，搭配 #8B6DFF 創意紫形成品牌識別光譜。

## Functional Scope

前端重建以可在瀏覽器中直接體驗為主：導覽錨點、外部 LINE CTA、作品卡片連結、優惠碼說明提示、方案卡片互動、作品預覽燈箱，以及行動版導覽收合。因目前專案為純前端，LINE Mini App、真實 AI 生成、LINE Pay、帳號與下載 ZIP 等外部服務會以明確的導流按鈕與提示呈現，不虛構後端交易或生成結果。
