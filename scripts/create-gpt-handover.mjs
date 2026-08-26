import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "docs", "Sticker-Tycoon_對話優先LINE貼圖工作室_GPT-交接包.md");
const includeRoots = ["client", "server", "shared", "drizzle", "scripts", "research", "patches"];
const includeTopLevel = new Set(["package.json", "pnpm-lock.yaml", "tsconfig.json", "tsconfig.node.json", "vite.config.ts", "drizzle.config.ts", "components.json", "template.json", "README.md", "todo.md", ".gitignore"]);
const excludedDirs = new Set(["node_modules", "dist", ".git", ".manus-logs", "coverage", ".cache", "assets"]);
const excludedFiles = new Set(["generated-10-stickers.json", "chat-studio-flow-desktop.json", "chat-studio-flow-mobile.json", "chat-heic-upload-result.json", "chat-quota-resume-result.json", "android-real-server-quota-result.json", "android-controlled-success-result.json", "gemini-image-connection-result.json", "research-gemini-video.txt"]);
const extensions = new Set([".ts", ".tsx", ".css", ".html", ".json", ".mjs", ".sql", ".md", ".patch"]);
const language = (filename) => ({ ".ts": "typescript", ".tsx": "tsx", ".css": "css", ".html": "html", ".json": "json", ".mjs": "javascript", ".sql": "sql", ".md": "markdown", ".patch": "diff" }[path.extname(filename)] ?? "text");

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
**GitHub 安全分支：** \`phase2-agent-router\`（不改動既有 \`chat-first-studio\` 與 \`main\`）

> 本文件可直接交給 GPT 或工程師。它包含可見需求歷程、最新架構、驗證結果、GitHub 推送流程與全部可分享文字原始碼。已排除 API 金鑰、.env、使用者原始照片、S3 presigned URL、二進位圖像、node_modules、建置產物與平台內部內容。

## 1. 產品目標與現在的使用方式

產品目標是「**簡單到像 ChatGPT，強大到能製作並下載整套 LINE 貼圖**」。首頁是深海藍、青藍與紫色的手機優先對話工作室：使用者可輸入自然語言、附加多張照片或檔案，AI 自動建立角色設定與 8／16／24／32／40 張貼圖計畫。使用者可指定單張修改、設為角色／姿勢／風格參考、檢視版本並回復單張，或於聊天欄直接下載最近完成的成果。

| 層面 | 現行做法 |
| --- | --- |
| 角色理解與規劃 | LLM 分析自然語言與最多 4 張參考圖，輸出結構化角色設定與腳本；已確認角色設定不會被後續純文字對話覆寫；額度不足時改用可編輯備援腳本。 |
| Agent Router | 每個任務保存 Provider 候選、參考快照、嘗試歷程、品質與 checkpoint。新生成優先 Gemini、單張編修優先 GPT Image；FLUX.2 僅列為未設定憑證的候選。 |
| Anchor 與一致性 | 角色、已確認角色、姿勢、風格與目前修改圖依明確優先序選入；角色與 Style Anchor 會跨對話和 resume 保存。 |
| 圖像修改、品質與版本 | 透明 PNG 會寫入品質報告；生成、重試和修改建立父子版本鏈與 active version，可回復指定版本而不刪除新版本。 |
| 繁體中文與 LINE 輸出 | 模型不負責最終中文字；LINE 匯出以 Noto Sans CJK TC SVG 後製，檢查 10px 安全邊距、370×320、透明 alpha、檔案大小、main／tab 與 ZIP。 |
| 保存與續作 | MySQL 保存對話、附件、Anchor、腳本、Agent 事件、Router／品質工作紀錄、版本與匯出；S3 保存檔案；projectKey 支援跨裝置續作。 |

## 2. 外部服務狀態與必讀限制

最近實測時，Gemini 圖像端點可能回傳 HTTP 429，而既有 GPT／Forge 服務可能回傳 412 usage exhausted。程式會保存 \`paused_quota\` checkpoint、參考快照、Router 決策、未完成項目和版本，顯示可續作訊息。**不得把供應端額度不足宣稱為外部模型生成成功，也不得刪除已完成工作。**

受控測試模式 \`STICKER_E2E_TEST_MODE=1\` 僅供本機成功路徑驗證；它不會在未設定該環境變數的開發或正式環境取代 Gemini／GPT Image。

## 3. 第二階段研究、設計與驗證

- \`research/phase-2-model-router-research.md\`：Gemini、GPT Image、FLUX.2 的可部署邊界、參考圖與 fallback 決策。
- \`docs/phase-2-agent-design.md\`：Anchor、Router、品質、版本、對話工作卡與相容 migration 設計。
- \`drizzle/0003_grey_sentinel.sql\`：已審閱並套用的非破壞 migration，新增 Style Anchor、Agent events 和 Router／品質／版本／參考圖欄位。

| 驗證 | 結果 |
| --- | --- |
| \`pnpm check\` | 通過。 |
| \`pnpm test\` | 通過；19 項單元／整合測試，覆蓋 Router、品質、角色 Anchor、quota resume、參考圖角色、版本 V1→V2→回復、LINE PNG／ZIP。 |
| \`pnpm build\` | 通過；部分 Vite chunk 大於 500kB 為效能優化建議，不是建置失敗。 |
| 桌面與 Android Playwright | 通過：8 任務、reload、對話內成果、參考圖姿勢切換、版本回復、指定修改、LINE ZIP，且無 console error。 |
| 安全掃描 | 通過：未包含 .env、金鑰、預簽網址、使用者上傳絕對路徑、node_modules、dist 或回歸輸出。 |

## 4. 給下一位 AI／工程師的優先事項

1. 外部額度恢復後，以有權使用的人物／寵物素材重跑真實影像端到端，人工審查角色一致性、透明邊緣與指定修改差異。
2. 保存 Provider 的 Retry-After／request ID，將短暫 rate limit 與需等待的 quota／billing 狀態進一步區分。
3. 針對前端大型 chunk 做 code splitting，尤其是 HEIC 與 Streamdown 相關模組。
4. 保持 AI 對話為唯一主要入口；不可偽造評價、星等、測試者或使用者見證。

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
    .replace(/X-Amz-Signature=[^&\s)]+/g, "X-Amz-Signature=<已遮蔽>")
    .replace(/X-Goog-Signature=[^&\s)]+/g, "X-Goog-Signature=<已遮蔽>");
  sources += `### \`${relative}\`\n\n${fence}${language(relative)}\n${safeContent}\n${fence}\n\n`;
}

const footer = `## 6. 交接結論

此版本已升級為對話優先、手機優先、可保存的 AI LINE 貼圖 Agent 工作室。第二階段新增可追溯多模型 Router、角色／姿勢／風格 Anchor、版本回復、品質檢查、Agent 工作事件和對話內成果操作。外部服務的 429／412 屬供應端可用量狀態；系統會保留可續作 checkpoint，而非將其誤稱為成功。請以本文件、README、測試與原始碼作為後續實作依據。\n`;

await writeFile(outputPath, `${overview}${sources}${footer}`, "utf8");
console.log(JSON.stringify({ outputPath, sourceFileCount: unique.length }));
