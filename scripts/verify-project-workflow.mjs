import { appRouter } from '../server/routers.ts';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const ctx = { user: null, req: { protocol: 'https', headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const directory = '/tmp/sticker-heic-verification';
const files = (await readdir(directory)).filter((name) => name.endsWith('.jpg')).sort();
const references = [];

for (const [sortOrder, fileName] of files.entries()) {
  const bytes = await readFile(`${directory}/${fileName}`);
  const photoDataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const prepared = await caller.project.prepareReference({ photoDataUrl, fileName });
  references.push({ url: prepared.url, fileName: prepared.fileName, sortOrder });
}

const plan = await caller.project.plan({
  brief: '使用五張角色照片製作實用的繁體中文卡通貼圖。',
  style: '可愛手繪',
  stickerCount: 4,
  characterProfile: '保留照片中的角色外觀、五官與辨識特徵。',
});
const scripts = plan.scripts.slice(0, 4);
const project = await caller.project.create({
  title: `${plan.title || 'HEIC 診斷'}（系統驗證）`,
  brief: 'HEIC 多檔上傳與網站流程驗證。',
  style: '可愛手繪',
  stickerCount: 4,
  characterProfile: plan.characterProfile,
  references,
  scripts,
});
const loaded = await caller.project.get({ projectKey: project.projectKey });
if (!loaded || loaded.references.length !== references.length || loaded.scripts.length !== scripts.length) throw new Error('專案建立或載入資料不完整');

const quality = await caller.creative.qualityCheck({ url: references[0].url, phrase: scripts[0].phrase });
const zip = await caller.creative.exportZip({ files: references.slice(0, 2).map((item, index) => ({ url: item.url, fileName: `diagnostic-${index + 1}.jpg` })) });
if (!zip.base64 || !zip.fileName.endsWith('.zip')) throw new Error('ZIP 匯出未回傳有效內容');

const batch = await caller.creative.generateBatch({
  projectKey: project.projectKey,
  photoDataUrl: references[0].url,
  referenceUrls: references.map((item) => item.url),
  style: '可愛手繪',
  characterProfile: plan.characterProfile,
  items: scripts.slice(0, 1),
});
const restored = await caller.project.get({ projectKey: project.projectKey });
const result = {
  projectKey: project.projectKey,
  uploaded: references.length,
  scripts: scripts.length,
  quality,
  zipBytes: Buffer.from(zip.base64, 'base64').length,
  batch,
  restoredScript: restored?.scripts[0],
};
await writeFile('/home/ubuntu/sticker-tycoon-replica/workflow-diagnostic-result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
