import sharp from 'sharp';
import { readdir } from 'node:fs/promises';

const root = '/home/ubuntu/upload';
const files = (await readdir(root)).filter((name) => /^100002786[5-9]\.heic$/i.test(name));

for (const name of files) {
  try {
    const metadata = await sharp(`${root}/${name}`).metadata();
    console.log(JSON.stringify({ name, ok: true, format: metadata.format, width: metadata.width, height: metadata.height }));
  } catch (error) {
    console.log(JSON.stringify({ name, ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}
