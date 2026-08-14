/* Design philosophy: editorial workbench meets Japanese stationery. Warm paper, ink-black hierarchy, vermilion proof marks, asymmetric creator-first layout. */
import { useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Download, ImagePlus, Layers3, MousePointer2, Play, RotateCcw, Sparkles, Wand2, X, Check, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { addRandomSticker, randomGenerationError, replaceStickerAt } from "@/lib/randomStickerUi";
import type { RandomStickerCard } from "@/lib/randomStickerUi";
import { generateWithRetry, regenerateSingleSticker } from "@/lib/retryRandomSticker";
import { pickRandomStickerConcept } from "@/lib/stickerLanguage";

type Mode = "random" | "agent" | "manual";

const asset = {
  mark: "/manus-storage/logo_eb1eca16.jpg",
  hero: "/manus-storage/sticker-muse-hero_4aa9242d.jpg",
  rabbit: "/manus-storage/rabbit-sticker_b3475c07.png",
  dog: "/manus-storage/dog-sticker_6c3a87c4.png",
  mouse: "/manus-storage/mouse-sticker_ac116650.png",
};

const modes = [
  { id: "random" as Mode, no: "01", title: "隨機生成", caption: "讀懂角色，再隨機安排動作。", icon: Sparkles },
  { id: "agent" as Mode, no: "02", title: "代理生成", caption: "告訴角色一句話，交給我。", icon: Wand2 },
  { id: "manual" as Mode, no: "03", title: "手動生成", caption: "自己排版，每個細節都算數。", icon: MousePointer2 },
];

type AssetCheck = { width: number; height: number; transparent: boolean; status: "ready" | "check" | "needs" };

const LINE_WIDTH = 370;
const LINE_HEIGHT = 320;
const LINE_PACK_SIZES = [8, 16, 24, 32, 40] as const;

const LINE_OUTPUTS = [
  { key: "main", label: "主圖", size: "240 × 240", width: 240, height: 240, file: "main-image.png" },
  { key: "sticker", label: "貼圖圖片", size: "370 × 320", width: 370, height: 320, file: "sticker-01.png" },
  { key: "chat", label: "聊天縮圖", size: "96 × 74", width: 96, height: 74, file: "chat-thumbnail.png" },
  { key: "label", label: "標籤圖", size: "96 × 74", width: 96, height: 74, file: "sticker-label.png" },
] as const;

function inspectImage(src: string, onDone: (result: AssetCheck) => void) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(image.naturalWidth || LINE_WIDTH, 370);
    canvas.height = Math.min(image.naturalHeight || LINE_HEIGHT, 320);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let transparent = false;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 250) { transparent = true; break; }
      }
    }
    const width = image.naturalWidth || LINE_WIDTH;
    const height = image.naturalHeight || LINE_HEIGHT;
    onDone({ width, height, transparent, status: width <= LINE_WIDTH && height <= LINE_HEIGHT && transparent ? "ready" : "needs" });
  };
  image.onerror = () => onDone({ width: 0, height: 0, transparent: false, status: "check" });
  image.src = src;
}

async function aiForeground(src: string, onProgress?: (progress: number) => void): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  const response = await fetch(src);
  const sourceBlob = await response.blob();
  return removeBackground(sourceBlob, {
    model: "isnet_quint8",
    device: "cpu",
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => onProgress?.(total ? Math.round((current / total) * 100) : 0),
  });
}

async function renderLineAsset(src: string, width = LINE_WIDTH, height = LINE_HEIGHT, useAiBackgroundRemoval = true, onProgress?: (progress: number) => void): Promise<Blob> {
  const foregroundBlob = useAiBackgroundRemoval ? await aiForeground(src, onProgress) : await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min((width - 18) / image.naturalWidth, (height - 18) / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
      URL.revokeObjectURL(image.src);
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = URL.createObjectURL(foregroundBlob);
  });
}

const toLinePng = (src: string, useAiBackgroundRemoval = true, onProgress?: (progress: number) => void) => renderLineAsset(src, LINE_WIDTH, LINE_HEIGHT, useAiBackgroundRemoval, onProgress);

async function imageInputFromSource(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Unable to read source image");
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image encoding failed"));
    reader.onerror = () => reject(reader.error ?? new Error("Image encoding failed"));
    reader.readAsDataURL(blob);
  });
  const comma = dataUrl.indexOf(",");
  return { b64Json: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, mimeType: blob.type || "image/png" };
}

