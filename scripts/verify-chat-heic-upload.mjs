import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30_000 });
  await page.locator(".attach-button input").setInputFiles("/home/ubuntu/upload/1000027865.heic");
  await page.getByText("1000027865.jpg").waitFor({ timeout: 30_000 });
  const previewCount = await page.locator(".queued-file img").count();
  if (previewCount !== 1) throw new Error(`Expected one converted JPEG preview, received ${previewCount}`);
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(" | ")}`);
  const result = { ok: true, convertedName: "1000027865.jpg", previewCount, consoleErrors };
  await writeFile("/home/ubuntu/sticker-tycoon-replica/chat-heic-upload-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
