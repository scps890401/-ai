import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Crown, Download, ExternalLink, Gift, Image as ImageIcon, Menu, MessageCircle, Palette, Play, Sparkles, Ticket, X, Zap } from "lucide-react";

/* Style reminder: fidelity-first dark ocean landing page, electric cyan/violet accents, asymmetrical hero, glass cards, and crisp motion. */

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const heroUrl = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";
const featureArtUrl = "/manus-storage/sticker-tycoon-feature-art_39953123.png";

const stickerProducts = [
  { id: "32558253", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32558253/LINEStorePC/main.png" },
  { id: "32182921", name: "Andy's Talk", status: "🔥 熱賣中", tone: "hot", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32182921/LINEStorePC/main.png" },
  { id: "32191704", name: "Andy's Talk2", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32191704/LINEStorePC/main.png" },
  { id: "32392279", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32392279/LINEStorePC/main.png" },
  { id: "32430992", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32430992/LINEStorePC/main.png" },
  { id: "32292454", name: "貼圖作品", status: "🔥 熱賣中", tone: "hot", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32292454/LINEStorePC/main.png" },
];

const stickerPreviews = [645893161, 645893162, 645893163, 645893164, 646116401, 646116402, 646116403, 646116404];

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  return (
    <div className="site-shell">
      {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="貼圖大亨首頁">
          <img src={logoUrl} alt="貼圖大亨品牌標誌" />
          <span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <button onClick={() => { goTo("features"); setMenuOpen(false); }}>功能特色</button>
          <button onClick={() => { goTo("gallery"); setMenuOpen(false); }}>作品展示</button>
          <button onClick={() => { goTo("pricing"); setMenuOpen(false); }}>張數方案</button>
          <a href="#guide">📖 使用說明</a>
        </nav>
        <a className="button button-primary header-cta" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer"><Play size={15} fill="currentColor" />立即開始</a>
      </header>

      <main id="top">
        <section className="hero section-pad">
          <div className="ambient orb-one" /><div className="ambient orb-two" />
          <div className="hero-copy reveal">
            <div className="eyebrow">AI 智能創作 · 3 分鐘完成</div>
            <h1>用 AI 創造<br /><span>專屬 LINE 貼圖</span></h1>
            <p className="hero-lead">上傳一張照片，AI 自動生成多種表情貼圖。<br /><b>8 種風格任選</b>，下載需 60 張，可透過「分享給好友」獲得免費張數，或「購買張數」快速取得！</p>
            <div className="legal-note">本服務為貼圖大亨之 LINE Mini App 版本，僅於 LINE 應用程式內提供使用者貼圖製作與管理相關功能，不涉及任何未經授權的內容散布或行為。</div>
            <div className="hero-actions">
              <a className="button button-primary" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer"><Gift size={16} />免費領取 40 張</a>
              <button className="button button-secondary" onClick={() => goTo("gallery")}><ImageIcon size={16} />看看作品</button>
            </div>
            <div className="trust-row"><span><Check size={14} />免費開始</span><span><Check size={14} />無需設計技能</span><span><Check size={14} />快速取得貼圖</span></div>
            <button className="coupon-card" onClick={() => goTo("guide")}><Ticket size={19} /><span><strong>有收到優惠碼嗎？</strong><small>到 LINE 輸入「優惠碼」即可兌換</small></span><ArrowRight size={17} /></button>
          </div>
          <div className="hero-visual reveal delay-one">
            <div className="hero-art-frame"><img src={heroUrl} alt="AI 貼圖創作示意圖" /></div>
            <div className="floating-chip chip-style"><Palette size={15} />8 種風格</div>
            <div className="floating-chip chip-speed"><Zap size={16} fill="currentColor" />3 分鐘生成</div>
            <div className="scanline" />
          </div>
        </section>

        <section className="announcement section-pad"><div className="announcement-icon">✓</div><div><strong>正式公告｜已正式接入 LINE Pay 付款機制</strong><p>為確保付款流程與訂單權益完整，請大家從 LINE 官方帳號進入並操作本服務。</p></div><a className="text-link" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer">從 LINE 官方帳號進入 <ArrowRight size={15} /></a></section>

        <section id="features" className="feature-section section-pad">
          <div className="section-heading"><div className="eyebrow">✨ 為什麼選擇我們</div><h2>強大功能，<span>超簡單操作</span></h2><p>結合 AI 技術，讓每個人都能輕鬆創作專業級 LINE 貼圖。</p></div>
          <div className="feature-layout"><div className="feature-art"><img src={heroUrl} alt="AI 貼圖創作示意圖" /></div><div className="feature-list">
            {[{icon: "📸", title: "照片變貼圖", body: "上傳任意照片，AI 自動提取特徵生成多種表情貼圖。"},{icon: "🎭", title: "24 種表情", body: "開心、難過、生氣、驚訝……豐富表情一次滿足。"},{icon: "🚀", title: "下載服務", body: "專業團隊幫你處理上架，1–3 天即可在 LINE 販售。"},{icon: "💰", title: "賺取收益", body: "設定售價 NT$30–150，獲得 LINE 銷售分潤。"}].map((item) => <article className="feature-item" key={item.title}><div className="feature-icon">{item.icon}</div><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}
          </div></div>
        </section>

        <section id="gallery" className="gallery-section section-pad"><div className="section-heading center"><div className="eyebrow">🏆 真實上架成品</div><h2>已在 LINE Store <span>販售中</span></h2><p>這些都是使用貼圖大亨 AI 創作並成功上架的真實作品。</p></div><div className="product-grid">{stickerProducts.map((product) => <a className="product-card" key={product.id} href={`https://line.me/S/sticker/${product.id}`} target="_blank" rel="noreferrer"><div className="product-image"><img src={product.image} alt={`${product.name} LINE 貼圖`} /><span className={`status ${product.tone}`}>{product.status}</span><span className="visit"><ExternalLink size={13} />前往 LINE Store</span></div><div className="product-info"><div><h3>{product.name}</h3><p>40 張表情貼圖 · 可愛風格</p></div><strong>NT$30</strong></div></a>)}</div><div className="gallery-sheet"><div><div className="eyebrow">📸 貼圖預覽</div><h3>一張照片，八種可愛表情</h3><p>這些都是 AI 自動生成的貼圖，你也可以創作這樣的作品。</p></div><button className="sheet-art" onClick={() => setSelectedPreview(0)}><div className="sheet-grid">{stickerPreviews.map((id) => <img key={id} src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${id}/iPhone/sticker@2x.png`} alt="AI 貼圖預覽" />)}</div><span>點擊放大預覽 <ArrowRight size={15} /></span></button></div></section>

        <section className="download-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 下載貼圖</div><h2>把創作帶走，<span>自由上架</span></h2><p>下載需 60 張，可透過分享給好友獲得免費張數，或購買張數快速取得。</p></div><div className="compare-grid"><article className="compare-card muted"><div className="compare-symbol">😓</div><h3>自行上架</h3><ul><li>❌ 需註冊 LINE Creators Market</li><li>❌ 學習複雜的上傳流程</li><li>❌ 可能因規格錯誤被退件</li><li>❌ 耗時 1–2 小時設定</li></ul></article><article className="compare-card recommended"><div className="recommend-label">推薦</div><div className="compare-symbol">🎉</div><h3>下載貼圖</h3><ul><li>✅ 下載 ZIP 壓縮檔</li><li>✅ 包含所有貼圖檔案</li><li>✅ 可自行上架或保存</li><li>✅ 60 張即可下載</li></ul><button className="button button-primary" onClick={() => showNotice("請從 LINE 官方帳號進入以開始下載")}>開始下載 <Download size={15} /></button></article></div><div className="price-strip"><span>上架後可賺取收益</span>{[30,60,90,120,150].map((price) => <strong key={price}>NT${price}</strong>)}<small>＊銷售分潤依 LINE 官方規定計算</small></div></section>

        <section id="pricing" className="pricing-section section-pad"><div className="section-heading center"><div className="eyebrow">💎 張數方案</div><h2>新用戶免費送 <span>40 張</span></h2><p>足夠創作 18–24 張專屬貼圖，想持續創作也有彈性方案。</p></div><div className="plans"><Plan title="Starter Plan" count="140 張" price="NT$300" desc="適合首次體驗 AI 貼圖製作" bullets={["可生成約 140 張貼圖", "支援所有貼圖風格", "平均單張成本 NT$2.1"]} onClick={() => showNotice("Starter Plan 將在 LINE Mini App 中開啟")} /><Plan popular title="Creator Plan" count="260 張" price="NT$500" desc="為高頻創作與商用設計而生" bullets={["可生成約 260 張貼圖", "適合大量與長期使用", "平均單張成本 NT$1.9"]} onClick={() => showNotice("Creator Plan 將在 LINE Mini App 中開啟")} /><Plan title="Studio Plan" count="600 張" price="NT$1,000" desc="團隊與工作室的創作彈性" bullets={["可生成約 600 張貼圖", "優先處理生成需求", "平均單張成本 NT$1.7"]} onClick={() => showNotice("Studio Plan 將在 LINE Mini App 中開啟")} /></div></section>

        <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 使用說明</div><h2>三步驟，開始你的<br /><span>貼圖大亨之旅</span></h2><p>從 LINE 官方帳號進入，選擇風格、上傳照片，等待 AI 將你的日常變成一套可以分享的貼圖。</p></div><div className="steps">{[["01", "從 LINE 進入", "點擊立即開始，開啟 LINE Mini App。"],["02", "上傳照片與選風格", "選一張照片，再挑選你喜歡的創作風格。"],["03", "下載與分享", "生成後累積 60 張，即可下載完整 ZIP。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><a className="button button-primary" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer">立即免費開始 <ArrowRight size={16} /></a></div></section>

        <section className="faq-section section-pad"><div className="section-heading"><div className="eyebrow">💬 常見問題</div><h2>開始前，先看看<span>大家都在問什麼</span></h2></div><div className="faq-list">{[["優惠碼要在哪裡兌換？", "到 LINE 官方帳號輸入「優惠碼」，系統會自動替你檢查並加入張數。"],["下載需要多少張數？", "完整下載 ZIP 壓縮檔需要 60 張，建議先用免費贈送的 40 張開始體驗。"],["可以把貼圖上架到 LINE Store 嗎？", "可以。下載後可自行上架，也可以依照服務說明交由團隊協助處理。"]].map(([q, a]) => <div className="faq-item" key={q}><button onClick={() => setExpanded(expanded === q ? null : q)}><span>{q}</span>{expanded === q ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{expanded === q && <p>{a}</p>}</div>)}</div></section>
      </main>

      <footer className="footer"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>用 AI 創造，讓每個表情都有你的名字。</p><div className="footer-links"><a href="#guide">使用說明</a><a href="#guide">購買說明</a><a href="mailto:johnyarcher2100@yahoo.com.tw">聯絡我們</a><a href="#guide">隱私權政策</a><a href="#guide">使用條款</a></div><small className="copyright">© 2026 Sticker Tycoon. Crafted for creators.</small></footer>
      {selectedPreview !== null && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setSelectedPreview(null)}><button className="close-lightbox" onClick={() => setSelectedPreview(null)} aria-label="關閉"><X /></button><div className="lightbox-content" onClick={(e) => e.stopPropagation()}><img src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerPreviews[selectedPreview]}/iPhone/sticker@2x.png`} alt="貼圖放大預覽" /><div className="preview-dots">{stickerPreviews.map((id, index) => <button className={index === selectedPreview ? "active" : ""} key={id} onClick={() => setSelectedPreview(index)} />)}</div></div></div>}
    </div>
  );
}

function Plan({ title, count, price, desc, bullets, popular, onClick }: { title: string; count: string; price: string; desc: string; bullets: string[]; popular?: boolean; onClick: () => void }) {
  return <article className={popular ? "plan-card popular" : "plan-card"}>{popular && <div className="popular-ribbon"><Crown size={13} /> MOST POPULAR</div>}<div className="plan-top"><span>{title}</span><strong>{count}</strong></div><p>{desc}</p><div className="plan-price">{price}<small>／方案</small></div><ul>{bullets.map((bullet) => <li key={bullet}><Check size={15} />{bullet}</li>)}</ul><button className={popular ? "button button-primary" : "button button-outline"} onClick={onClick}>{popular ? "立即升級" : "開始體驗"}<ArrowRight size={15} /></button></article>;
}