const starterStickers: RandomStickerCard[] = [
  { src: asset.rabbit, label: "兔子／睡著了", color: "sage" },
  { src: asset.dog, label: "狗狗／真棒", color: "red" },
  { src: asset.mouse, label: "老鼠／好餓", color: "gold" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("agent");
  const [prompt, setPrompt] = useState("這隻狗說：真棒");
  const [uploaded, setUploaded] = useState<string[]>([asset.dog]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null);
  const [recentConceptKeys, setRecentConceptKeys] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [specReady, setSpecReady] = useState(false);
  const [packSize, setPackSize] = useState<number>(8);
  const [generated, setGenerated] = useState<RandomStickerCard[]>(starterStickers);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [chatStickerIndex, setChatStickerIndex] = useState(0);
  const [chatTone, setChatTone] = useState<"light" | "soft" | "dark">("light");
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheck>>({ [asset.dog]: { width: 1024, height: 1024, transparent: true, status: "needs" } });
  const randomGenerate = trpc.stickers.randomGenerate.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);
  const completionPercent = Math.min(100, Math.round((generated.length / packSize) * 100));
  const remainingStickers = Math.max(0, packSize - generated.length);

  function switchMode(next: Mode) {
    setMode(next);
    if (next === "random") setPrompt("讓這幾個角色做一件出乎意料的事");
    if (next === "agent") setPrompt("這隻狗說：真棒");
    if (next === "manual") setPrompt("好餓");
  }

  function inspectAsset(src: string) {
    setAssetChecks((current) => ({ ...current, [src]: { width: 0, height: 0, transparent: false, status: "check" } }));
    inspectImage(src, (result) => setAssetChecks((current) => ({ ...current, [src]: result })));
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).slice(0, 4).map((file) => URL.createObjectURL(file));
    setUploaded(next);
    next.forEach(inspectAsset);
    toast.success(`已放入 ${next.length} 張素材`, { description: "現在可以開始製作屬於你的貼圖了。" });
  }

  async function processTransparency() {
    if (!uploaded.length) return;
    setIsProcessing(true);
    try {
      setProcessingProgress(4);
      const processed = await Promise.all(uploaded.map(async (src, index) => URL.createObjectURL(await toLinePng(src, true, (progress) => setProcessingProgress(Math.min(96, Math.round(((index + progress / 100) / uploaded.length) * 96)))))));
      setUploaded(processed);
      processed.forEach(inspectAsset);
      setProcessingProgress(100);
      toast.success("AI 去背完成", { description: "已保留角色輪廓，並套用透明背景與 370 × 320 px 畫布。" });
    } catch {
      toast.error("透明背景處理失敗", { description: "請換一張 PNG 或 JPG 圖片再試一次。" });
    } finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  async function prepareLineSet() {
    if (!generated.length || isProcessing) return;
    setIsProcessing(true);
    setProcessingProgress(2);
    try {
      const source = generated[0].src;
      await Promise.all(LINE_OUTPUTS.filter((item) => item.key !== "sticker").map((item, index) => renderLineAsset(source, item.width, item.height, true, (progress) => setProcessingProgress(Math.min(96, Math.round(((index + progress / 100) / 3) * 96))))));
      setSpecReady(true);
      setProcessingProgress(100);
      toast.success("LINE 四類尺寸已整理", { description: "主圖、貼圖、聊天縮圖與標籤圖都已準備好。" });
    } catch { toast.error("尺寸整理失敗", { description: "請確認貼圖素材仍可讀取。" }); }
    finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  async function exportZip() {
    if (generated.length !== packSize) {
      toast.error("貼圖組數量尚未符合 LINE 規定", { description: generated.length < packSize ? `目前有 ${generated.length} 張，還需要 ${packSize - generated.length} 張。` : `目前有 ${generated.length} 張，請移除 ${generated.length - packSize} 張。` });
      return;
    }
    if (!generated.length) return;
    const zip = new JSZip();
    try {
      setIsProcessing(true);
      setProcessingProgress(3);
      await Promise.all(generated.map(async (sticker, index) => {
        const blob = await renderLineAsset(sticker.src, LINE_WIDTH, LINE_HEIGHT, true, (progress) => setProcessingProgress(Math.min(88, Math.round(((index + progress / 100) / generated.length) * 88))));
        zip.file(`${String(index + 1).padStart(2, "0")}_sticker.png`, blob);
      }));
      const source = generated[0].src;
      const extras = await Promise.all(LINE_OUTPUTS.filter((item) => item.key !== "sticker").map((item) => renderLineAsset(source, item.width, item.height, true)));
      extras.forEach((blob, index) => zip.file(LINE_OUTPUTS.filter((item) => item.key !== "sticker")[index].file, blob));
      zip.file("README.txt", "隨心所遇貼圖製作\nLINE 靜態貼圖輸出規格\n主圖：240 × 240 px\n貼圖圖片：370 × 320 px\n聊天縮圖：96 × 74 px\n標籤圖：96 × 74 px\n全部為透明背景 PNG，ZIP 已自動縮放與置中。\n");
      const file = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "隨心所遇貼圖組.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      setProcessingProgress(100);
      toast.success(`已打包 ${generated.length} 張貼圖`, { description: "AI 去背與 ZIP 下載已完成。" });
    } catch {
      toast.error("ZIP 匯出失敗", { description: "請確認貼圖素材仍可讀取，或稍後再試。" });
    } finally { window.setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 400); }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    setGenerated((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedIndex(null);
    toast.success("貼圖順序已更新", { description: "ZIP 匯出會依照目前編號排列。" });
  }

  async function generateRandomWithRetry(source: string, action: string) {
    const originalImage = await imageInputFromSource(source);
    return generateWithRetry((input) => randomGenerate.mutateAsync(input), { prompt: action, originalImage }, 3, (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
  }

  async function retrySticker(index: number) {
    const sticker = generated[index];
    if (!sticker?.source || !sticker.action) {
      toast.info("這張貼圖沒有可重試的隨機來源", { description: "請重新使用隨機生成建立一張可重試貼圖。" });
      return;
    }
    setRetryingIndex(index);
    try {
      const refreshed = await regenerateSingleSticker(sticker, imageInputFromSource, (input) => randomGenerate.mutateAsync(input), (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
      setGenerated((current) => replaceStickerAt(current, index, { url: refreshed.src }));
      toast.success(`第 ${String(index + 1).padStart(2, "0")} 張已重新生成`, { description: "原本的角色照片與動作需求已保留。" });
    } catch (error) {
      console.error("Single sticker retry failed", error);
      const failure = randomGenerationError();
      toast.error(failure.title, { description: "這張貼圖重試三次仍未完成，原本結果已保留。" });
    } finally {
      setRetryingIndex(null);
    }
  }

  async function createSticker() {
    if (mode === "random" && !uploaded.length) {
      toast.error("請先放入角色照片", { description: "隨機生成會以你提供的照片作為角色來源。" });
      return;
    }

    if (mode === "random") {
      const sourceIndex = Math.floor(Math.random() * uploaded.length);
      const source = uploaded[sourceIndex];
      const sourceName = source === asset.rabbit ? "兔子" : source === asset.dog ? "狗狗" : source === asset.mouse ? "老鼠" : `素材 ${String(sourceIndex + 1).padStart(2, "0")}`;
      const concept = pickRandomStickerConcept(recentConceptKeys);
      setRecentConceptKeys((current) => [concept.scenarioKey, ...current].slice(0, 8));
      setIsGenerating(true);
      try {
        const result = await generateRandomWithRetry(source, concept.action);
        setGenerated((current) => addRandomSticker(current, { url: result.url, label: `${sourceName}／${concept.text}`, source, action: concept.action }, packSize));
        toast.success("AI 已根據角色照片完成隨機貼圖", { description: `保留「${sourceName}」的外觀，生成「${concept.scenario}」情境：${concept.text}。` });
      } catch (error) {
        console.error("Random sticker generation failed", error);
        const failure = randomGenerationError();
        toast.error(failure.title, { description: "已自動重試 3 次仍未完成，請稍後再按一次生成。" });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      const source = mode === "manual" ? asset.mouse : asset.dog;
      const nextLabel = mode === "manual" ? `老鼠／${prompt || "好餓"}` : "狗狗／真棒";
      setGenerated((current) => [{ src: source, label: nextLabel, color: mode === "manual" ? "sage" : "red" }, ...current].slice(0, packSize));
      toast.success("貼圖草稿完成", { description: "右側已經放上最新的一張。" });
    }, 900);
  }

  function downloadSticker(label: string) {
    toast.success(`「${label}」已加入匯出清單`, { description: "LINE 貼圖尺寸與透明背景會在匯出時整理。" });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={asset.mark} alt="隨心所遇標誌" className="brand-mark" />
          <div><div className="brand-name">隨心所遇</div><div className="brand-sub">貼圖製作 STUDIO</div></div>
        </div>
        <div className="side-rule" />
        <div className="side-kicker">CREATOR'S DESK <span>✳</span></div>
        <nav className="side-nav" aria-label="主要功能">
          <button className="nav-item active"><Layers3 size={16} />製作工作台 <span>現在</span></button>
          <button className="nav-item" onClick={() => toast.info("貼圖組功能正在整理中")}>▦ 我的貼圖組 <span>0</span></button>
          <button className="nav-item" onClick={() => toast.info("尺寸檢查會在匯出時開啟")}>⌁ LINE 尺寸檢查</button>
        </nav>
        <div className="side-bottom">
          <div className="mini-note"><span className="note-pin">●</span><div><b>小提示</b><p>一句話就能讓角色有自己的語氣。</p></div></div>
          <div className="version">隨心所遇貼圖製作 <span>v0.8</span></div>
        </div>
      </aside>

      <main className="workbench">
        <header className="topbar"><div className="breadcrumb"><span>工作台</span><ChevronRight size={13} /><b>新貼圖草稿</b></div><div className="top-actions"><span className="status-dot" /> 草稿自動儲存 <button className="avatar">S</button></div></header>
        <section className="hero-strip">
          <div className="hero-copy"><div className="eyebrow"><span className="red-line" /> STICKER EDITOR / 001</div><h1>製作屬於你的<em>貼圖。</em></h1><p>從一張照片開始，把角色、日常對話與你的靈感，做成可以分享的 LINE 貼圖。</p><div className="hero-meta"><span>↳ 三種製作方式</span><span>↳ 即時預覽</span><span>↳ 可直接匯出</span></div></div>
          <div className="hero-image"><img src={asset.hero} alt="兔子、狗狗與老鼠的紙張拼貼" /><div className="hero-stamp">今日<br /><strong>有靈感</strong></div></div>
        </section>

        <div className="content-grid">
          <section className="editor-panel">
            <div className="section-heading"><div><div className="section-index">01 / CHOOSE YOUR METHOD</div><h2>你想怎麼做？</h2></div><span className="paper-tag">WORKFLOW</span></div>
            <div className="mode-tabs">{modes.map(({ id, no, title, caption, icon: Icon }) => <button key={id} onClick={() => switchMode(id)} className={`mode-tab ${mode === id ? "selected" : ""}`}><span className="mode-no">{no}</span><Icon size={17} strokeWidth={1.8} /><span className="mode-title">{title}</span><small>{caption}</small>{mode === id && <Check className="mode-check" size={15} />}</button>)}</div>

            <div className="section-heading compact"><div><div className="section-index">02 / ADD YOUR MATERIAL</div><h2>{activeMode.title}</h2><small className="material-mode-note">{mode === "random" ? "每張照片都會成為隨機生成的角色來源" : mode === "agent" ? "上傳角色照片，再用一句話交代需求" : "上傳角色照片，手動安排對話框"}</small></div><span className="material-count">{uploaded.length} 張素材</span></div>
            <div className="material-zone">
              <div className="upload-row">
                <div className="upload-copy"><div className="upload-icon"><ImagePlus size={19} /></div><div><b>把角色放進來</b><p>支援 JPG、PNG，可一次放入 4 張</p></div></div>
                <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg" multiple onChange={(event) => onFiles(event.target.files)} />
                <button className="outline-button" onClick={() => fileRef.current?.click()}>選擇圖片 <ChevronRight size={14} /></button>
              </div>
              <div className="thumb-row">{uploaded.map((src, index) => <div className="thumb" key={`${src}-${index}`}><img src={src} alt={`已上傳素材 ${index + 1}`} /><button aria-label="移除素材" onClick={() => setUploaded((current) => current.filter((_, item) => item !== index))}><X size={12} /></button></div>)}<button className="add-thumb" onClick={() => fileRef.current?.click()}><span>＋</span><small>再放一張</small></button></div>
              <div className="asset-quality"><div className="quality-title"><b>LINE 規格檢查</b><span>主圖建議 370 × 320 px · 首次 AI 處理會下載模型</span></div><div className="quality-items">{uploaded.slice(0, 3).map((src, index) => { const result = assetChecks[src]; return <div className="quality-item" key={src}><span className={`quality-icon ${result?.status === "ready" ? "ok" : result?.status === "needs" ? "warn" : "pending"}`}>{result?.status === "ready" ? "✓" : result?.status === "needs" ? "!" : "·"}</span><span>素材 {index + 1}</span><small>{result?.status === "check" ? "檢查中" : result?.width ? `${result.width} × ${result.height} · ${result.transparent ? "透明" : "需去背"}` : "等待檢查"}</small></div> })}</div><button className="transparent-button" onClick={processTransparency} disabled={isProcessing || !uploaded.length}>{isProcessing ? `AI 語意去背中 ${processingProgress}%` : "AI 語意去背／透明 PNG"}<ChevronRight size={14} /></button></div>
            </div>

            <div className="prompt-block"><label htmlFor="prompt"><span className="section-index">03 / MAKE YOUR STICKER</span><span>{mode === "manual" ? "對話框文字" : "你想讓角色做什麼？"}</span></label><div className="prompt-input-wrap"><textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="輸入一句話，或描述一個動作…" /><span className="char-count">{prompt.length} / 80</span></div><div className="prompt-hint"><Info size={13} /> {mode === "random" ? "系統會逐張讀取你提供的照片，保留角色外觀，再隨機安排動作或情緒。" : mode === "manual" ? "文字會直接放入貼圖對話框，生成後仍可修改。" : "越像平常說話的句子，角色就越有個性。"}</div></div>
            <button className="generate-button" onClick={createSticker} disabled={isGenerating || uploaded.length === 0}><span className="button-seal">{isGenerating ? <RotateCcw className="spin" size={20} /> : <Play size={17} fill="currentColor" />}</span><span>{isGenerating ? mode === "random" ? "AI 正在讀取角色照片…" : "正在排版你的靈感…" : "生成這張貼圖"}</span><ChevronRight size={18} /></button>
          </section>

          <aside className="preview-panel"><div className="preview-top"><div><div className="section-index">04 / YOUR STICKER SHELF</div><h2>剛剛做好的</h2></div><span className={`preview-count ${generated.length === packSize ? "valid" : "invalid"}`}>{generated.length} / {packSize}</span><button className="chat-preview-button" onClick={() => setChatPreviewOpen((current) => !current)}>{chatPreviewOpen ? "關閉聊天室" : "聊天室預覽"}<ChevronRight size={13} /></button></div><div className="pack-size-panel"><div><b>選擇貼圖組數</b><small>LINE 靜態貼圖可選 8、16、24、32 或 40 張</small></div><div className="pack-size-options">{LINE_PACK_SIZES.map((size) => <button key={size} className={packSize === size ? "selected" : ""} onClick={() => setPackSize(size)}>{size}</button>)}</div><div className={`pack-status ${generated.length === packSize ? "ready" : "needs"}`}>{generated.length === packSize ? "✓ 數量符合，可匯出" : generated.length < packSize ? `還需要 ${remainingStickers} 張貼圖` : `請移除 ${generated.length - packSize} 張貼圖`}</div><div className="completion-meter" role="progressbar" aria-label="貼圖組完成度" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}><div className="completion-meter-top"><span>貼圖組完成度</span><strong>{completionPercent}%</strong></div><div className="completion-track"><div className={`completion-fill ${completionPercent === 100 ? "complete" : ""}`} style={{ width: `${completionPercent}%` }} /></div><div className="completion-caption"><span>已完成 {generated.length} / {packSize} 張</span><span>{remainingStickers ? `還差 ${remainingStickers} 張` : "可以開始匯出"}</span></div></div></div><div className="line-spec-panel"><div className="line-spec-header"><div><b>LINE 輸出規格</b><small>四種尺寸會自動縮放、置中與保留透明背景</small></div><span className={`spec-badge ${specReady ? "ready" : "pending"}`}>{specReady ? "已整理" : "待整理"}</span></div><div className="line-spec-grid">{LINE_OUTPUTS.map((item) => <div className="line-spec-item" key={item.key}><span className={`spec-check ${specReady ? "done" : ""}`}>{specReady ? "✓" : "·"}</span><div><b>{item.label}</b><small>{item.size} px</small></div></div>)}</div><button className="auto-scale-button" onClick={prepareLineSet} disabled={isProcessing || !generated.length}>{isProcessing ? `自動整理中 ${processingProgress}%` : "自動縮放全部輸出"}<ChevronRight size={13} /></button></div><div className="shelf-rule"><span /> 拖曳卡片調整順序</div><div className="sticker-shelf">{generated.map((sticker, index) => <article className={`sticker-card ${sticker.color} ${draggedIndex === index ? "dragging" : ""}`} key={`${sticker.label}-${index}`} draggable onDragStart={() => handleDragStart(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(index)} onDragEnd={() => setDraggedIndex(null)} aria-label={`第 ${index + 1} 張貼圖：${sticker.label}`}><div className="sticker-art"><span className="sticker-order">{String(index + 1).padStart(2, "0")}</span><img src={sticker.src} alt={sticker.label} /><div className="sticker-caption">{sticker.label.split("／")[1]}</div></div><div className="sticker-footer"><span><i /> {index === 0 ? "剛剛" : "草稿"}</span><div className="sticker-actions">{sticker.source && sticker.action && <button className="retry-button" onClick={(event) => { event.stopPropagation(); void retrySticker(index); }} disabled={retryingIndex === index || isGenerating} aria-label={`重新生成第 ${index + 1} 張貼圖`}>{retryingIndex === index ? <RotateCcw className="spin" size={12} /> : <RotateCcw size={12} />}<span>{retryingIndex === index ? "重試中" : "重來"}</span></button>}<button onClick={() => downloadSticker(sticker.label)} aria-label={`匯出${sticker.label}`}><Download size={14} /></button></div></div></article>)}</div><div className="export-box"><div><b>{generated.length === packSize ? "貼圖組數量已就位" : "貼圖組還在成形"}</b><p>{isProcessing ? `AI 去背、四類尺寸與打包中 ${processingProgress}%` : generated.length === packSize ? `共 ${packSize} 張，符合 LINE 規定。` : `完成 ${packSize} 張後才可下載 ZIP。`}</p></div><button onClick={exportZip} disabled={generated.length !== packSize || isProcessing}><Download size={13} /> 下載 ZIP <ChevronRight size={14} /></button></div></aside>
        </div>
        {chatPreviewOpen && <section className={`chat-preview ${chatTone}`} aria-label="LINE 聊天室貼圖預覽"><div className="chat-preview-heading"><div><div className="section-index">05 / CHATROOM PREVIEW</div><h2>放進對話裡看看</h2><p>切換貼圖，確認在實際聊天室中的大小與背景對比。</p></div><button className="close-chat-preview" onClick={() => setChatPreviewOpen(false)}>關閉 <X size={14} /></button></div><div className="chat-preview-layout"><div className="chat-window"><div className="chat-window-top"><span className="chat-back">‹</span><div className="contact-avatar">M</div><div><b>毛毛的日常</b><small>線上 · 今天有靈感</small></div><span className="chat-more">···</span></div><div className="chat-date">今天 10:24</div><div className="chat-messages"><div className="chat-bubble other">早安！今天想做什麼？</div><div className="chat-bubble mine">先做一張貼圖看看。</div><div className="chat-sticker-message"><img src={generated[chatStickerIndex]?.src || asset.dog} alt="聊天室中的貼圖" /><span>已送出 · 10:25</span></div></div><div className="chat-composer"><span>＋</span><div>輸入訊息…</div><span>☺</span></div></div><div className="chat-controls"><div className="chat-control-title"><b>預覽控制</b><span>目前第 {String(Math.min(chatStickerIndex + 1, generated.length)).padStart(2, "0")} 張</span></div><div className="chat-sticker-picker">{generated.map((sticker, index) => <button key={`${sticker.label}-chat-${index}`} className={chatStickerIndex === index ? "selected" : ""} onClick={() => setChatStickerIndex(index)}><img src={sticker.src} alt={`選擇第 ${index + 1} 張貼圖`} /><small>{String(index + 1).padStart(2, "0")}</small></button>)}</div><div className="chat-tone-label">聊天室背景對比</div><div className="chat-tone-options">{(["light", "soft", "dark"] as const).map((tone) => <button key={tone} className={chatTone === tone ? "selected" : ""} onClick={() => setChatTone(tone)}>{tone === "light" ? "淺色" : tone === "soft" ? "柔和" : "深色"}</button>)}</div><div className="chat-preview-note"><Info size={13} /> 貼圖會以聊天中的自然大小顯示，方便檢查淺色角色的可讀性。</div></div></div></section>}
      </main>
    </div>
  );
}
