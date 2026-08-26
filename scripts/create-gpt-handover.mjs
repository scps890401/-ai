import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "docs", "Sticker-Tycoon_對話優先LINE貼圖工作室_GPT-交接包.md");
const includeRoots = ["client", "server", "shared", "drizzle", "scripts", "research", "docs", "patches"];
const includeTopLevel = new Set(["package.json", "pnpm-lock.yaml", "tsconfig.json", "tsconfig.node.json", "vite.config.ts", "drizzle.config.ts", "components.json", "template.json", "README.md", "todo.md", ".gitignore"]);
const excludedDirs = new Set(["node_modules", "dist", ".git", ".manus-logs", "coverage", ".cache", "assets"]);
const excludedFiles = new Set(["generated-10-stickers.json", "chat-studio-flow-desktop.json", "chat-studio-flow-mobile.json", "chat-heic-upload-result.json", "chat-quota-resume-result.json", "android-real-server-quota-result.json", "android-controlled-success-result.json", "gemini-image-connection-result.json", "research-gemini-video.txt"]);
const extensions = new Set([".ts", ".tsx", ".css", ".html", ".json", ".mjs", ".sql", ".md", ".patch"]);
const language = (filename) => ({ ".ts": "typescript", ".tsx": "tsx", ".css": "css", ".html": "html", ".json": "json", ".mjs": "javascript", ".sql": "sql", ".md": "markdown", ".patch": "diff" }[path.extname(filename)] ?? "text");
const amzSignaturePattern = new RegExp("X-Amz-Signature" + "=[^&\\s)]+", "g");
const googSignaturePattern = new RegExp("X-Goog-Signature" + "=[^&\\s)]+", "g");
const redactedAmzSignature = "X-Amz-Signature" + "=<已遮蔽>";
const redactedGoogSignature = "X-Goog-Signature" + "=<已遮蔽>";

async function collect(directory) {
  const output = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(projectRoot, absolute);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name) && !relative.includes("/__manus__/")) output.push(...await collect(absolute));
      continue;
    }
    if (!entry.isFile() || excludedFiles.has(entry.name) || !extensions.has(path.extname(entry.name))) continue;
    if ((await stat(absolute)).size <= 350_000) output.push(relative);
  }
  return output;
}

