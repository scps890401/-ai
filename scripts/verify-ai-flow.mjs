import { appRouter } from "../server/routers.ts";

const ctx = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie() {} },
};

const caller = appRouter.createCaller(ctx);
const source = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";

console.log("[1/3] AI semantic cutout");
const cutout = await caller.creative.removeBackground({ photoDataUrl: source });
if (!cutout.url || cutout.mode !== "cutout") throw new Error("cutout did not return a stored image");
console.log("cutout", cutout.url);

console.log("[2/3] Generate again from the cutout result");
const generated = await caller.creative.generate({ photoDataUrl: cutout.url, style: "可愛手繪", emotion: "開心", prompt: "讓角色揮手說早安" });
if (!generated.url || generated.mode !== "generate") throw new Error("generate did not return a stored image");
console.log("generated", generated.url);

console.log("[3/3] Multi-round refinement");
const refined = await caller.creative.refine({
  currentImageUrl: { url: generated.url, mimeType: "image/png" },
  instruction: "文字改成早安，表情更可愛",
  history: [{ role: "user", content: "請做一張可愛貼圖" }, { role: "assistant", content: "已完成初稿" }],
});
if (!refined.url || refined.mode !== "refine") throw new Error("refine did not return a stored image");
console.log("refined", refined.url);
console.log("AI_FLOW_OK");
