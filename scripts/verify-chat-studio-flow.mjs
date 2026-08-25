import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const baseUrl = "http://localhost:3000";
const viewportName = process.env.VIEWPORT === "desktop" ? "desktop" : "mobile";
const viewport = viewportName === "desktop" ? { width: 1280, height: 720 } : { width: 390, height: 844 };
const image = "https://placehold.co/512x512/png?text=Sticker";
const projectKey = "chatStudio1";
let sent = false;
let generated = false;
const consoleErrors = [];

const scripts = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, position: index + 1, emotion: ["早安", "謝謝", "收到", "加油", "等等我", "好累喔", "太好了", "晚安"][index], phrase: ["早安", "謝謝", "收到", "加油", "等等我", "好累喔", "太好了", "晚安"][index], scene: "可愛日常姿勢", status: generated || index < 2 ? "ready" : "queued", resultUrl: generated || index < 2 ? image : null, errorMessage: null, qualityReport: null, updatedAt: new Date().toISOString() }));
const jobs = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, scriptId: index + 1, kind: "generate", status: generated || index < 2 ? "completed" : "queued", attempt: 0, provider: "gemini", errorCode: null, errorMessage: null, checkpointJson: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
const studio = () => sent ? {
  project: { id: 1, projectKey, title: "橘貓店長日常貼圖", brief: "幫我把橘貓做成 8 張可愛貼圖", characterProfile: "橘貓店長，圓眼睛，深藍圍裙", style: "可愛", stickerCount: 8, status: "generating", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  conversation: { id: 1, projectId: 1, status: "active", lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  messages: [{ id: 1, conversationId: 1, role: "user", content: "幫我把這隻橘貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。", intentJson: null, createdAt: new Date().toISOString() }, { id: 2, conversationId: 1, role: "assistant", content: "我已建立角色設定與 8 張日常貼圖計畫，正在從第 1 張開始製作。", intentJson: "{}", createdAt: new Date().toISOString() }],
  attachments: [], characterProfile: { id: 1, projectId: 1, profileJson: "{}", anchorUrl: image, status: "ready", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, scripts, jobs, exports: [],
} : null;

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport });
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.route("**/api/trpc/**", async (route) => {
  const url = route.request().url();
  const data = url.includes("studio.get") ? studio() : url.includes("studio.sendMessage") ? (sent = true, { projectKey, intent: "generate_pending", reply: "我已建立角色設定與 8 張日常貼圖計畫，正在從第 1 張開始製作。", character: null, assistantMessageId: 2, autoRun: true }) : url.includes("studio.runPending") ? (generated = true, { projectKey, completed: [{ jobId: 1, scriptId: 1, status: "completed", url: image }, { jobId: 2, scriptId: 2, status: "completed", url: image }], remaining: 6 }) : null;
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
  if (await page.locator(".sticker-task").count() !== 8) throw new Error("Expected eight independently rendered sticker tasks");
  await page.getByRole("button", { name: "告訴 AI 修改" }).first().click();
  const editPrompt = await page.getByPlaceholder(/幫我把這隻貓做成/).inputValue();
  if (!editPrompt.includes("第 1 張請修改")) throw new Error("Single sticker edit must target the selected position");
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(" | ")}`);
  const result = { ok: true, viewport: viewportName, taskCount: await page.locator(".sticker-task").count(), editPrompt, consoleErrors };
  await writeFile(`/home/ubuntu/sticker-tycoon-replica/chat-studio-flow-${viewportName}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
