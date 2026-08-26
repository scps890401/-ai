import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.PREVIEW_CAPTURE_BASE_URL ?? "http://localhost:3000";
const outputDir = path.resolve(import.meta.dirname, "..", "docs", "preview-inspection", "PREVIEW-SCREENSHOTS");
const desktop = { width: 1280, height: 900 };
const tablet = { width: 768, height: 1024 };
const mobile = { width: 390, height: 844 };

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const captured = [];

async function capture({ id, route = "/preview", viewport, prepare, focus }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.getByText("AI Inspection Preview，不代表真實 AI API 生成結果").waitFor();
  if (prepare) await prepare(page);
  if (focus) await page.locator(focus).scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const filePath = path.join(outputDir, id);
  await page.screenshot({ path: filePath, fullPage: false });
  captured.push({ id, route, viewport, focus: focus ?? "page-top" });
  await page.close();
}

const clickAutoPlan = async (page) => page.getByRole("button", { name: "AI 自動規劃", exact: true }).click();
const clickGenerate = async (page) => page.getByRole("button", { name: "開始製作", exact: true }).click();
const clickQuality = async (page) => page.getByRole("button", { name: "查看品質循環", exact: true }).click();
const clickTaskEdit = async (page) => page.locator(".sticker-task").nth(2).getByRole("button", { name: "告訴 AI 修改", exact: true }).click();
const clickTaskVersion = async (page) => page.locator(".sticker-task").nth(2).getByRole("button", { name: "V2", exact: true }).click();

try {
  await capture({ id: "01-home.png", viewport: desktop });
  await capture({ id: "02-chat.png", viewport: desktop, focus: ".preview-message-list" });
  await capture({ id: "03-ai-response.png", viewport: desktop, prepare: clickAutoPlan, focus: ".preview-message-list" });
  await capture({ id: "04-sticker-plan.png", viewport: desktop, prepare: clickGenerate, focus: ".agent-inline-card" });
  await capture({ id: "05-generation.png", viewport: desktop, prepare: clickGenerate, focus: ".task-grid" });
  await capture({ id: "06-results.png", viewport: desktop, focus: ".task-grid" });
  await capture({ id: "07-edit.png", viewport: desktop, prepare: clickTaskEdit, focus: ".task-grid" });
  await capture({ id: "08-version.png", viewport: desktop, prepare: clickTaskVersion, focus: ".task-grid" });
  await capture({ id: "09-quality-check.png", viewport: desktop, prepare: clickQuality, focus: ".preview-message-list" });
  await capture({ id: "10-export.png", viewport: desktop, focus: ".main-preflight" });

  await capture({ id: "tablet-01-workspace.png", viewport: tablet, focus: ".task-grid" });
  await capture({ id: "mobile-01-home.png", viewport: mobile });
  await capture({ id: "mobile-02-chat.png", viewport: mobile, prepare: clickAutoPlan, focus: ".preview-message-list" });
  await capture({ id: "mobile-03-results.png", viewport: mobile, focus: ".task-grid" });
  await capture({ id: "mobile-04-edit.png", viewport: mobile, prepare: clickTaskEdit, focus: ".task-grid" });
  await capture({ id: "mobile-05-export.png", viewport: mobile, focus: ".main-preflight" });

  await capture({ id: "inspection-desktop.png", route: "/preview/inspection", viewport: desktop, focus: ".inspection-device" });
  await capture({ id: "inspection-mobile.png", route: "/preview/inspection", viewport: desktop, prepare: async (page) => page.getByRole("button", { name: "Mobile View", exact: true }).click(), focus: ".inspection-device" });
  console.log(JSON.stringify({ baseUrl, outputDir, count: captured.length, captured }));
} finally {
  await browser.close();
}
