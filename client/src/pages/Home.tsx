import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Download, Image as ImageIcon, Menu, Palette, Play, RefreshCw, Share2, Sparkles, Upload, Wand2, X, Zap } from "lucide-react";

/* Style reminder: self-contained dark ocean creator studio, electric cyan/violet accents, asymmetric hero, glass panels, and direct in-page creation. */

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const heroUrl = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";

const styles = [
  { id: "cute", label: "可愛手繪", icon: "✏️", tone: "#ffcf70" },
  { id: "pop", label: "繽紛流行", icon: "🌈", tone: "#65d9ff" },
  { id: "comic", label: "漫畫表情", icon: "💥", tone: "#ff89d1" },
  { id: "minimal", label: "清爽極簡", icon: "◌", tone: "#9bf4c5" },
];
const emotions = ["開心", "收到", "加油", "謝謝", "驚訝", "晚安"];
const stickerWords = ["太棒了！", "收到！", "一起加油", "謝謝你", "真的假的", "晚安好夢"];

function scrollToId(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [styleId, setStyleId] = useState("cute");
  const [chosenEmotions, setChosenEmotions] = useState(emotions.slice(0, 4));
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");

  const selectedStyle = styles.find((item) => item.id === styleId) ?? styles[0];
  const resultWords = useMemo(() => chosenEmotions.map((emotion) => stickerWords[emotions.indexOf(emotion)] ?? emotion), [chosenEmotions]);

  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showNotice("請選擇 JPG、PNG 或 WEBP 圖片"); return; }
    setFileName(file.name);
    setPhoto(URL.createObjectURL(file));
    setStatus("idle");
    showNotice("照片已加入，接著選擇風格與表情");
  };

  const toggleEmotion = (emotion: string) => {
    setChosenEmotions((current) => current.includes(emotion) ? current.filter((item) => item !== emotion) : current.length < 6 ? [...current, emotion] : current);
  };

  const startGeneration = () => {
    if (!photo) { showNotice("請先上傳一張照片"); scrollToId("studio"); return; }
    setStatus("generating"); setProgress(0);
    let value = 0;
    const timer = window.setInterval(() => { value += 20; setProgress(value); if (value >= 100) { window.clearInterval(timer); setStatus("done"); showNotice("貼圖已完成，現在可以預覽與下載"); } }, 260);
  };

  const downloadSticker = (word: string, index: number) => {
    if (!photo) return;
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 900;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff2d8"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const image = new Image(); image.crossOrigin = "anonymous"; image.src = photo;
    image.onload = () => { const size = 590; const x = (900 - size) / 2; const y = 85; ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, size, size, 44); ctx.clip(); ctx.drawImage(image, x, y, size, size); ctx.restore(); ctx.fillStyle = selectedStyle.tone; ctx.beginPath(); ctx.arc(756, 126, 54, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#182337"; ctx.font = "900 54px Noto Sans TC, sans-serif"; ctx.textAlign = "center"; ctx.fillText(word, 450, 785); ctx.font = "700 25px Noto Sans TC, sans-serif"; ctx.fillText(`Sticker Tycoon · ${index + 1}`, 450, 845); const link = document.createElement("a"); link.download = `sticker-tycoon-${index + 1}.png`; link.href = canvas.toDataURL("image/png"); link.click(); showNotice("貼圖已下載"); };
  };

  const shareCreation = async () => {
    const text = "我剛用 Sticker Tycoon 做了一套免費貼圖！";
    if (navigator.share) { await navigator.share({ title: "Sticker Tycoon", text }); } else { await navigator.clipboard?.writeText(text); showNotice("分享文字已複製，可以貼給朋友"); }
  };

  return <div className="site-shell">
    {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
    <header className="topbar">
      <a className="brand" href="#top"><img src={logoUrl} alt="貼圖大亨標誌" /><span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span></a>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button>
      <nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => { scrollToId("studio"); setMenuOpen(false); }}>開始製作</button><button onClick={() => { scrollToId("features"); setMenuOpen(false); }}>功能特色</button><button onClick={() => { scrollToId("gallery"); setMenuOpen(false); }}>作品靈感</button><button onClick={() => { scrollToId("guide"); setMenuOpen(false); }}>使用流程</button></nav>
      <button className="button button-primary header-cta" onClick={() => scrollToId("studio")}><Play size={15} fill="currentColor" />開始製作</button>
    </header>

    <main id="top">
      <section className="hero section-pad"><div className="ambient orb-one" /><div className="ambient orb-two" /><div className="hero-copy reveal"><div className="eyebrow">AI 智能創作 · 全程在網頁內完成</div><h1>把照片變成<br /><span>你的專屬貼圖</span></h1><p className="hero-lead">上傳一張照片，選一種風格與幾個表情，幾秒就能完成一套可預覽、可下載、可分享的貼圖。</p><div className="hero-actions"><button className="button button-primary" onClick={() => scrollToId("studio")}><Wand2 size={16} />立即開始製作</button><button className="button button-secondary" onClick={() => scrollToId("gallery")}><ImageIcon size={16} />看看作品靈感</button></div><div className="trust-row"><span><Check size={14} />瀏覽器內完成</span><span><Check size={14} />免費使用</span><span><Check size={14} />可直接下載</span></div><div className="coupon-card free-note"><Zap size={19} /><span><strong>不用跳轉、不用註冊</strong><small>照片、風格、生成、下載，一個頁面完成</small></span><ArrowRight size={17} /></div></div><div className="hero-visual reveal delay-one"><div className="hero-art-frame"><img src={heroUrl} alt="貼圖創作示意圖" /></div><div className="floating-chip chip-style"><Palette size={15} />4 種創作風格</div><div className="floating-chip chip-speed"><Zap size={16} fill="currentColor" />幾秒完成預覽</div><div className="scanline" /></div></section>

      <section id="studio" className="studio-section section-pad"><div className="section-heading"><div className="eyebrow">🪄 網頁內創作工作室</div><h2>三步驟，完成你的 <span>第一套貼圖</span></h2><p>所有控制都在這裡，不需要離開網站。先上傳照片，再選擇風格與表情，最後按下生成。</p></div><div className="studio-layout"><div className="studio-controls"><div className="studio-step"><div className="step-number">01</div><div className="step-content"><h3>上傳一張照片</h3><p>建議使用光線清楚、主體明確的 JPG、PNG 或 WEBP 圖片。</p><button className="upload-zone" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden /><Upload size={24} /><strong>{photo ? "重新選擇照片" : "點擊上傳照片"}</strong><small>{fileName || "或將圖片拖曳到這裡"}</small></button>{photo && <div className="file-state"><Check size={15} />{fileName}<button onClick={() => { setPhoto(null); setFileName(""); setStatus("idle"); }} aria-label="移除照片"><X size={15} /></button></div>}</div></div><div className="studio-step"><div className="step-number">02</div><div className="step-content"><h3>選擇創作風格</h3><div className="style-grid">{styles.map((item) => <button key={item.id} className={styleId === item.id ? "style-option active" : "style-option"} onClick={() => setStyleId(item.id)}><span>{item.icon}</span><strong>{item.label}</strong>{styleId === item.id && <Check size={14} />}</button>)}</div></div></div><div className="studio-step"><div className="step-number">03</div><div className="step-content"><h3>選擇表情 <small>{chosenEmotions.length}/6</small></h3><div className="emotion-grid">{emotions.map((emotion) => <button key={emotion} className={chosenEmotions.includes(emotion) ? "emotion active" : "emotion"} onClick={() => toggleEmotion(emotion)}>{emotion}</button>)}</div></div></div><button className="button button-primary generate-button" onClick={startGeneration} disabled={status === "generating"}>{status === "generating" ? <><RefreshCw size={16} className="spin" />生成中 {progress}%</> : <><Sparkles size={16} />生成我的貼圖</>}</button>{status === "generating" && <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>}</div><div className={status === "done" ? "studio-preview ready" : "studio-preview"}>{status === "idle" && <><div className="preview-placeholder"><ImageIcon size={31} /><strong>你的貼圖會出現在這裡</strong><span>完成設定後，按下「生成我的貼圖」</span></div><div className="preview-meta"><span>即時預覽</span><span>{selectedStyle.icon} {selectedStyle.label}</span></div></>}{status === "generating" && <div className="preview-placeholder generating"><div className="loader-ring" /><strong>正在為你組合貼圖</strong><span>套用 {selectedStyle.label} · 建立 {chosenEmotions.length} 張表情</span></div>}{status === "done" && <><div className="result-head"><div><span className="eyebrow">✨ 已完成</span><h3>你的專屬貼圖</h3></div><button className="icon-button" onClick={() => setStatus("idle")} aria-label="重新生成"><RefreshCw size={17} /></button></div><div className="result-grid">{resultWords.map((word, index) => <article className="result-sticker" key={word}><div className="sticker-photo" style={{ backgroundImage: `url(${photo})`, borderColor: selectedStyle.tone }}><span>{word}</span><i>{selectedStyle.icon}</i></div><div className="result-actions"><strong>{chosenEmotions[index]}</strong><button onClick={() => downloadSticker(word, index)} aria-label={`下載${word}`}><Download size={14} /></button></div></article>)}</div><div className="result-footer"><button className="button button-secondary" onClick={shareCreation}><Share2 size={15} />分享創作</button><button className="button button-primary" onClick={() => resultWords.forEach((word, index) => downloadSticker(word, index))}><Download size={15} />下載全部貼圖</button></div></>}</div></div></section>

      <section className="announcement section-pad"><div className="announcement-icon">✓</div><div><strong>你的照片只留在目前瀏覽器工作階段</strong><p>這個版本以網頁內互動示範為核心，不需要外部帳號或第三方平台。</p></div><button className="text-link" onClick={() => scrollToId("studio")}>開始免費創作 <ArrowRight size={15} /></button></section>

      <section id="features" className="feature-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 為什麼選擇網頁版</div><h2>從靈感到成品，<span>不必離開頁面</span></h2><p>把原本分散在不同入口的步驟收進一個清楚、直覺、可反覆操作的創作工作室。</p></div><div className="feature-layout"><div className="feature-art"><img src={heroUrl} alt="貼圖工作室示意圖" /></div><div className="feature-list">{[{icon: "📸", title: "照片即時預覽", body: "上傳後立即看到照片，重新選擇也不會打斷你的創作流程。"},{icon: "🎨", title: "風格自由切換", body: "可在可愛手繪、繽紛流行、漫畫表情與清爽極簡之間切換。"},{icon: "⚡", title: "生成狀態清楚", body: "生成進度、完成狀態與每張貼圖操作都集中在右側預覽區。"},{icon: "📤", title: "完成即可帶走", body: "單張下載、全部下載或分享創作，直接從結果畫面完成。"}].map((item) => <article className="feature-item" key={item.title}><div className="feature-icon">{item.icon}</div><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></div></section>

      <section id="gallery" className="gallery-section section-pad"><div className="section-heading center"><div className="eyebrow">🏆 作品靈感</div><h2>每個表情，都能變成 <span>一張貼圖</span></h2><p>先看看不同表情與配色的組合，再回到工作室製作屬於你的版本。</p></div><div className="inspiration-grid">{["收到！", "太棒了！", "一起加油", "晚安好夢", "謝謝你", "真的假的"].map((word, index) => <div className="inspiration-sticker" style={{ transform: `rotate(${index % 2 ? 3 : -3}deg)` }} key={word}><div style={{ backgroundImage: `url(${heroUrl})` }}><span>{word}</span></div></div>)}</div><button className="button button-primary gallery-cta" onClick={() => scrollToId("studio")}><Wand2 size={16} />用自己的照片製作</button></section>

      <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 使用流程</div><h2>簡單、直接、<br /><span>完全在網頁內</span></h2><p>不用跳轉、不用重新登入。每一步都有清楚提示，完成後還能重新挑選風格與表情。</p></div><div className="steps">{[["01", "上傳照片", "選擇一張清楚的圖片，立即在預覽區看到它。"],["02", "調整風格與表情", "選擇你喜歡的視覺風格，再勾選想要的表情。"],["03", "生成、下載、分享", "完成後可以逐張下載、全部下載，或把創作分享給朋友。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><button className="button button-primary" onClick={() => scrollToId("studio")}>開始製作 <ArrowRight size={16} /></button></div></section>

    </main>
    <footer className="footer footer-minimal"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>一張照片，幾個表情，完成你的專屬貼圖。</p><a className="footer-contact" href="mailto:hello@sticker-tycoon.example">聯絡我們 <ArrowRight size={14} /></a></footer>
    {status === "done" && <button className="floating-create" onClick={() => scrollToId("studio")}><Wand2 size={15} />回到工作室</button>}
  </div>;
}
