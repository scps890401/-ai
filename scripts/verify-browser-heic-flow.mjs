import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:3000';
const files = (process.env.HEIC_FIXTURE_PATHS ?? '').split(path.delimiter).filter(Boolean);
if (files.length !== 5) throw new Error('請以 HEIC_FIXTURE_PATHS 提供五個以系統路徑分隔符連接的 HEIC 測試檔案。');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#studio').scrollIntoViewIfNeeded();
  await page.getByLabel('貼圖張數').selectOption('4');
  await page.getByRole('button', { name: /讓 AI 規劃我的貼圖組/ }).click();
  await page.getByText('建立角色設定檔').waitFor({ timeout: 20_000 });

  await page.locator('input[type="file"]').setInputFiles('/tmp/oversize-reference.jpg');
  await page.getByText('檔案超過 12 MB').waitFor({ timeout: 10_000 });
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.locator('.reference-thumb').nth(4).waitFor({ timeout: 90_000 });
  const referenceCount = await page.locator('.reference-thumb').count();
  const uploadErrorCount = await page.locator('.upload-errors li').count();
  if (referenceCount !== 5 || uploadErrorCount !== 0) throw new Error(`HEIC browser upload failed: references=${referenceCount} errors=${uploadErrorCount}`);

  await page.getByRole('button', { name: /建立角色與專案/ }).click();
  await page.getByText('編輯文字與情境腳本').waitFor({ timeout: 20_000 });
  const firstPhrase = await page.locator('.script-row input').nth(0).inputValue();
  const secondPhrase = await page.locator('.script-row input').nth(3).inputValue();
  await page.getByRole('button', { name: '腳本上移' }).nth(1).click();
  const reorderedFirstPhrase = await page.locator('.script-row input').nth(0).inputValue();
  if (reorderedFirstPhrase !== secondPhrase || firstPhrase === reorderedFirstPhrase) throw new Error('Script sorting did not reorder the visible rows');

  await page.getByRole('button', { name: /開始批次生成/ }).click();
  await page.locator('.batch-card').nth(3).waitFor({ timeout: 90_000 });
  const failedCards = await page.locator('.batch-failed').count();
  const zipVisible = await page.getByRole('button', { name: /匯出 ZIP/ }).count();
  if (failedCards !== 4 || zipVisible !== 0) throw new Error(`Batch quota guard failed: failedCards=${failedCards} zipVisible=${zipVisible}`);

  await page.locator('.batch-card').first().click();
  await page.locator('.chat-composer input').fill('把文字改成早安');
  await page.locator('.chat-composer').press('Enter');
  await page.getByText('這張貼圖尚未生成成功').waitFor({ timeout: 10_000 });

  const projectKeyText = await page.locator('.batch-summary .eyebrow').textContent();
  const projectKey = projectKeyText?.replace(/^專案\s+/, '').trim() || '';
  if (!projectKey) throw new Error('Could not read the created project key');

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('#studio').scrollIntoViewIfNeeded();
  await page.getByPlaceholder('已有專案代碼，例如：Ab3kL9mN2pQx').fill(projectKey);
  await page.getByRole('button', { name: '載入既有專案' }).click();
  await page.locator('.batch-failed').nth(3).waitFor({ timeout: 20_000 });
  const restoredFailedCards = await page.locator('.batch-failed').count();
  if (restoredFailedCards !== 4) throw new Error(`Project resume did not restore failed items: ${restoredFailedCards}`);

  await page.screenshot({ path: '/tmp/heic-browser-flow.png', fullPage: true });
  const result = { ok: true, referenceCount, uploadErrorCount, failedCards, zipVisible, projectKey, restoredFailedCards, consoleErrors };
  await writeFile('/home/ubuntu/sticker-tycoon-replica/browser-heic-flow-result.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
