import { chromium } from "playwright-core";

const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const viewportName = process.env.VIEWPORT === "mobile" ? "mobile" : "desktop";
const viewport = viewportName === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 900 };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport });
const apiCalls = [];
const providerCalls = [];
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("request", (request) => {
  const url = request.url();
  if (url.includes("/api/trpc")) apiCalls.push(url);
  if (/generativelanguage|openai|forge|blackforestlabs|fal\.ai/i.test(url)) providerCalls.push(url);
});

try {
  await page.goto(`${baseUrl}/preview`, { waitUntil: "networkidle" });
  if (!page.url().endsWith("/preview")) throw new Error(`Preview 不應要求登入或重新導向：${page.url()}`);
  await page.getByText("AI Inspection Preview，不代表真實 AI API 生成結果").waitFor();
  await page.getByText("我想製作 LINE 貼圖").first().waitFor();
  await page.getByText("可以！請告訴我角色、想要的動作與文字").waitFor();
  await page.getByText("Character Anchor").waitFor();
  await page.getByText("Style Anchor 已更新").waitFor();
  await page.getByText("Quota exhausted").waitFor();
  await page.getByText("Checkpoint saved").waitFor();
  await page.getByText("LINE Preflight Check 已完成").waitFor();
  await page.getByRole("button", { name: "8 張", exact: true }).waitFor();
  await page.getByRole("button", { name: "16 張", exact: true }).waitFor();
  await page.getByRole("button", { name: "24 張", exact: true }).waitFor();
  await page.getByRole("button", { name: "32 張", exact: true }).waitFor();
  await page.getByRole("button", { name: "40 張", exact: true }).waitFor();
  if (await page.locator(".sticker-task").count() !== 8) throw new Error("Preview 應完整顯示 8 張獨立貼圖任務");
  await page.getByText("V2").first().waitFor();
  await page.getByText("Fix → Pass").waitFor();
  await page.getByText("370 × 320").waitFor();
  await page.getByRole("button", { name: "AI 自動規劃" }).click();
  await page.getByRole("button", { name: "Quota checkpoint" }).click();
  await page.getByLabel("示範聊天輸入").fill("第3張多一隻腳");
  await page.locator(".composer-wrap .send-button").click();
  await page.getByText("Demo 已將第 3 張切換為 V2").waitFor();

  await page.goto(`${baseUrl}/preview/inspection`, { waitUntil: "networkidle" });
  if (!page.url().endsWith("/preview/inspection")) throw new Error(`Inspection 不應要求登入或重新導向：${page.url()}`);
  await page.getByText("以正式工作室元件檢查完整流程").waitFor();
  await page.getByRole("button", { name: "Desktop View" }).waitFor();
  await page.getByRole("button", { name: "Mobile View" }).click();
  await page.locator(".inspection-device.mobile").waitFor();
  await page.getByText("Selected Model／Fallback").waitFor();
  await page.getByText("Quality Check／Retry").waitFor();
  await page.getByText("Quota／Resume／Export").waitFor();
  if (apiCalls.length) throw new Error(`Preview 不應呼叫 Studio API：${apiCalls.join(", ")}`);
  if (providerCalls.length) throw new Error(`Preview 不應呼叫影像 Provider：${providerCalls.join(", ")}`);
  if (consoleErrors.length) throw new Error(`Preview 出現 console error：${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({ ok: true, viewport: viewportName, apiCalls: apiCalls.length, providerCalls: providerCalls.length, taskCount: 8, inspectionMobile: true }));
} finally {
  await browser.close();
}