const overview = `# Sticker Tycoon — 對話優先 LINE 貼圖工作室 GPT 交接包

**建立日期：** 2026-08-26（GMT+8）
**專案目錄：** \`sticker-tycoon-replica\`
**技術：** React 19、Tailwind CSS 4、Express、tRPC 11、Drizzle、MySQL、S3、Gemini Image、GPT Image 2、可替換 Agent Model Router。
**GitHub 同步狀態：** 第三階段完整來源已安全推送至 \`phase3-provider-preview\`。使用者指定的 \`chat-first-studio\` 曾與本機基線分岔；第四階段同步前必須比較遠端差異並取得使用者選擇，絕不 force push。

> 本文件可直接交給 GPT 或工程師。它包含可見需求歷程、最新架構、驗證結果、GitHub 推送流程與全部可分享文字原始碼。已排除 API 金鑰、.env、使用者原始照片、S3 presigned URL、二進位圖像、node_modules、建置產物與平台內部內容。

## 1. 產品目標與現在的使用方式

產品目標是「**簡單到像 ChatGPT，強大到能製作並下載整套 LINE 貼圖**」。首頁是深海藍、青藍與紫色的手機優先對話工作室：使用者可輸入自然語言、附加多張照片或檔案，AI 自動建立角色設定與 8／16／24／32／40 張貼圖計畫。使用者可指定單張或整套修改、設為角色／姿勢／場景／風格參考、檢視版本並回復單張，或於聊天欄直接下載最近完成的成果。另提供不連線 API 的 \`/preview\` 與 \`/preview/inspection\` 公開唯讀驗收展示。

| 層面 | 現行做法 |
| --- | --- |
| 角色理解與規劃 | LLM 分析自然語言與最多 4 張參考圖，輸出結構化角色設定與腳本；已確認角色設定不會被後續純文字對話覆寫；額度不足時改用可編輯備援腳本。 |
| Provider Adapter 與 Router | Gemini 與 GPT Image 透過統一 \`generate\`／\`edit\`／\`analyze\`／\`healthCheck\` 契約執行；每個任務保存 health、候選、參考快照、嘗試與 checkpoint。FLUX.2 未有使用者授權憑證，明確保持 disabled。 |
| Anchor 與一致性 | 角色、已確認角色、姿勢、場景、風格與目前修改圖依明確優先序選入；角色與 Style Anchor 會跨對話和 resume 保存。 |
| 圖像修改、品質與版本 | 品質 Agent 會檢查透明覆蓋、尺寸、邊界與文字長度，回傳 pass／fail／reason／suggestedFix；僅安全 Fix 一次再重檢。生成、重試和修改建立父子版本鏈與 active version，可回復指定版本而不刪除新版本。 |
| 整套自然語言修改 | 「全部變可愛一點」與「全部去背」會建立每張獨立 edit job／版本，跳過已合格圖片與 queued／retrying／paused 生成工作。 |
| 公開驗收 | Preview／Inspection 使用固定非個資兔子資料，不上傳檔案、不讀取私人專案、不呼叫 Studio API 或影像 Provider。它們直接共用正式的 Topbar、Message、Composer、Agent Workspace、Sticker Task 與 Preflight 元件及 \`chat-studio.css\`，不是平行假 UI；Inspection 額外提供 Desktop／Mobile 檢視與 Router 摘要。 |
| 繁體中文與 LINE 輸出 | 模型不負責最終中文字；LINE 匯出以 Noto Sans CJK TC SVG 後製，檢查 10px 安全邊距、370×320、透明 alpha、檔案大小、main／tab 與 ZIP。 |
| 保存與續作 | MySQL 保存對話、附件、Anchor、腳本、Agent 事件、Router／品質工作紀錄、版本與匯出；S3 保存檔案；projectKey 支援跨裝置續作。 |

## 2. 外部服務狀態與必讀限制

最近實測時，Gemini 圖像端點可能回傳 HTTP 429，而既有 GPT／Forge 服務可能回傳 412 usage exhausted。程式會保存 \`paused_quota\` checkpoint、參考快照、Router 決策、未完成項目和版本，顯示可續作訊息。**不得把供應端額度不足宣稱為外部模型生成成功，也不得刪除已完成工作。**

受控測試模式 \`STICKER_E2E_TEST_MODE=1\` 僅供本機成功路徑驗證；它不會在未設定該環境變數的開發或正式環境取代 Gemini／GPT Image。

## 3. 第二至四階段研究、設計與驗證

- \`research/phase-2-model-router-research.md\`：Gemini、GPT Image、FLUX.2 的可部署邊界、參考圖與 fallback 決策。
- \`docs/phase-2-agent-design.md\`：Anchor、Router、品質、版本、對話工作卡與相容 migration 設計。
- \`drizzle/0003_grey_sentinel.sql\`：已審閱並套用的非破壞 migration，新增 Style Anchor、Agent events 和 Router／品質／版本／參考圖欄位。
- \`docs/phase-3-capability-audit.md\`、\`docs/phase-3-delivery.md\`：Provider 可用性、Adapter、Quality Fix、Preview、已知限制與交付驗收。
- \`docs/phase-4-preview-component-audit.md\`、\`docs/phase-4-preview-delivery.md\`：首頁與 Preview 的共用元件決策、固定 Demo 流程、匿名安全邊界、桌面／Android 驗收與公開 URL。
- 第三階段未變更 Drizzle schema；Router／品質／pack scope／scene role 使用既有文字與 JSON 欄位、Agent events 保存，故不需 migration。

| 驗證 | 結果 |
| --- | --- |
| \`pnpm check\` | 通過。 |
| \`pnpm test\` | 通過；33 項單元／整合測試，覆蓋 Provider Adapter、FLUX disabled、health／quota fallback、Quality Fix、角色／姿勢／場景／風格 Anchor、整套修改、queued／retrying／paused 保留、版本與 LINE PNG／ZIP。 |
| \`pnpm build\` | 通過；部分 Vite chunk 大於 500kB 為效能優化建議，不是建置失敗。 |
| 桌面與 Android Playwright | 通過：主工作室的 8／16／24／32／40 快捷規劃、Provider health、LINE Preflight、版本、指定修改、LINE ZIP；Preview／Inspection 的唯讀附件／HEIC、八張任務、V2、品質、quota、Desktop／Mobile View，以及零 Studio API／影像 Provider 呼叫。 |
| 安全掃描 | 通過：未包含 .env、金鑰、預簽網址、使用者上傳絕對路徑、node_modules、dist 或回歸輸出。 |

## 4. 給下一位 AI／工程師的優先事項

1. 外部額度恢復後，以有權使用的人物／寵物素材重跑真實多圖端到端，人工審查角色一致性、透明邊緣、臉部／肢體及指定修改差異。
2. 保存 Provider 的 Retry-After／request ID，將短暫 rate limit 與需等待的 quota／billing 狀態進一步區分。
3. 針對前端大型 chunk 做 code splitting，尤其是 HEIC 與 Streamdown 相關模組。
4. 保持 AI 對話為唯一主要入口；不可偽造評價、星等、測試者或使用者見證。
5. 每次 GitHub 同步前先比較遠端分支；若 \`chat-first-studio\` 分岔，必須徵求使用者選擇安全合併或新分支，絕不 force push。

## 5. 可分享原始碼與設定

`;

