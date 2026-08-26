import { chromium } from "playwright-core";

const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const viewport = process.env.VIEWPORT === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 720 };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport });
const apiCalls = [];
page.on("request", (request) => {
  if (request.url().includes("/api/trpc")) apiCalls.push(request.url());
});

await page.goto(`${baseUrl}/preview`, { waitUntil: "networkidle" });
await page.getByText("公開唯讀示範").waitFor();
await page.getByText("兔兔的日常對話").waitFor();
await page.getByRole("button", { name: "示範附件" }).waitFor();
await page.getByText("跳躍姿勢.heic").waitFor();
await page.getByText("HEIC → JPEG（裝置端）").waitFor();
await page.getByText("唯讀，不會實際上傳").waitFor();
await page.getByRole("button", { name: "V1 原始" }).click();
await page.getByRole("button", { name: /查看修正|已顯示修正紀錄/ }).click();
await page.getByRole("button", { name: "描述需求" }).click();
await page.getByRole("button", { name: "生成與檢查" }).click();
if (apiCalls.length) throw new Error(`Preview 不應呼叫 Studio API：${apiCalls.join(", ")}`);

await page.goto(`${baseUrl}/preview/inspection`, { waitUntil: "networkidle" });
await page.getByText("貼圖 Agent 的可檢查工作鏈").waitFor();
await page.getByText("FLUX.2").waitFor();
await page.getByText("未設定，保持 disabled").waitFor();
if (apiCalls.length) throw new Error(`Inspection 不應呼叫 Studio API：${apiCalls.join(", ")}`);

console.log(JSON.stringify({ viewport, previewApiCalls: apiCalls.length, inspection: "ok" }));
await browser.close();
