import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = 'http://localhost:3000';
const viewportName = process.env.VIEWPORT === 'desktop' ? 'desktop' : 'mobile';
const viewport = viewportName === 'desktop' ? { width: 1280, height: 720 } : { width: 390, height: 844 };
const manifest = JSON.parse(await readFile('/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json', 'utf8'));
const [sampleImage, variationImage] = manifest.results.filter((item) => item.url).map((item) => item.url).slice(0, 2);
if (!sampleImage || !variationImage) throw new Error('Need two existing generated sticker URLs for browser mock');

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport });
const consoleErrors = [];
let sampleCalls = 0;
let variationCalls = 0;
let variationBody = '';
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

await page.route('**/api/trpc/**', async (route) => {
  const url = route.request().url();
  const data = url.includes('creative.generateSample')
    ? (sampleCalls += 1, { url: sampleImage, hasAlpha: true, mode: 'sample' })
    : url.includes('creative.generateVariation')
      ? (variationCalls += 1, variationBody = route.request().postData() || '', { url: variationImage, hasAlpha: true, mode: 'variation' })
      : null;
  if (!data) return route.continue();
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ result: { data: { json: data } } }]) });
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByLabel('角色需求').fill('戴圓眼鏡、穿深藍圍裙的橘貓店長');
  await page.getByLabel('動作').fill('揮手打招呼');
  await page.getByLabel('文字').fill('你好');
  await page.getByRole('button', { name: '生成角色樣本' }).click();
  await page.getByText('角色樣本已生成').waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: '確認這個角色' }).waitFor();
  if (sampleCalls !== 1) throw new Error(`Expected one sample request, received ${sampleCalls}`);

  await page.getByRole('button', { name: '確認這個角色' }).click();
  await page.getByText('角色樣本已確認').waitFor();
  await page.getByLabel('角色需求').isDisabled().then((disabled) => { if (!disabled) throw new Error('Confirmed character requirement must be locked'); });
  await page.getByLabel('動作').fill('端咖啡');
  await page.getByLabel('文字').fill('請慢用');
  await page.getByRole('button', { name: '生成同款角色圖片' }).click();
  await page.getByText('同款角色圖片已新增').waitFor({ timeout: 10_000 });
  if (variationCalls !== 1) throw new Error(`Expected one variation request, received ${variationCalls}`);
  if (!variationBody.includes(sampleImage)) throw new Error('Variation request must use the approved sample URL as its reference');
  await page.getByRole('heading', { name: '同款角色的其他版本' }).waitFor();
  if (await page.locator('.variation-card').count() !== 1) throw new Error('Expected one rendered same-character variation');
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(' | ')}`);
  const result = { ok: true, viewport: viewportName, sampleCalls, variationCalls, variationUsesApprovedSample: variationBody.includes(sampleImage), consoleErrors };
  await writeFile(`/home/ubuntu/sticker-tycoon-replica/minimal-character-flow-${viewportName}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
