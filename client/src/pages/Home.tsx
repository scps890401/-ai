import { useState } from "react";
import { ArrowRight, Check, Download, Plus, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
type ApprovedSample = { url: string; hasAlpha?: boolean; characterNeed: string; action: string; text: string };
type Variation = { url: string; hasAlpha?: boolean; action: string; text: string };

export default function Home() {
  const [characterNeed, setCharacterNeed] = useState("");
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [sample, setSample] = useState<ApprovedSample | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [notice, setNotice] = useState("");
  const sampleMutation = trpc.creative.generateSample.useMutation();
  const variationMutation = trpc.creative.generateVariation.useMutation();
  const isGenerating = sampleMutation.isPending || variationMutation.isPending;

  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 4200); };
  const valid = () => { if (characterNeed.trim() && action.trim() && text.trim()) return true; showNotice("請完整填寫角色需求、動作與文字"); return false; };
  const displayError = (error: unknown, fallback: string) => { const detail = error instanceof Error ? error.message : fallback; showNotice(/usage exhausted|failed_precondition/i.test(detail) ? "AI 服務使用量目前暫時耗盡，請稍後再試" : detail); };

  const createSample = async () => {
    if (!valid()) return;
    try {
      const result = await sampleMutation.mutateAsync({ characterNeed: characterNeed.trim(), action: action.trim(), text: text.trim() });
      setSample({ ...result, characterNeed: characterNeed.trim(), action: action.trim(), text: text.trim() });
      setConfirmed(false);
      setVariations([]);
      showNotice("角色樣本已生成，請確認角色是否正確");
    } catch (error) { displayError(error, "角色樣本生成失敗"); }
  };

  const createVariation = async () => {
    if (!sample || !confirmed || !valid()) return;
    try {
      const result = await variationMutation.mutateAsync({ sampleImageUrl: sample.url, characterNeed: sample.characterNeed, action: action.trim(), text: text.trim() });
      setVariations((items) => [...items, { ...result, action: action.trim(), text: text.trim() }]);
      showNotice("同款角色圖片已新增");
    } catch (error) { displayError(error, "同款角色圖片生成失敗"); }
  };

  const restart = () => { setSample(null); setConfirmed(false); setVariations([]); setCharacterNeed(""); setAction(""); setText(""); showNotice("已準備建立新的角色樣本"); };
  const download = (url: string, name: string) => { const link = document.createElement("a"); link.href = url; link.download = name; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove(); };

  return <div className="site-shell minimal-shell">
    {notice && <div className="toast"><Sparkles size={15} />{notice}</div>}
    <header className="topbar minimal-topbar"><a className="brand" href="#top"><img src={logoUrl} alt="貼圖大亨標誌" /><span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span></a>{sample && <button className="restart-link" onClick={restart}><RefreshCw size={14} />重新建立角色</button>}</header>
    <main id="top" className="minimal-main">
      <section className="minimal-hero"><div className="ambient orb-one" /><div className="ambient orb-two" /><div className="minimal-hero-copy"><span className="eyebrow">AI CHARACTER STUDIO</span><h1>先確認角色，<span>再延伸每一張。</span></h1><p>只需要描述角色需求、動作與文字。先生成一張角色樣本，確認無誤後，再建立同一角色的其他版本。</p></div></section>
      <section className="minimal-studio" aria-label="角色樣本生成器">
        <div className="minimal-form-card">
          <div className="form-intro"><span className="step-tag">{sample ? "角色設定" : "建立樣本"}</span><h2>{confirmed ? "新增同款角色圖片" : "描述你的角色"}</h2><p>{confirmed ? "動作與文字可自由變更；系統會以已確認樣本維持角色一致性。" : "填寫三項資訊，生成第一張可供確認的角色樣本。"}</p></div>
          <label>角色需求<textarea aria-label="角色需求" value={characterNeed} onChange={(event) => setCharacterNeed(event.target.value)} placeholder="例如：戴圓眼鏡、穿深藍圍裙的橘貓店長，溫暖手繪風格" disabled={isGenerating || confirmed} /></label>
          <label>動作<input aria-label="動作" value={action} onChange={(event) => setAction(event.target.value)} placeholder="例如：揮手打招呼" disabled={isGenerating} /></label>
          <label>文字<input aria-label="文字" value={text} onChange={(event) => setText(event.target.value)} placeholder="例如：你好" disabled={isGenerating} /></label>
          {confirmed ? <button className="button button-primary generate-button" onClick={() => void createVariation()} disabled={isGenerating}><Plus size={16} />{variationMutation.isPending ? "正在生成同款角色…" : "生成同款角色圖片"}<ArrowRight size={15} /></button> : <button className="button button-primary generate-button" onClick={() => void createSample()} disabled={isGenerating}><Wand2 size={16} />{sampleMutation.isPending ? "正在生成角色樣本…" : sample ? "重新生成角色樣本" : "生成角色樣本"}<ArrowRight size={15} /></button>}
        </div>
        <div className="sample-stage">
          {!sample ? <div className="sample-empty"><div className="empty-mark"><Wand2 size={26} /></div><strong>角色樣本會出現在這裡</strong><span>先填寫左側三個欄位。</span></div> : <div className="sample-result"><div className="sample-result-head"><div><span className="step-tag">STEP 1</span><h2>角色樣本</h2></div>{sample.hasAlpha && <span className="alpha-status"><Check size={14} />透明背景</span>}</div><div className="character-image"><img src={sample.url} alt={`${sample.text} 角色樣本`} /></div>{confirmed ? <div className="confirmed-panel"><Check size={17} /><div><strong>角色樣本已確認</strong><span>現在可在左側修改動作與文字，建立更多同款角色圖片。</span></div></div> : <div className="confirm-panel"><p>角色外觀、風格與感覺都正確嗎？確認後才能生成同款角色的其他動作與文字。</p><div><button className="button button-secondary" onClick={() => void createSample()} disabled={isGenerating}><RefreshCw size={15} />重新生成</button><button className="button button-primary" onClick={() => { setConfirmed(true); showNotice("已確認角色樣本；接下來可生成同款角色的其他動作與文字"); }}><Check size={16} />確認這個角色</button></div></div>}</div>}
        </div>
      </section>
      {confirmed && <section className="variation-section"><div className="variation-heading"><div><span className="eyebrow">SAME CHARACTER</span><h2>同款角色的其他版本</h2></div><span>{variations.length} 張</span></div>{variations.length ? <div className="variation-grid">{variations.map((item, index) => <article className="variation-card" key={`${item.url}-${index}`}><div><img src={item.url} alt={`${item.text} 同款角色`} /></div><footer><span>{item.action}</span><strong>{item.text}</strong><button aria-label={`下載${item.text}`} onClick={() => download(item.url, `sticker-${String(index + 1).padStart(2, "0")}-${item.text}.png`)}><Download size={15} /></button></footer></article>)}</div> : <div className="variation-empty"><Plus size={19} /><span>確認角色後，在上方輸入新的動作與文字，即可增加更多版本。</span></div>}</section>}
    </main>
    <footer className="footer footer-minimal"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>從一張確認過的角色樣本，延伸每一個表情與動作。</p></footer>
  </div>;
}
