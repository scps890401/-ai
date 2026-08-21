import { appRouter } from '../server/routers.ts';
import { readFile, readdir } from 'node:fs/promises';

const ctx = { user: null, req: { protocol: 'https', headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const directory = '/tmp/sticker-heic-verification';
const files = (await readdir(directory)).filter((name) => name.endsWith('.jpg')).sort();
const results = [];

for (const fileName of files) {
  try {
    const bytes = await readFile(`${directory}/${fileName}`);
    const photoDataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    const result = await caller.project.prepareReference({ photoDataUrl, fileName });
    results.push({ fileName, ok: true, url: result.url });
    console.log(`OK ${fileName} -> ${result.url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ fileName, ok: false, error: message });
    console.log(`FAIL ${fileName} -> ${message}`);
  }
}

const failed = results.filter((item) => !item.ok);
console.log(`HEIC_UPLOAD_SUMMARY success=${results.length - failed.length} failed=${failed.length}`);
if (failed.length) process.exitCode = 2;

