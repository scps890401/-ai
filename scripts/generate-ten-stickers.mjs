import { writeFileSync } from "node:fs";
import { appRouter } from "../server/routers.ts";

const ctx = { user: null, req: { protocol: "https", headers: {} }, res: { clearCookie() {} } };
const caller = appRouter.createCaller(ctx);
const referenceUrls = [
  "/manus-storage/1000027555_64d55c91.jpg",
  "/manus-storage/1000027557_f8da6ae6.jpg",
  "/manus-storage/1000027558_90ed979a.jpg",
  "/manus-storage/1000027559_2b5bc670.jpg",
  "/manus-storage/1000027691_f4580032.jpg",
  "/manus-storage/1000027865_60991973.jpg",
  "/manus-storage/1000027866_cd154718.jpg",
  "/manus-storage/1000027867_bd7a8d96.jpg",
  "/manus-storage/1000027868_db10ac35.jpg",
  "/manus-storage/1000027869_a1abfd98.jpg",
];
const phrases = [
  ["早安", "開心揮手打招呼，晨光與小星星"],
  ["謝謝", "雙手合十，溫暖微笑"],
  ["收到", "俐落點頭或敬禮，表示已收到"],
  ["加油", "握拳鼓勵，充滿活力"],
  ["等等我", "小跑步揮手，帶一點急迫感"],
  ["好累喔", "慵懶趴下，眼神疲憊但可愛"],
  ["太好了", "開心跳起來，周圍有彩色星星"],
  ["不要啦", "搖手拒絕，表情撒嬌"],
  ["晚安", "抱著枕頭打呵欠，月亮與星星"],
  ["掰掰", "揮手道別，笑容可愛"],
].map(([phrase, scene], index) => ({ position: index + 1, emotion: phrase, phrase, scene }));

console.log("Generating 10 independent cartoon stickers from 10 reference photos...");
const results = await caller.creative.generateBatch({
  photoDataUrl: referenceUrls[0],
  referenceUrls,
  style: "可愛手繪卡通",
  characterProfile: "嚴格保留 10 張照片中的角色外觀、臉型、毛色、花紋與辨識特徵；把它們視為同一個角色組，所有貼圖維持一致的卡通化比例與線條風格。",
  items: phrases,
});
writeFileSync("/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json", JSON.stringify({ referenceUrls, results }, null, 2));
for (const item of results) console.log(`${String(item.position).padStart(2, "0")} ${item.phrase} -> ${item.url || item.error}`);
const successful = results.filter((item) => item.url).length;
const failed = results.length - successful;
console.log(`GENERATED_SUMMARY success=${successful} failed=${failed}`);
if (failed > 0) process.exitCode = 2;
