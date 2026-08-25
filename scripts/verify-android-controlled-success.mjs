import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45_000 });
  await page.locator(".attach-button input").setInputFiles("/home/ubuntu/upload/1000027865.heic");
  await page.getByText("1000027865.jpg").waitFor({ timeout: 30_000 });
  await page.getByPlaceholder(/幫我把這隻貓做成/).fill("幫我把這隻橘貓做成 8 張可愛的 LINE 貼圖，使用繁體中文。角色是深藍圍裙、圓眼睛的橘貓店長。");
  await page.locator(".send-button").click();
  await page.getByText("第 1 張 · 早安").waitFor({ timeout: 45_000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".task-status")].every((item) => item.textContent?.includes("已完成")), undefined, { timeout: 60_000 });
  const initialTaskCount = await page.locator(".sticker-task").count();
  if (initialTaskCount !== 8) throw new Error(`Expected eight generated tasks, received ${initialTaskCount}`);

  await page.getByRole("button", { name: "告訴 AI 修改" }).first().click();
  await page.getByPlaceholder(/幫我把這隻貓做成/).fill("第 1 張請修改：眼睛大一點，表情更開心。");
  await page.locator(".send-button").click();
  await page.getByText("第 1 張已依照你的要求完成修改").waitFor({ timeout: 45_000 });

  const singleDownload = page.waitForEvent("download", { timeout: 45_000 });
  await page.getByRole("button", { name: "匯出第 1 張 LINE PNG" }).click();
  const single = await singleDownload;
  if (!single.suggestedFilename().endsWith(".png")) throw new Error("Expected a PNG single-sticker download");

  const zipDownload = page.waitForEvent("download", { timeout: 45_000 });
  await page.getByRole("button", { name: "LINE ZIP" }).click();
  const zip = await zipDownload;
  if (!zip.suggestedFilename().endsWith(".zip")) throw new Error("Expected a ZIP pack download");

  const projectCode = await page.locator(".project-chip button").textContent();
  await page.reload({ waitUntil: "networkidle", timeout: 45_000 });
  if (await page.locator(".sticker-task").count() !== 8) throw new Error("Expected saved project to restore after reload");
  const fatalErrors = consoleErrors.filter((message) => !/failed to load resource/i.test(message));
  if (fatalErrors.length) throw new Error(`Unexpected browser console errors: ${fatalErrors.join(" | ")}`);
  const result = { ok: true, projectKey: projectCode?.trim(), initialTaskCount, heicConverted: true, editCompleted: true, singleDownload: single.suggestedFilename(), zipDownload: zip.suggestedFilename(), restoredAfterReload: true, consoleErrors };
  await writeFile("/home/ubuntu/sticker-tycoon-replica/android-controlled-success-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
