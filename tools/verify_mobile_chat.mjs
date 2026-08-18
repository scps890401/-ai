import { chromium } from "playwright";

const url = process.env.STICKER_PREVIEW_URL || "https://3000-is7gr11wsyrrjw4z7n36n-c7d3bcf6.sg1.manus.computer/";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
const textarea = page.locator('textarea[placeholder*="我想做一組兔子日常貼圖"]');
await textarea.fill("我想製作 LINE 貼圖");
await textarea.press("Enter");
await page.waitForTimeout(5000);
const firstReply = await page.locator("text=請問是要隨機生成").count();
await textarea.fill("隨機生成");
await textarea.press("Enter");
await page.waitForTimeout(8000);
const modeText = await page.locator("text=隨機生成").count();
const prompt = await page.locator("#prompt").inputValue();
console.log(JSON.stringify({ viewport: page.viewportSize(), firstReply, modeText, prompt }));
await page.screenshot({ path: "/home/ubuntu/screenshots/mobile-chat-flow.png", fullPage: false });
await browser.close();
