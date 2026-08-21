import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = 'http://localhost:3000';
const projectKey = 'ui-success-export-check';
const manifest = JSON.parse(await readFile('/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json', 'utf8'));
const seededResults = manifest.results.filter((item) => item.url).slice(0, 4);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.addInitScript(({ key, results }) => {
    window.localStorage.setItem('sticker-tycoon-project-key', key);
    window.localStorage.setItem(`sticker-tycoon-results-${key}`, JSON.stringify(results));
  }, { key: projectKey, results: seededResults });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('.batch-card').nth(3).waitFor({ timeout: 25_000 });
  const firstPhrase = await page.locator('.batch-card-footer strong').first().textContent();
  const secondPhrase = await page.locator('.batch-card-footer strong').nth(1).textContent();
  await page.getByRole('button', { name: '貼圖下移' }).first().click();
  const reorderedFirstPhrase = await page.locator('.batch-card-footer strong').first().textContent();
  if (reorderedFirstPhrase !== secondPhrase || firstPhrase === reorderedFirstPhrase) throw new Error('Result sorting did not update UI order');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /匯出 ZIP/ }).click();
  const download = await downloadPromise;
  const zipPath = '/tmp/sticker-ui-export.zip';
  await download.saveAs(zipPath);

  await page.locator('.batch-card').first().click();
  const beforeRefine = await page.locator('.batch-image-wrap img').first().getAttribute('src');
  await page.locator('.chat-composer input').fill('把表情改得更開心');
  await page.locator('.chat-composer input').press('Enter');
  await page.locator('.chat-message.assistant p').filter({ hasText: /使用量已暫時耗盡|原本版本已保留/ }).last().waitFor({ timeout: 20_000 });
  const afterRefine = await page.locator('.batch-image-wrap img').first().getAttribute('src');
  if (beforeRefine !== afterRefine) throw new Error('Failed refine should preserve the original result');
  const notice = await page.locator('.toast').textContent();
  if (!notice?.includes('使用量已暫時耗盡') || notice.includes('修改完成')) throw new Error('Usage-exhausted refine should show a non-success fallback notice');
  if (consoleErrors.length) throw new Error(`Unexpected browser console errors: ${consoleErrors.join(' | ')}`);

  const result = { ok: true, firstPhrase, secondPhrase, reorderedFirstPhrase, zipPath, suggestedFilename: download.suggestedFilename(), consoleErrors };
  await writeFile('/home/ubuntu/sticker-tycoon-replica/browser-success-result-flow.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
