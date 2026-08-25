import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const projectKey = "quotaResume1";
let sent = false;
let quotaCalls = 0;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

const studio = () => sent ? { project: { id: 1, projectKey, title: "續作測試", brief: "製作貼圖", characterProfile: "橘貓", style: "可愛", stickerCount: 8, status: "generating", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, conversation: { id: 1, projectId: 1, status: "active", lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() }, messages: [{ id: 1, conversationId: 1, role: "assistant", content: "貼圖任務已保存，正在生成。", intentJson: "{}", createdAt: new Date().toISOString() }], attachments: [], characterProfile: null, scripts: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, position: index + 1, emotion: "日常", phrase: `文字${index + 1}`, scene: "姿勢", status: "queued", resultUrl: null, errorMessage: null, qualityReport: null, updatedAt: new Date().toISOString() })), jobs: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, projectId: 1, scriptId: index + 1, kind: "generate", status: index === 0 ? "paused_quota" : "queued", attempt: 1, provider: "gemini", errorCode: index === 0 ? "USAGE_EXHAUSTED" : null, errorMessage: index === 0 ? "quota" : null, checkpointJson: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })), exports: [] } : null;

await page.route("**/api/trpc/**", async (route) => {
  const url = route.request().url();
  const data = url.includes("studio.sendMessage") ? (sent = true, { projectKey, intent: "generate_pending", reply: "我已建立 8 張貼圖任務。", character: null, assistantMessageId: 2, autoRun: true }) : url.includes("studio.runPending") ? (quotaCalls += 1, { projectKey, completed: [{ jobId: 1, scriptId: 1, status: "paused_quota", message: "quota" }], remaining: 7 }) : url.includes("studio.get") ? studio() : null;
  if (data === null) return route.continue();
  return route.fulfill({ contentType: "application/json", body: JSON.stringify([{ result: { data: { json: data } } }]) });
});

try {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30_000 });
  await page.getByPlaceholder(/幫我把這隻貓做成/).fill("幫我做 8 張可愛貼圖");
  await page.locator(".send-button").click();
  await page.getByText("AI 額度目前已用完，已完成與未完成進度都已保存").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "繼續製作" }).waitFor();
  if (quotaCalls !== 1) throw new Error(`Expected one paused quota task, received ${quotaCalls}`);
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(" | ")}`);
  const result = { ok: true, quotaCalls, resumeButtonVisible: true, consoleErrors };
  await writeFile("/home/ubuntu/sticker-tycoon-replica/chat-quota-resume-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
