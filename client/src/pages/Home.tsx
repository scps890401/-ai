/* Design philosophy: editorial workbench meets Japanese stationery. Warm paper, ink-black hierarchy, vermilion proof marks, asymmetric creator-first layout. */
import { useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { Download, ImagePlus, Layers3, MousePointer2, Play, RotateCcw, Sparkles, Wand2, X, Check, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";

type Mode = "random" | "agent" | "manual";

const asset = {
  mark: "/manus-storage/sticker-muse-mark_7f6de730.png",
  hero: "/manus-storage/sticker-muse-hero_4aa9242d.jpg",
  rabbit: "/manus-storage/rabbit-sticker_b3475c07.png",
  dog: "/manus-storage/dog-sticker_6c3a87c4.png",
  mouse: "/manus-storage/mouse-sticker_ac116650.png",
};

const modes = [
  { id: "random" as Mode, no: "01", title: "隨機生成", caption: "丟幾張圖，讓靈感先跑。", icon: Sparkles },
  { id: "agent" as Mode, no: "02", title: "代理生成", caption: "告訴角色一句話，交給我。", icon: Wand2 },
  { id: "manual" as Mode, no: "03", title: "手動生成", caption: "自己排版，每個細節都算數。", icon: MousePointer2 },
];

type AssetCheck = { width: number; height: number; transparent: boolean; status: "ready" | "check" | "needs" };

const LINE_WIDTH = 370;
const LINE_HEIGHT = 320;

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

function toLinePng(src: string, removeLightBackground = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = LINE_WIDTH;
      canvas.height = LINE_HEIGHT;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.clearRect(0, 0, LINE_WIDTH, LINE_HEIGHT);
      const scale = Math.min((LINE_WIDTH - 36) / image.naturalWidth, (LINE_HEIGHT - 36) / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.drawImage(image, (LINE_WIDTH - drawWidth) / 2, (LINE_HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
      if (removeLightBackground) {
        const pixels = ctx.getImageData(0, 0, LINE_WIDTH, LINE_HEIGHT);
        for (let i = 0; i < pixels.data.length; i += 4) {
          if (pixels.data[i] > 232 && pixels.data[i + 1] > 232 && pixels.data[i + 2] > 232) pixels.data[i + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
      }
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
    };
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}

const starterStickers = [
  { src: asset.rabbit, label: "兔子／睡著了", color: "sage" },
  { src: asset.dog, label: "狗狗／真棒", color: "red" },
  { src: asset.mouse, label: "老鼠／好餓", color: "gold" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("agent");
  const [prompt, setPrompt] = useState("這隻狗說：真棒");
  const [uploaded, setUploaded] = useState<string[]>([asset.dog]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generated, setGenerated] = useState(starterStickers);
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheck>>({ [asset.dog]: { width: 1024, height: 1024, transparent: true, status: "needs" } });
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);

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
    toast.success(`已放入 ${next.length} 張素材`, { description: "現在可以開始讓角色開口了。" });
  }

  async function processTransparency() {
    if (!uploaded.length) return;
    setIsProcessing(true);
    try {
      const processed = await Promise.all(uploaded.map(async (src) => URL.createObjectURL(await toLinePng(src, true))));
      setUploaded(processed);
      processed.forEach(inspectAsset);
      toast.success("已整理成 LINE 貼圖畫布", { description: "透明背景與 370 × 320 px 畫布已套用。" });
    } catch {
      toast.error("透明背景處理失敗", { description: "請換一張 PNG 或 JPG 圖片再試一次。" });
    } finally { setIsProcessing(false); }
  }

  async function exportZip() {
    if (!generated.length) return;
    const zip = new JSZip();
    try {
      await Promise.all(generated.map(async (sticker, index) => {
        const blob = await toLinePng(sticker.src, true);
        zip.file(`${String(index + 1).padStart(2, "0")}_sticker.png`, blob);
      }));
      zip.file("README.txt", "隨心所遇貼圖製作\n已套用 LINE 貼圖建議畫布：370 × 320 px\n透明背景 PNG\n");
      const file = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "隨心所遇貼圖組.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`已打包 ${generated.length} 張貼圖`, { description: "ZIP 檔案已開始下載。" });
    } catch {
      toast.error("ZIP 匯出失敗", { description: "請確認貼圖素材仍可讀取。" });
    }
  }

  function createSticker() {
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      const nextLabel = mode === "random" ? "兔子／突然起舞" : mode === "manual" ? `老鼠／${prompt || "好餓"}` : "狗狗／真棒";
      setGenerated((current) => [{ src: mode === "manual" ? asset.mouse : mode === "random" ? asset.rabbit : asset.dog, label: nextLabel, color: mode === "random" ? "gold" : mode === "manual" ? "sage" : "red" }, ...current].slice(0, 4));
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
          <div className="hero-copy"><div className="eyebrow"><span className="red-line" /> STICKER EDITOR / 001</div><h1>讓角色，<em>開口。</em></h1><p>先選一種做法，再把日常裡的那句話，變成可以分享的 LINE 貼圖。</p><div className="hero-meta"><span>↳ 三種製作方式</span><span>↳ 即時預覽</span><span>↳ 可直接匯出</span></div></div>
          <div className="hero-image"><img src={asset.hero} alt="兔子、狗狗與老鼠的紙張拼貼" /><div className="hero-stamp">今日<br /><strong>有靈感</strong></div></div>
        </section>

        <div className="content-grid">
          <section className="editor-panel">
            <div className="section-heading"><div><div className="section-index">01 / CHOOSE YOUR METHOD</div><h2>你想怎麼做？</h2></div><span className="paper-tag">WORKFLOW</span></div>
            <div className="mode-tabs">{modes.map(({ id, no, title, caption, icon: Icon }) => <button key={id} onClick={() => switchMode(id)} className={`mode-tab ${mode === id ? "selected" : ""}`}><span className="mode-no">{no}</span><Icon size={17} strokeWidth={1.8} /><span className="mode-title">{title}</span><small>{caption}</small>{mode === id && <Check className="mode-check" size={15} />}</button>)}</div>

            <div className="section-heading compact"><div><div className="section-index">02 / ADD YOUR MATERIAL</div><h2>{activeMode.title}</h2></div><span className="material-count">{uploaded.length} 張素材</span></div>
            <div className="material-zone">
              <div className="upload-row">
                <div className="upload-copy"><div className="upload-icon"><ImagePlus size={19} /></div><div><b>把角色放進來</b><p>支援 JPG、PNG，可一次放入 4 張</p></div></div>
                <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg" multiple onChange={(event) => onFiles(event.target.files)} />
                <button className="outline-button" onClick={() => fileRef.current?.click()}>選擇圖片 <ChevronRight size={14} /></button>
              </div>
              <div className="thumb-row">{uploaded.map((src, index) => <div className="thumb" key={`${src}-${index}`}><img src={src} alt={`已上傳素材 ${index + 1}`} /><button aria-label="移除素材" onClick={() => setUploaded((current) => current.filter((_, item) => item !== index))}><X size={12} /></button></div>)}<button className="add-thumb" onClick={() => fileRef.current?.click()}><span>＋</span><small>再放一張</small></button></div>
              <div className="asset-quality"><div className="quality-title"><b>LINE 規格檢查</b><span>主圖建議 370 × 320 px</span></div><div className="quality-items">{uploaded.slice(0, 3).map((src, index) => { const result = assetChecks[src]; return <div className="quality-item" key={src}><span className={`quality-icon ${result?.status === "ready" ? "ok" : result?.status === "needs" ? "warn" : "pending"}`}>{result?.status === "ready" ? "✓" : result?.status === "needs" ? "!" : "·"}</span><span>素材 {index + 1}</span><small>{result?.status === "check" ? "檢查中" : result?.width ? `${result.width} × ${result.height} · ${result.transparent ? "透明" : "需去背"}` : "等待檢查"}</small></div> })}</div><button className="transparent-button" onClick={processTransparency} disabled={isProcessing || !uploaded.length}>{isProcessing ? "處理透明背景中…" : "整理成透明 PNG"}<ChevronRight size={14} /></button></div>
            </div>

            <div className="prompt-block"><label htmlFor="prompt"><span className="section-index">03 / GIVE IT A VOICE</span><span>{mode === "manual" ? "對話框文字" : "你想讓角色做什麼？"}</span></label><div className="prompt-input-wrap"><textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="輸入一句話，或描述一個動作…" /><span className="char-count">{prompt.length} / 80</span></div><div className="prompt-hint"><Info size={13} /> {mode === "random" ? "不設限也可以，讓系統替你抽一個驚喜。" : mode === "manual" ? "文字會直接放入貼圖對話框，生成後仍可修改。" : "越像平常說話的句子，角色就越有個性。"}</div></div>
            <button className="generate-button" onClick={createSticker} disabled={isGenerating || uploaded.length === 0}><span className="button-seal">{isGenerating ? <RotateCcw className="spin" size={20} /> : <Play size={17} fill="currentColor" />}</span><span>{isGenerating ? "正在排版你的靈感…" : "生成這張貼圖"}</span><ChevronRight size={18} /></button>
          </section>

          <aside className="preview-panel"><div className="preview-top"><div><div className="section-index">04 / YOUR STICKER SHELF</div><h2>剛剛做好的</h2></div><span className="preview-count">{generated.length} / 8</span></div><div className="shelf-rule"><span /> 最新在前</div><div className="sticker-shelf">{generated.map((sticker, index) => <article className={`sticker-card ${sticker.color}`} key={`${sticker.label}-${index}`}><div className="sticker-art"><img src={sticker.src} alt={sticker.label} /><div className="sticker-caption">{sticker.label.split("／")[1]}</div></div><div className="sticker-footer"><span><i /> {index === 0 ? "剛剛" : "草稿"}</span><button onClick={() => downloadSticker(sticker.label)} aria-label={`匯出${sticker.label}`}><Download size={14} /></button></div></article>)}</div><div className="export-box"><div><b>一組貼圖，正在成形</b><p>已整理為透明 PNG，可打包下載。</p></div><button onClick={exportZip} disabled={!generated.length}><Download size={13} /> 下載 ZIP <ChevronRight size={14} /></button></div></aside>
        </div>
      </main>
    </div>
  );
}
