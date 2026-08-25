import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30_000 });
  await page.getByPlaceholder(/幫我把這隻貓做成/).fill("幫我做 8 張可愛的橘貓 LINE 貼圖，使用繁體中文。\n角色是穿深藍圍裙、圓眼睛的橘貓店長。");
  await page.locator(".send-button").click();
  await page.getByRole("button", { name: "繼續製作" }).waitFor({ timeout: 45_000 });
  await page.getByText("AI 額度目前已用完，已完成與未完成進度都已保存").waitFor({ timeout: 45_000 });
  const projectCode = await page.locator(".project-chip button").textContent();
  if (!projectCode?.trim()) throw new Error("Expected a persisted projectKey in the Android UI");
  await page.getByRole("button", { name: "繼續製作" }).click();
  await page.getByText("AI 額度目前已用完，已完成與未完成進度都已保存").waitFor({ timeout: 45_000 });
  const taskCount = await page.locator(".sticker-task").count();
  if (taskCount !== 8) throw new Error(`Expected eight saved tasks after quota pause, received ${taskCount}`);
  const fatalErrors = consoleErrors.filter((message) => !/failed to load resource|412|429/i.test(message));
  if (fatalErrors.length) throw new Error(`Unexpected browser console errors: ${fatalErrors.join(" | ")}`);
  const result = { ok: true, projectKey: projectCode.trim(), taskCount, quotaPauseVisible: true, resumedFromSavedProject: true, consoleErrors };
  await writeFile("/home/ubuntu/sticker-tycoon-replica/android-real-server-quota-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
