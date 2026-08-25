import { writeFile } from "node:fs/promises";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
  body: JSON.stringify({
    model: "gemini-3.1-flash-image",
    input: "Create one cheerful orange tabby cat waving. Simple cute sticker style, plain light background, no text.",
    response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "1:1", image_size: "512" },
  }),
});
const payload = await response.json();
await writeFile("/home/ubuntu/sticker-tycoon-replica/gemini-image-connection-result.json", JSON.stringify({ ok: response.ok, status: response.status, hasImage: Boolean(payload?.output_image?.data), errorCode: payload?.error?.code ?? null, errorMessage: payload?.error?.message ?? null }, null, 2));
if (!response.ok || !payload?.output_image?.data) throw new Error(`Gemini image generation did not return image data (${response.status})`);
console.log(JSON.stringify({ ok: true, status: response.status, hasImage: true }));
