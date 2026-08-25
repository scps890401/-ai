import JSZip from "jszip";
import sharp from "sharp";
import { storageGetSignedUrl } from "./storage";

const LINE_WIDTH = 370;
const LINE_HEIGHT = 320;
const LINE_MAIN_SIZE = 240;
const LINE_TAB_WIDTH = 96;
const LINE_TAB_HEIGHT = 74;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function fontSizeFor(phrase: string) {
  const characters = Array.from(phrase.trim()).length || 1;
  return Math.max(24, Math.min(44, Math.floor(320 / Math.max(characters, 4))));
}

function textOverlay(phrase: string) {
  const text = escapeXml(phrase.trim().slice(0, 20));
  if (!text) return undefined;
  const fontSize = fontSizeFor(text);
  const y = LINE_HEIGHT - 18;
  return Buffer.from(`<svg width="${LINE_WIDTH}" height="${LINE_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><style>.label{font-family:'Noto Sans CJK TC','Noto Sans TC',sans-serif;font-weight:900;paint-order:stroke;stroke:#09213a;stroke-width:9px;stroke-linejoin:round;}</style><text x="${LINE_WIDTH / 2}" y="${y}" text-anchor="middle" class="label" fill="#ffffff" font-size="${fontSize}">${text}</text></svg>`);
}

async function toFetchUrl(url: string) {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/manus-storage/")) return storageGetSignedUrl(url.replace(/^\/manus-storage\//, ""));
  throw new Error("無法讀取貼圖圖片網址");
}

async function readImage(url: string) {
  const dataUrl = url.match(/^data:[^;]+;base64,([A-Za-z0-9+/=]+)$/);
  if (dataUrl) return Buffer.from(dataUrl[1], "base64");
  const response = await fetch(await toFetchUrl(url));
  if (!response.ok) throw new Error(`無法讀取貼圖圖片（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

export type LineQualityReport = {
  valid: boolean;
  format: "PNG";
  transparent: boolean;
  dimensions: `${number}×${number}`;
  evenDimensions: boolean;
  bytes: number;
  maxBytes: number;
  text: { source: "server_overlay"; phrase: string; font: string };
  messages: string[];
};

export async function renderLineSticker(input: { imageUrl: string; phrase: string }) {
  const source = await readImage(input.imageUrl);
  const normalized = await sharp(source).rotate().ensureAlpha().resize({ width: 340, height: 252, fit: "contain", withoutEnlargement: false }).png().toBuffer();
  const meta = await sharp(normalized).metadata();
  const left = Math.floor((LINE_WIDTH - (meta.width ?? 0)) / 2);
  const top = 8;
  const output = await sharp({ create: { width: LINE_WIDTH, height: LINE_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: normalized, left, top }, ...(textOverlay(input.phrase) ? [{ input: textOverlay(input.phrase)! }] : [])])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  const outputMeta = await sharp(output).metadata();
  const transparent = outputMeta.hasAlpha === true;
  const evenDimensions = Boolean(outputMeta.width && outputMeta.height && outputMeta.width % 2 === 0 && outputMeta.height % 2 === 0);
  const messages = ["已輸出 RGB PNG 與透明背景。", "已使用伺服器端 Noto Sans CJK TC 疊繪繁體中文，避免由圖像模型直接產字。", "主體已縮放並保留至少約 8 px 的畫布安全邊距；請於上架前人工確認構圖。"];
  const report: LineQualityReport = { valid: outputMeta.format === "png" && transparent && outputMeta.width === LINE_WIDTH && outputMeta.height === LINE_HEIGHT && output.byteLength <= 1_000_000 && evenDimensions, format: "PNG", transparent, dimensions: `${outputMeta.width}×${outputMeta.height}`, evenDimensions, bytes: output.byteLength, maxBytes: 1_000_000, text: { source: "server_overlay", phrase: input.phrase, font: "Noto Sans CJK TC" }, messages };
  return { buffer: output, report };
}

export async function renderLinePack(input: { title: string; items: Array<{ position: number; phrase: string; imageUrl: string }> }) {
  if (![8, 16, 24, 32, 40].includes(input.items.length)) throw new Error("LINE 靜態貼圖套組必須有 8、16、24、32 或 40 張已完成貼圖");
  const ordered = [...input.items].sort((a, b) => a.position - b.position);
  const zip = new JSZip();
  const reports: Array<LineQualityReport & { position: number; fileName: string }> = [];
  let firstBuffer: Buffer | undefined;
  for (const item of ordered) {
    const rendered = await renderLineSticker({ imageUrl: item.imageUrl, phrase: item.phrase });
    const fileName = `sticker_${String(item.position).padStart(2, "0")}.png`;
    zip.file(fileName, rendered.buffer);
    reports.push({ ...rendered.report, position: item.position, fileName });
    firstBuffer ??= rendered.buffer;
  }
  if (!firstBuffer) throw new Error("找不到可輸出的貼圖");
  const mainImage = await sharp(firstBuffer).resize(LINE_MAIN_SIZE, LINE_MAIN_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toBuffer();
  const tabImage = await sharp(firstBuffer).resize(LINE_TAB_WIDTH, LINE_TAB_HEIGHT, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toBuffer();
  zip.file("main.png", mainImage);
  zip.file("tab.png", tabImage);
  zip.file("LINE-QUALITY-REPORT.json", JSON.stringify({ title: input.title, requiredStickerCount: input.items.length, reports, main: { dimensions: "240×240", bytes: mainImage.byteLength }, tab: { dimensions: "96×74", bytes: tabImage.byteLength }, packageLimitBytes: 60_000_000 }, null, 2));
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  if (zipBuffer.byteLength > 60_000_000) throw new Error("LINE 套組 ZIP 超過 60 MB，請縮小圖片或減少張數後重試");
  return { base64: zipBuffer.toString("base64"), fileName: `${input.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 48) || "line-sticker-pack"}.zip`, reports, zipBytes: zipBuffer.byteLength, mainImage: mainImage.toString("base64"), tabImage: tabImage.toString("base64") };
}
