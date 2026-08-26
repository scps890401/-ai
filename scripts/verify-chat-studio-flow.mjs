import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const baseUrl = "http://localhost:3000";
const viewportName = process.env.VIEWPORT === "desktop" ? "desktop" : "mobile";
const viewport = viewportName === "desktop" ? { width: 1280, height: 720 } : { width: 390, height: 844 };
const image = "https://placehold.co/512x512/png?text=Sticker";
const projectKey = "chatStudio1";
let sent = false;
let generated = false;
let zipExports = 0;
let referenceUpdates = 0;
let versionRestores = 0;
const consoleErrors = [];

const scripts = () => Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, position: index + 1, emotion: ["早安", "謝謝", "收到", "加油", "等等我", "好累喔", "太好了", "晚安"][index], phrase: ["早安", "謝謝", "收到", "加油", "等等我", "好累喔", "太好了", "晚安"][index], scene: "可愛日常姿勢", status: generated || index < 2 ? "ready" : "queued", resultUrl: generated || index < 2 ? image : null, errorMessage: null, qualityReport: JSON.stringify({ alphaVerified: true, touchesCanvasEdge: false, outputReady: true }), planJson: null, updatedAt: new Date().toISOString() }));
const jobs = () => Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, scriptId: index + 1, kind: "generate", status: generated || index < 2 ? "completed" : "queued", attempt: 0, provider: "gemini-3.1-flash-image", errorCode: null, errorMessage: null, checkpointJson: null, routerJson: JSON.stringify({ selectedProvider: "gemini-3.1-flash-image" }), qualityReportJson: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
const studio = () => sent ? {
  project: { id: 1, projectKey, title: "橘貓店長日常貼圖", brief: "幫我把橘貓做成 8 張可愛貼圖", characterProfile: "橘貓店長，圓眼睛，深藍圍裙", style: "可愛", stickerCount: 8, status: "generating", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  conversation: { id: 1, projectId: 1, status: "active", lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  messages: [{ id: 1, conversationId: 1, role: "user", content: "幫我把這隻橘貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。", intentJson: null, createdAt: new Date().toISOString() }, { id: 2, conversationId: 1, role: "assistant", content: "我已建立角色設定與 8 張日常貼圖計畫，正在從第 1 張開始製作。", intentJson: "{}", createdAt: new Date().toISOString() }],
  attachments: [], characterProfile: { id: 1, projectId: 1, profileJson: "{}", anchorUrl: image, status: "ready", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, styleAnchor: null, references: [{ id: 90, projectId: 1, url: image, fileName: "cat.png", sortOrder: 0, role: "accepted_character", priority: 10, accepted: true, metadataJson: "{}", createdAt: new Date().toISOString() }], versions: [{ id: 91, scriptId: 1, version: 1, url: image, mode: "generate", parentVersionId: null, isActive: false, qualityReportJson: "{}", provider: "gemini-3.1-flash-image", createdAt: new Date().toISOString() }, { id: 92, scriptId: 1, version: 2, url: image, mode: "refine", parentVersionId: 91, isActive: true, qualityReportJson: "{}", provider: "gpt-image-2", createdAt: new Date().toISOString() }], events: [{ id: 93, projectId: 1, jobId: 1, kind: "quality", status: "completed", message: "第 1 張已完成並通過基本品質檢查。", detailJson: "{}", createdAt: new Date().toISOString() }], scripts: scripts(), jobs: jobs(), exports: [],
} : null;

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport });
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.route("**/api/trpc/**", async (route) => {
  const url = route.request().url();
  if (url.includes("studio.get") && url.includes("studio.providerHealth")) {
    const health = { "gemini-3.1-flash-image": { status: "healthy" }, "gpt-image-2": { status: "healthy" }, "flux-2": { status: "disabled" } };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify([{ result: { data: { json: studio() } } }, { result: { data: { json: health } } }]) });
  }
  const data = url.includes("studio.exportLinePack") ? (zipExports += 1, { url: image, fileName: "line-sticker-pack.zip", reports: [], zipBytes: 2048 }) : url.includes("studio.setReferenceRole") ? (referenceUpdates += 1, { id: 90, projectId: 1, url: image, role: "pose", accepted: false }) : url.includes("studio.restoreVersion") ? (versionRestores += 1, { position: 1, url: image, version: 1, status: "completed" }) : url.includes("studio.providerHealth") ? { "gemini-3.1-flash-image": { status: "healthy" }, "gpt-image-2": { status: "healthy" }, "flux-2": { status: "disabled" } } : url.includes("studio.sendMessage") ? (sent = true, { projectKey, intent: "generate_pending", reply: "我已建立角色設定與 8 張日常貼圖計畫，正在從第 1 張開始製作。", character: null, assistantMessageId: 2, autoRun: true }) : url.includes("studio.runPending") ? (generated = true, { projectKey, completed: [{ jobId: 1, scriptId: 1, status: "completed", url: image }, { jobId: 2, scriptId: 2, status: "completed", url: image }], remaining: 0 }) : url.includes("studio.get") ? studio() : null;
  if (data === null) return route.continue();
  return route.fulfill({ contentType: "application/json", body: JSON.stringify([{ result: { data: { json: data } } }]) });
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });
  await page.getByRole("heading", { name: "像聊天一樣，完成一整套貼圖。" }).waitFor();
  await page.getByPlaceholder(/幫我把這隻貓做成/).fill("幫我把這隻橘貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。");
  await page.locator(".send-button").click();
  await page.getByText("我已建立角色設定與 8 張日常貼圖計畫").waitFor({ timeout: 10_000 });
  await page.getByText("第 1 張 · 早安").waitFor();
  await page.getByText("AGENT WORKSPACE").waitFor();
  await page.getByText("參考圖錨點").waitFor();
  await page.getByText("LINE PREFLIGHT").waitFor();
  await page.getByText("PNG 370 × 320（輸出時）").waitFor();
  await page.getByText("Gemini · 可用").waitFor();
  await page.getByRole("button", { name: "24 張" }).waitFor();
  await page.getByRole("button", { name: "32 張" }).waitFor();
  await page.getByRole("button", { name: "40 張" }).waitFor();
  await page.getByText("Gemini · 透明已檢查").first().waitFor();
  await page.locator(".agent-result-strip").waitFor();
  const taskCount = await page.locator(".sticker-task").count();
  if (taskCount !== 8) throw new Error("Expected eight independently rendered sticker tasks");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("橘貓店長日常貼圖").waitFor();
  if (await page.locator(".sticker-task").count() !== 8) throw new Error("Saved projectKey must restore independently tracked sticker tasks after reload");
  await page.locator(".reference-tray").getByRole("button", { name: "姿勢" }).click();
  await page.waitForTimeout(200);
  if (referenceUpdates !== 1) throw new Error("Expected one reference role update request");
  const firstTask = page.locator(".sticker-task").first();
  await firstTask.getByRole("button", { name: /V2/ }).click();
  await firstTask.getByRole("button", { name: /V1.*回復/ }).click();
  await page.waitForTimeout(200);
  if (versionRestores !== 1) throw new Error("Expected one version restore request");
  await page.getByRole("button", { name: "告訴 AI 修改" }).first().click();
  const editPrompt = await page.getByPlaceholder(/幫我把這隻貓做成/).inputValue();
  if (!editPrompt.includes("第 1 張請修改")) throw new Error("Single sticker edit must target the selected position");
  await page.getByRole("button", { name: "LINE ZIP" }).click();
  await page.waitForTimeout(500);
  if (zipExports !== 1) throw new Error("Expected one LINE ZIP export request");
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(" | ")}`);
  const result = { ok: true, viewport: viewportName, taskCount, editPrompt, projectRestoredAfterReload: true, zipExports, referenceUpdates, versionRestores, consoleErrors };
  await writeFile(`/home/ubuntu/sticker-tycoon-replica/chat-studio-flow-${viewportName}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
