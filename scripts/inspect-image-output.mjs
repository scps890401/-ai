import { generateImage } from "../server/_core/imageGeneration.ts";
const result = await generateImage({
  prompt: "Remove the background from the supplied character photo and preserve the character exactly.",
  originalImages: [{ url: "/manus-storage/sticker-tycoon-hero-reference_07193460.png", mimeType: "image/png" }],
  quality: "high",
});
console.log(JSON.stringify({ url: result.url, mimeType: result.mimeType, hasAlpha: result.hasAlpha, b64Length: result.b64Json?.length }, null, 2));