const files = [];
for (const root of includeRoots) files.push(...await collect(path.join(projectRoot, root)));
for (const file of includeTopLevel) {
  try {
    const absolute = path.join(projectRoot, file);
    if ((await stat(absolute)).isFile() && (await stat(absolute)).size <= 350_000) files.push(file);
  } catch { /* optional source file */ }
}

const unique = [...new Set(files)].sort((a, b) => a.localeCompare(b));
let sources = `本章收錄 ${unique.length} 個文字檔；密鑰、二進位資料、使用者素材、測試結果與建置產物均已排除。\n\n`;
const fence = "````";
for (const relative of unique) {
  const content = await readFile(path.join(projectRoot, relative), "utf8");
  const safeContent = content
    .replace(/\/home\/ubuntu\/upload\/[^'"\s)]+/g, "<已遮蔽使用者測試素材路徑>")
    .replace(amzSignaturePattern, redactedAmzSignature)
    .replace(googSignaturePattern, redactedGoogSignature);
  sources += `### \`${relative}\`\n\n${fence}${language(relative)}\n${safeContent}\n${fence}\n\n`;
}

const footer = `## 6. 交接結論

此版本已升級為對話優先、手機優先、可保存且可驗收的 AI LINE 貼圖 Agent 工作室。第三階段補齊統一 Provider Adapter、health Router、場景 Anchor、整套自然語言修改、一次品質修正循環與主工作室 LINE Preflight；第四階段讓公開 Preview／Inspection 直接共用正式 Chat-first Studio UI，以固定 Demo 展示完整流程，並保持無登入、無 API、無秘密與無私人資料。外部服務的 429／412 屬供應端可用量狀態；系統會保留可續作 checkpoint，而非將其誤稱為成功。請以本文件、README、\`docs/phase-3-delivery.md\`、\`docs/phase-4-preview-delivery.md\`、測試與原始碼作為後續實作依據。\n`;

await writeFile(outputPath, `${overview}${sources}${footer}`, "utf8");
console.log(JSON.stringify({ outputPath, sourceFileCount: unique.length }));
