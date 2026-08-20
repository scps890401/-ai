import { ChangeEvent, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, Download, Image as ImageIcon, Menu, RefreshCw, Share2, Sparkles, Upload, Wand2, X } from "lucide-react";

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const heroUrl = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";
const styles = [
  { id: "cute", label: "可愛手繪", icon: "✏️", tone: "#ffcf70" },
  { id: "pop", label: "繽紛流行", icon: "🌈", tone: "#65d9ff" },
  { id: "comic", label: "漫畫表情", icon: "💥", tone: "#ff89d1" },
  { id: "minimal", label: "清爽極簡", icon: "◌", tone: "#9bf4c5" },
];
const emotions = ["開心", "收到", "加油", "謝謝", "驚訝", "晚安"];
const stickerWords: Record<string, string> = { 開心: "太棒了！", 收到: "收到！", 加油: "一起加油", 謝謝: "謝謝你", 驚訝: "真的假的", 晚安: "晚安好夢" };

type Result = { url: string; emotion: string; word: string; mode: "generate" | "cutout" | "refine" };
type Message = { role: "user" | "assistant"; content: string };

function scrollToId(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function readFileAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("圖片讀取失敗")); reader.readAsDataURL(file); }); }

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [styleId, setStyleId] = useState("cute");
  const [chosenEmotions, setChosenEmotions] = useState(emotions.slice(0, 4));
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([{ role: "assistant", content: "你好！上傳一張照片後，我可以幫你生成貼圖、去除背景，也能在完成後依照你的文字繼續修改。" }]);
  const [chatInput, setChatInput] = useState("");

  const selectedStyle = styles.find((item) => item.id === styleId) ?? styles[0];
  const generateMutation = trpc.creative.generate.useMutation();
  const cutoutMutation = trpc.creative.removeBackground.useMutation();
  const refineMutation = trpc.creative.refine.useMutation();
  const busy = generateMutation.isPending || cutoutMutation.isPending || refineMutation.isPending;
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3200); };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) { showNotice("請選擇 JPG、PNG 或 WEBP 圖片"); return; }
    try { setFileName(file.name); setPhoto(await readFileAsDataUrl(file)); setResults([]); showNotice("照片已加入，可以開始 AI 創作"); } catch (error) { showNotice(error instanceof Error ? error.message : "圖片讀取失敗"); }
  };

  const toggleEmotion = (emotion: string) => setChosenEmotions((current) => current.includes(emotion) ? current.filter((item) => item !== emotion) : current.length < 6 ? [...current, emotion] : current);

  const generateSticker = async () => {
    if (!photo) { showNotice("請先上傳一張照片"); scrollToId("studio"); return; }
    try {
      const emotion = chosenEmotions[results.length % Math.max(chosenEmotions.length, 1)] ?? "開心";
      const response = await generateMutation.mutateAsync({ photoDataUrl: photo, style: selectedStyle.label, emotion, prompt: prompt || undefined });
      const word = stickerWords[emotion] ?? emotion;
      setResults((current) => [...current, { url: response.url, emotion, word, mode: "generate" }]);
      setChatMessages((current) => [...current, { role: "assistant", content: `已完成「${word}」貼圖。你可以直接輸入「文字改成早安」、「表情更可愛」或「背景更乾淨」來繼續修改。` }]);
      showNotice("真正 AI 貼圖已完成");
    } catch (error) { showNotice(error instanceof Error ? error.message : "AI 生成失敗，請稍後重試"); }
  };

  const removeBackground = async () => {
    if (!photo) { showNotice("請先上傳一張照片"); return; }
    try { const response = await cutoutMutation.mutateAsync({ photoDataUrl: photo }); setPhoto(response.url); setResults([]); showNotice("AI 語意去背完成，已保留角色細節"); setChatMessages((current) => [...current, { role: "assistant", content: "AI 語意去背完成了。淺色角色與細節會盡量保留，現在可以直接生成貼圖。" }]); }
    catch (error) { showNotice(error instanceof Error ? error.message : "AI 去背失敗，請稍後重試"); }
  };

  const sendChat = async (content: string) => {
    const instruction = content.trim(); if (!instruction) return;
    setChatInput(""); setChatMessages((current) => [...current, { role: "user", content: instruction }]);
    if (!results.length) { setPrompt(instruction); setChatMessages((current) => [...current, { role: "assistant", content: "我已記住這個創作方向。請按下「生成我的貼圖」，我會把它交給真正的 AI 圖像生成服務。" }]); return; }
    const current = results[results.length - 1];
    try {
      const response = await refineMutation.mutateAsync({ currentImageUrl: { url: current.url, mimeType: "image/png" }, instruction, history: chatMessages.map((item) => ({ role: item.role, content: item.content })) });
      setResults((items) => [...items, { url: response.url, emotion: current.emotion, word: current.word, mode: "refine" }]);
      setChatMessages((items) => [...items, { role: "assistant", content: response.reply || "已完成修改，新的貼圖已放到預覽區。你可以繼續提出下一個修改。" }]);
      showNotice("多輪修改完成");
    } catch (error) { setChatMessages((items) => [...items, { role: "assistant", content: error instanceof Error ? error.message : "修改失敗，請稍後重試。" }]); showNotice("AI 修改失敗，原本貼圖仍保留"); }
  };

  const download = (item: Result, index: number) => { const link = document.createElement("a"); link.href = item.url; link.download = `sticker-tycoon-${index + 1}.png`; link.click(); showNotice("貼圖已下載"); };
  const share = async () => { const text = "我剛用 Sticker Tycoon 製作了一張 AI 貼圖！"; if (navigator.share) await navigator.share({ title: "Sticker Tycoon", text }); else { await navigator.clipboard?.writeText(text); showNotice("分享文字已複製"); } };

  return <div className="site-shell">
    {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
    <header className="topbar"><a className="brand" href="#top"><img src={logoUrl} alt="貼圖大亨標誌" /><span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button><nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => { scrollToId("studio"); setMenuOpen(false); }}>開始製作</button><button onClick={() => { scrollToId("features"); setMenuOpen(false); }}>功能特色</button><button onClick={() => { scrollToId("guide"); setMenuOpen(false); }}>使用流程</button></nav><button className="button button-primary header-cta" onClick={() => scrollToId("studio")}><Wand2 size={15} />開始製作</button></header>
    <main id="top">
      <section className="hero section-pad hero-simplified"><div className="ambient orb-one" /><div className="ambient orb-two" /><div className="hero-copy reveal"><div className="eyebrow">AI 智能創作 · 全程在網頁內完成</div><h1>把照片變成<br /><span>你的專屬貼圖</span></h1><p className="hero-lead">上傳照片，直接用真正的 AI 生成貼圖；生成後還能在同一個聊天框反覆修改。</p><div className="hero-actions"><button className="button button-primary" onClick={() => scrollToId("studio")}><Wand2 size={16} />立即開始製作</button><button className="button button-secondary" onClick={() => scrollToId("features")}><ImageIcon size={16} />了解 AI 功能</button></div><div className="trust-row"><span><Check size={14} />瀏覽器內完成</span><span><Check size={14} />免費使用</span><span><Check size={14} />AI 可反覆修改</span></div></div></section>
      <section id="studio" className="studio-section section-pad"><div className="section-heading"><div className="eyebrow">🪄 AI 網頁內創作工作室</div><h2>上傳、生成、修改，<span>一次完成</span></h2><p>AI 生成與語意去背都在伺服器安全處理，密鑰不會暴露在瀏覽器。</p></div><div className="ai-workspace"><div className="studio-controls"><div className="studio-step"><div className="step-number">01</div><div className="step-content"><h3>上傳一張照片</h3><p>支援 JPG、PNG 或 WEBP；建議選擇角色清楚、光線穩定的照片。</p><button className="upload-zone" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden /><Upload size={24} /><strong>{photo ? "重新選擇照片" : "點擊上傳照片"}</strong><small>{fileName || "圖片只會用於目前創作流程"}</small></button>{photo && <div className="file-state"><Check size={15} />已上傳照片<button onClick={() => { setPhoto(null); setFileName(""); setResults([]); }} aria-label="移除照片"><X size={15} /></button></div>}</div></div><div className="studio-step"><div className="step-number">02</div><div className="step-content"><h3>設定生成方向</h3><div className="style-grid">{styles.map((item) => <button key={item.id} className={styleId === item.id ? "style-option active" : "style-option"} onClick={() => setStyleId(item.id)}><span>{item.icon}</span><strong>{item.label}</strong>{styleId === item.id && <Check size={14} />}</button>)}</div><div className="emotion-grid">{emotions.map((emotion) => <button key={emotion} className={chosenEmotions.includes(emotion) ? "emotion active" : "emotion"} onClick={() => toggleEmotion(emotion)}>{emotion}</button>)}</div><input className="prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="補充想法，例如：讓角色揮手說早安" /></div></div><div className="studio-actions"><button className="button button-primary generate-button" onClick={generateSticker} disabled={busy}><Sparkles size={16} />{generateMutation.isPending ? "AI 生成中…" : "生成我的貼圖"}</button><button className="button button-secondary" onClick={removeBackground} disabled={busy}><RefreshCw size={16} />{cutoutMutation.isPending ? "語意去背中…" : "AI 語意去背"}</button></div></div><div className="studio-preview ai-preview"><div className="preview-head"><span className="eyebrow">✨ AI 預覽貨架</span><span>{results.length} 張結果</span></div>{results.length ? <div className="result-grid">{results.map((item, index) => <article className="result-sticker" key={`${item.url}-${index}`}><img className="ai-result-image" src={item.url} alt={`${item.word} 貼圖`} /><div className="result-actions"><strong>{item.word}</strong><button onClick={() => download(item, index)} aria-label={`下載${item.word}`}><Download size={14} /></button></div></article>)}</div> : <div className="preview-placeholder"><ImageIcon size={31} /><strong>AI 結果會出現在這裡</strong><span>先上傳照片，再按下生成或語意去背</span></div>}{results.length > 0 && <div className="result-footer"><button className="button button-secondary" onClick={share}><Share2 size={15} />分享創作</button><button className="button button-primary" onClick={() => results.forEach(download)}><Download size={15} />下載全部</button></div>}</div><div className="chat-panel"><div className="chat-panel-heading"><div><span className="eyebrow">💬 多輪聊天修改</span><h3>直接告訴 AI 你想改什麼</h3></div>{busy && <RefreshCw size={18} className="spin" />}</div><div className="chat-messages">{chatMessages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "你"}</span><p>{message.content}</p></div>)}</div><div className="chat-suggestions">{["幫我生成一張可愛的貼圖", "背景更乾淨", "文字改成早安"].map((suggestion) => <button key={suggestion} onClick={() => sendChat(suggestion)} disabled={busy}>{suggestion}</button>)}</div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendChat(chatInput); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="例如：文字改成早安，表情更可愛" disabled={busy} /><button className="button button-primary" type="submit" disabled={busy || !chatInput.trim()}><ArrowRight size={16} /></button></form></div></div></section>
      <section id="features" className="feature-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 三項核心 AI 能力</div><h2>從照片到貼圖，<span>每一步都能調整</span></h2><p>真正的 AI 生成、語意去背與多輪聊天修改，全部集中在同一個網頁工作室。</p></div><div className="feature-list"><article className="feature-item"><div className="feature-icon">✦</div><div><h3>真正 AI 圖像生成</h3><p>伺服器端呼叫圖片生成服務，保留角色辨識特徵，再依照你的風格、表情與文字要求生成。</p></div></article><article className="feature-item"><div className="feature-icon">◌</div><div><h3>AI 語意去背</h3><p>以角色語意理解處理背景，特別照顧白色、淡色與細小配件，輸出乾淨的角色素材。</p></div></article><article className="feature-item"><div className="feature-icon">↻</div><div><h3>多輪聊天修改</h3><p>不用重新開始或重新描述，直接針對上一張貼圖提出修改，AI 會沿用當前結果繼續調整。</p></div></article></div></section>
      <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 使用流程</div><h2>三步驟，<br /><span>完成一張 AI 貼圖</span></h2><p>上傳照片、選擇方向、與 AI 對話修改。所有功能都在目前網頁內完成。</p></div><div className="steps">{[["01", "上傳照片", "選擇一張清楚的角色照片。"],["02", "生成與去背", "按下 AI 生成或語意去背，等待結果回來。"],["03", "聊天微調", "直接輸入修改要求，直到你滿意為止。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><button className="button button-primary" onClick={() => scrollToId("studio")}>開始製作 <ArrowRight size={16} /></button></div></section>
    </main><footer className="footer footer-minimal"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>一張照片，幾個表情，完成你的專屬 AI 貼圖。</p></footer>
  </div>;
}
